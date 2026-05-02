bl_info = {
    "name": "Copilot Blender Assistant",
    "author": "GitHub Copilot",
    "version": (1, 0, 3),
    "blender": (5, 0, 0),
    "location": "View3D > Sidebar > Copilot",
    "description": "Generate Blender Python scripts from natural language prompts using a chat-completions API",
    "category": "Development",
}

import bpy
import json
import re
import threading
import traceback
import urllib.error
import urllib.request


DEFAULT_SYSTEM_PROMPT = (
    "You are a senior Blender Python technical artist. "
    "Return only executable Python code for Blender 5.0 using bpy. "
    "Use real-world metric scale, clear parameters at top, and deterministic object naming. "
    "Create clean hard-surface/furniture results with proper proportions, bevels, and sensible materials. "
    "Prefer robust primitive/modifier workflows over fragile context-dependent operations. "
    "Do not include markdown fences."
)

DEFAULT_OLLAMA_ENDPOINT = "http://127.0.0.1:11434/v1/chat/completions"
DEFAULT_OLLAMA_MODEL = "qwen2.5-coder:14b"
REQUEST_TIMEOUT_SECONDS = 600
QUALITY_HINT = (
    "Quality requirements:\n"
    "1) Use parameters at top (dimensions in meters).\n"
    "2) Build in a dedicated collection with clean, named parts.\n"
    "3) Add bevels/chamfers on hard edges so the model reads well.\n"
    "4) Assign at least one reasonable material setup.\n"
    "5) Keep topology and modifiers stable and avoid brittle context assumptions.\n"
    "6) Output executable Python code only."
)


def _extract_code_block(content: str) -> str:
    if not content:
        return ""

    pattern = re.compile(r"```(?:python)?\s*([\s\S]*?)```", re.IGNORECASE)
    match = pattern.search(content)
    if match:
        return match.group(1).strip() + "\n"

    return content.strip() + "\n"


def _get_message_content(msg_content):
    if isinstance(msg_content, str):
        return msg_content

    if isinstance(msg_content, list):
        parts = []
        for item in msg_content:
            if isinstance(item, dict) and item.get("type") == "text":
                parts.append(item.get("text", ""))
        return "\n".join(parts)

    return str(msg_content)


def _request_chat_completion(endpoint: str, api_key: str, auth_type: str, payload: dict) -> str:
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    if auth_type == "BEARER":
        headers["Authorization"] = f"Bearer {api_key}"
    elif auth_type == "API_KEY":
        headers["api-key"] = api_key

    req = urllib.request.Request(endpoint, data=body, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as resp:
            response_text = resp.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        detail = ""
        try:
            detail = exc.read().decode("utf-8")
        except Exception:
            detail = str(exc)
        raise RuntimeError(f"HTTP {exc.code}: {detail}")
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error: {exc.reason}")

    try:
        parsed = json.loads(response_text)
    except json.JSONDecodeError:
        raise RuntimeError("Model response was not valid JSON.")

    try:
        content = parsed["choices"][0]["message"]["content"]
    except Exception:
        raise RuntimeError("Unexpected response format: missing choices[0].message.content")

    return _get_message_content(content)


def _ensure_text_block(name: str):
    text = bpy.data.texts.get(name)
    if text is None:
        text = bpy.data.texts.new(name)
    return text


def _focus_text_block(context, text_block):
    for area in context.screen.areas:
        if area.type == "TEXT_EDITOR":
            area.spaces.active.text = text_block
            return True
    return False


class COPILOT_OT_generate_script(bpy.types.Operator):
    bl_idname = "copilot.generate_script"
    bl_label = "Generate Script"
    bl_description = "Generate Blender Python code from your prompt without blocking the UI"

    _timer = None
    _thread = None
    _result = None

    def _worker(self, endpoint: str, api_key: str, auth_type: str, payload: dict):
        try:
            content = _request_chat_completion(
                endpoint=endpoint,
                api_key=api_key,
                auth_type=auth_type,
                payload=payload,
            )
            self._result = {"done": True, "error": None, "content": content}
        except Exception as exc:
            self._result = {"done": True, "error": str(exc), "content": ""}

    def _cleanup(self, context):
        if self._timer is not None:
            try:
                context.window_manager.event_timer_remove(self._timer)
            except Exception:
                pass
            self._timer = None

        scene = context.scene
        if hasattr(scene, "copilot_generation_in_progress"):
            scene.copilot_generation_in_progress = False

    def execute(self, context):
        scene = context.scene

        if scene.copilot_generation_in_progress:
            self.report({"WARNING"}, "A generation is already in progress.")
            return {"CANCELLED"}

        prompt = scene.copilot_prompt.strip()
        if not prompt:
            self.report({"ERROR"}, "Prompt is required.")
            return {"CANCELLED"}

        api_key = scene.copilot_api_key.strip()
        if scene.copilot_auth_type in {"BEARER", "API_KEY"} and not api_key:
            self.report({"ERROR"}, "API key is required for the selected auth type.")
            return {"CANCELLED"}

        endpoint = scene.copilot_endpoint.strip()
        model = scene.copilot_model.strip()

        if not endpoint or not model:
            self.report({"ERROR"}, "Endpoint and model are required.")
            return {"CANCELLED"}

        endpoint_lower = endpoint.lower()
        if scene.copilot_auth_type == "NONE" and "api.openai.com" in endpoint_lower:
            msg = (
                "OpenAI endpoint requires an API key. "
                "Use Auth=Bearer with a key, or click Apply Ollama Preset for no-key local mode."
            )
            scene.copilot_status = msg
            self.report({"ERROR"}, msg)
            return {"CANCELLED"}

        system_prompt = scene.copilot_system_prompt.strip() or DEFAULT_SYSTEM_PROMPT

        user_prompt = prompt
        if scene.copilot_quality_mode:
            user_prompt = f"{prompt}\n\n{QUALITY_HINT}"

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": float(scene.copilot_temperature),
        }

        scene.copilot_generation_in_progress = True
        scene.copilot_status = "Generating script... Blender stays responsive while this runs."

        self._result = {"done": False, "error": None, "content": ""}
        self._thread = threading.Thread(
            target=self._worker,
            args=(endpoint, api_key, scene.copilot_auth_type, payload),
            daemon=True,
        )
        self._thread.start()

        self._timer = context.window_manager.event_timer_add(0.25, window=context.window)
        context.window_manager.modal_handler_add(self)
        return {"RUNNING_MODAL"}

    def modal(self, context, event):
        if event.type != "TIMER":
            return {"PASS_THROUGH"}

        scene = context.scene
        if not self._result or not self._result.get("done"):
            return {"PASS_THROUGH"}

        self._cleanup(context)

        if self._result.get("error"):
            msg = self._result["error"]
            scene.copilot_status = f"Generate failed: {msg}"
            self.report({"ERROR"}, msg)
            return {"CANCELLED"}

        raw_content = self._result.get("content", "")
        code = _extract_code_block(raw_content)
        if not code.strip():
            scene.copilot_status = "Generate failed: model returned empty content."
            self.report({"ERROR"}, "Model returned empty content.")
            return {"CANCELLED"}

        text_name = scene.copilot_output_text_name.strip() or "Copilot_Generated.py"
        text_block = _ensure_text_block(text_name)
        text_block.clear()
        text_block.write(code)

        scene.copilot_last_text_name = text_block.name
        scene.copilot_status = f"Generated script: {text_block.name}"

        if scene.copilot_focus_text_editor:
            _focus_text_block(context, text_block)

        self.report({"INFO"}, f"Generated script in text block: {text_block.name}")
        return {"FINISHED"}

    def cancel(self, context):
        self._cleanup(context)
        return {"CANCELLED"}


class COPILOT_OT_open_last_script(bpy.types.Operator):
    bl_idname = "copilot.open_last_script"
    bl_label = "Open Last Script"
    bl_description = "Open the last generated script in a Text Editor"

    def execute(self, context):
        scene = context.scene
        name = scene.copilot_last_text_name.strip()

        if not name:
            self.report({"ERROR"}, "No script has been generated yet.")
            return {"CANCELLED"}

        text_block = bpy.data.texts.get(name)
        if text_block is None:
            self.report({"ERROR"}, f"Text block not found: {name}")
            return {"CANCELLED"}

        opened = _focus_text_block(context, text_block)
        if not opened:
            self.report({"WARNING"}, "No Text Editor area is open. Open one, then click again.")
            return {"CANCELLED"}

        self.report({"INFO"}, f"Opened {name}")
        return {"FINISHED"}


class COPILOT_OT_apply_ollama_preset(bpy.types.Operator):
    bl_idname = "copilot.apply_ollama_preset"
    bl_label = "Apply Ollama Preset"
    bl_description = "Set endpoint/model/auth for local Ollama usage (no API key)"

    def execute(self, context):
        scene = context.scene
        scene.copilot_endpoint = DEFAULT_OLLAMA_ENDPOINT
        scene.copilot_model = DEFAULT_OLLAMA_MODEL
        scene.copilot_auth_type = "NONE"
        scene.copilot_api_key = ""
        scene.copilot_status = "Applied Ollama preset. Make sure Ollama is running locally."
        self.report({"INFO"}, "Applied Ollama preset")
        return {"FINISHED"}


class COPILOT_OT_run_last_script(bpy.types.Operator):
    bl_idname = "copilot.run_last_script"
    bl_label = "Run Last Script"
    bl_description = "Execute the last generated script (disabled in Safe Mode)"

    def execute(self, context):
        scene = context.scene

        if scene.copilot_safe_mode:
            self.report({"ERROR"}, "Safe Mode is enabled. Disable it to run scripts from this panel.")
            return {"CANCELLED"}

        name = scene.copilot_last_text_name.strip()
        if not name:
            self.report({"ERROR"}, "No script has been generated yet.")
            return {"CANCELLED"}

        text_block = bpy.data.texts.get(name)
        if text_block is None:
            self.report({"ERROR"}, f"Text block not found: {name}")
            return {"CANCELLED"}

        code = text_block.as_string()
        if not code.strip():
            self.report({"ERROR"}, "Last script is empty.")
            return {"CANCELLED"}

        try:
            namespace = {"__name__": "__main__", "bpy": bpy}
            exec(compile(code, text_block.name, "exec"), namespace, namespace)
        except Exception as exc:
            scene.copilot_status = f"Run failed: {exc}"
            traceback.print_exc()
            self.report({"ERROR"}, f"Run failed: {exc}")
            return {"CANCELLED"}

        scene.copilot_status = f"Executed: {text_block.name}"
        self.report({"INFO"}, f"Executed {text_block.name}")
        return {"FINISHED"}


class COPILOT_PT_sidebar_panel(bpy.types.Panel):
    bl_label = "Copilot Assistant"
    bl_idname = "COPILOT_PT_sidebar_panel"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Copilot"

    def draw(self, context):
        scene = context.scene
        layout = self.layout

        box = layout.box()
        box.label(text="Connection", icon="URL")
        box.prop(scene, "copilot_endpoint")
        box.prop(scene, "copilot_model")
        box.prop(scene, "copilot_auth_type")
        if scene.copilot_auth_type == "NONE":
            box.label(text="API key not used in None mode.", icon="INFO")
        else:
            box.prop(scene, "copilot_api_key")
        box.prop(scene, "copilot_temperature")
        box.operator("copilot.apply_ollama_preset", icon="SETTINGS")

        box = layout.box()
        box.label(text="Prompt", icon="TEXT")
        box.prop(scene, "copilot_system_prompt")
        box.prop(scene, "copilot_prompt")
        box.prop(scene, "copilot_quality_mode")
        box.prop(scene, "copilot_output_text_name")
        box.prop(scene, "copilot_focus_text_editor")

        row = layout.row()
        row.scale_y = 1.2
        row.enabled = not scene.copilot_generation_in_progress
        row.operator("copilot.generate_script", icon="FILE_SCRIPT")

        if scene.copilot_generation_in_progress:
            layout.label(text="Generating... first run may take a bit on CPU.", icon="TIME")

        row = layout.row(align=True)
        row.operator("copilot.open_last_script", icon="TEXT")
        row.operator("copilot.run_last_script", icon="PLAY")

        box = layout.box()
        box.label(text="Safety", icon="LOCKED")
        box.prop(scene, "copilot_safe_mode")
        box.label(text="No auto-run is performed.", icon="INFO")

        if scene.copilot_last_text_name:
            layout.label(text=f"Last: {scene.copilot_last_text_name}", icon="FILE_TEXT")
        if scene.copilot_status:
            layout.label(text=scene.copilot_status, icon="INFO")


CLASSES = (
    COPILOT_OT_generate_script,
    COPILOT_OT_open_last_script,
    COPILOT_OT_apply_ollama_preset,
    COPILOT_OT_run_last_script,
    COPILOT_PT_sidebar_panel,
)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)

    bpy.types.Scene.copilot_endpoint = bpy.props.StringProperty(
        name="Endpoint",
        description="Chat Completions endpoint",
        default=DEFAULT_OLLAMA_ENDPOINT,
    )

    bpy.types.Scene.copilot_model = bpy.props.StringProperty(
        name="Model",
        description="Model name from your provider",
        default=DEFAULT_OLLAMA_MODEL,
    )

    bpy.types.Scene.copilot_auth_type = bpy.props.EnumProperty(
        name="Auth",
        description="Authorization header format",
        items=[
            ("NONE", "None", "Do not send authentication headers"),
            ("BEARER", "Bearer", "Use Authorization: Bearer <key>"),
            ("API_KEY", "api-key", "Use api-key: <key>"),
        ],
        default="NONE",
    )

    bpy.types.Scene.copilot_api_key = bpy.props.StringProperty(
        name="API Key",
        description="Provider API key/token",
        default="",
        subtype="PASSWORD",
        options={"SKIP_SAVE"},
    )

    bpy.types.Scene.copilot_system_prompt = bpy.props.StringProperty(
        name="System Prompt",
        description="Optional behavior instructions for the model",
        default=DEFAULT_SYSTEM_PROMPT,
    )

    bpy.types.Scene.copilot_prompt = bpy.props.StringProperty(
        name="Prompt",
        description="Describe what script to generate",
        default="Create a simple script that adds a low-poly safe object at world origin.",
    )

    bpy.types.Scene.copilot_quality_mode = bpy.props.BoolProperty(
        name="Quality Mode",
        description="Appends stricter modeling quality requirements to your prompt",
        default=True,
    )

    bpy.types.Scene.copilot_output_text_name = bpy.props.StringProperty(
        name="Output Text Name",
        description="Text data-block name to write generated code to",
        default="Copilot_Generated.py",
    )

    bpy.types.Scene.copilot_temperature = bpy.props.FloatProperty(
        name="Temperature",
        description="Creativity level for responses",
        min=0.0,
        max=1.0,
        default=0.2,
    )

    bpy.types.Scene.copilot_focus_text_editor = bpy.props.BoolProperty(
        name="Focus Text Editor",
        description="Move generated script into an open Text Editor area",
        default=True,
    )

    bpy.types.Scene.copilot_safe_mode = bpy.props.BoolProperty(
        name="Safe Mode",
        description="Block the Run button in this panel",
        default=True,
    )

    bpy.types.Scene.copilot_last_text_name = bpy.props.StringProperty(
        name="Last Script",
        default="",
        options={"HIDDEN"},
    )

    bpy.types.Scene.copilot_status = bpy.props.StringProperty(
        name="Status",
        default="",
        options={"HIDDEN"},
    )

    bpy.types.Scene.copilot_generation_in_progress = bpy.props.BoolProperty(
        name="Generation In Progress",
        default=False,
        options={"HIDDEN"},
    )


def unregister():
    del bpy.types.Scene.copilot_generation_in_progress
    del bpy.types.Scene.copilot_status
    del bpy.types.Scene.copilot_last_text_name
    del bpy.types.Scene.copilot_safe_mode
    del bpy.types.Scene.copilot_focus_text_editor
    del bpy.types.Scene.copilot_temperature
    del bpy.types.Scene.copilot_output_text_name
    del bpy.types.Scene.copilot_quality_mode
    del bpy.types.Scene.copilot_prompt
    del bpy.types.Scene.copilot_system_prompt
    del bpy.types.Scene.copilot_api_key
    del bpy.types.Scene.copilot_auth_type
    del bpy.types.Scene.copilot_model
    del bpy.types.Scene.copilot_endpoint

    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
