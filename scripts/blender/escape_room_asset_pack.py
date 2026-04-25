"""Procedural starter asset kit for Puzzlewarz-style escape rooms.

Run inside Blender's scripting workspace. The script creates a fresh
collection named ``PWZ_StarterAssets`` containing a small asset pack that is
useful for rendered-room workflows:

- security door
- wall keypad
- metal desk
- vent grate
- wall sconce
- evidence board

The generated assets are intentionally clean and stylized rather than ultra
high poly. They are meant to be a strong base you can edit further in Blender
before rendering room backgrounds for Puzzlewarz.
"""

# pyright: reportMissingImports=false

from __future__ import annotations

import math
from typing import Iterable

import bpy


ASSET_COLLECTION_NAME = "PWZ_StarterAssets"


def purge_collection(name: str) -> None:
    existing = bpy.data.collections.get(name)
    if not existing:
        return

    for child in list(existing.children):
        existing.children.unlink(child)
    for obj in list(existing.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    bpy.data.collections.remove(existing)


def ensure_collection(name: str) -> bpy.types.Collection:
    purge_collection(name)
    collection = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(collection)
    return collection


def move_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)


def make_empty(name: str, location: tuple[float, float, float], collection: bpy.types.Collection) -> bpy.types.Object:
    empty = bpy.data.objects.new(name, None)
    empty.empty_display_type = "PLAIN_AXES"
    empty.location = location
    collection.objects.link(empty)
    return empty


def make_material(
    name: str,
    base_color: tuple[float, float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.5,
    emission_strength: float = 0.0,
) -> bpy.types.Material:
    material = bpy.data.materials.get(name)
    if material is None:
        material = bpy.data.materials.new(name=name)

    material.use_nodes = True
    node_tree = material.node_tree
    principled = node_tree.nodes.get("Principled BSDF")
    if principled is None:
        principled = node_tree.nodes.new("ShaderNodeBsdfPrincipled")

    principled.inputs["Base Color"].default_value = base_color
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    if "Emission Strength" in principled.inputs:
        principled.inputs["Emission Color"].default_value = base_color
        principled.inputs["Emission Strength"].default_value = emission_strength

    return material


def apply_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    if not hasattr(obj.data, "materials"):
        return
    obj.data.materials.clear()
    obj.data.materials.append(material)


def add_bevel(obj: bpy.types.Object, width: float = 0.015, segments: int = 2) -> None:
    if obj.type != "MESH":
        return
    modifier = obj.modifiers.new(name="Bevel", type="BEVEL")
    modifier.width = width
    modifier.segments = segments
    modifier.limit_method = "ANGLE"


def parent_objects(parent: bpy.types.Object, objects: Iterable[bpy.types.Object]) -> None:
    for obj in objects:
        obj.parent = parent


def cube(
    name: str,
    size: tuple[float, float, float],
    location: tuple[float, float, float],
    collection: bpy.types.Collection,
    *,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    material: bpy.types.Material | None = None,
    bevel: float = 0.012,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] / 2.0, size[1] / 2.0, size[2] / 2.0)
    move_to_collection(obj, collection)
    if material is not None:
        apply_material(obj, material)
    if bevel > 0:
        add_bevel(obj, width=bevel)
    return obj


def cylinder(
    name: str,
    radius: float,
    depth: float,
    location: tuple[float, float, float],
    collection: bpy.types.Collection,
    *,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    vertices: int = 24,
    material: bpy.types.Material | None = None,
    bevel: float = 0.006,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.active_object
    obj.name = name
    move_to_collection(obj, collection)
    if material is not None:
        apply_material(obj, material)
    if bevel > 0:
        add_bevel(obj, width=bevel)
    return obj


def create_security_door(
    origin: tuple[float, float, float],
    collection: bpy.types.Collection,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    ox, oy, oz = origin
    root = make_empty("PWZ_SecurityDoor", origin, collection)
    parts: list[bpy.types.Object] = []

    parts.append(cube("DoorFrame", (1.5, 0.2, 2.6), (ox, oy, oz + 1.3), collection, material=materials["dark_paint"]))
    parts.append(cube("DoorInset", (1.18, 0.14, 2.25), (ox, oy + 0.02, oz + 1.2), collection, material=materials["metal"]))
    parts.append(cube("TopLintel", (1.5, 0.22, 0.18), (ox, oy - 0.01, oz + 2.52), collection, material=materials["dark_paint"]))
    parts.append(cube("InnerPanelTop", (0.72, 0.05, 0.46), (ox, oy + 0.09, oz + 1.82), collection, material=materials["accent"]))
    parts.append(cube("InnerPanelBottom", (0.72, 0.05, 0.8), (ox, oy + 0.09, oz + 0.88), collection, material=materials["accent"]))
    parts.append(cube("KickPlate", (0.88, 0.03, 0.28), (ox, oy + 0.11, oz + 0.28), collection, material=materials["brass"], bevel=0.008))

    for index, z_value in enumerate((0.42, 1.3, 2.18), start=1):
        parts.append(
            cylinder(
                f"Hinge_{index}",
                0.035,
                0.1,
                (ox - 0.58, oy + 0.1, oz + z_value),
                collection,
                rotation=(math.pi / 2, 0.0, 0.0),
                material=materials["brass"],
            )
        )

    parts.append(cylinder("HandleStem", 0.02, 0.1, (ox + 0.42, oy + 0.11, oz + 1.06), collection, rotation=(math.pi / 2, 0.0, 0.0), material=materials["brass"], bevel=0.004))
    parts.append(cylinder("HandleGrip", 0.018, 0.24, (ox + 0.52, oy + 0.11, oz + 1.06), collection, rotation=(0.0, math.pi / 2, 0.0), material=materials["brass"], bevel=0.004))
    parts.append(cube("DoorReader", (0.18, 0.03, 0.32), (ox + 0.56, oy + 0.1, oz + 1.34), collection, material=materials["screen"], bevel=0.006))

    parent_objects(root, parts)
    return root


def create_wall_keypad(
    origin: tuple[float, float, float],
    collection: bpy.types.Collection,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    ox, oy, oz = origin
    root = make_empty("PWZ_WallKeypad", origin, collection)
    parts: list[bpy.types.Object] = []

    parts.append(cube("BackPlate", (0.42, 0.08, 0.72), (ox, oy, oz + 0.36), collection, material=materials["dark_paint"], bevel=0.01))
    parts.append(cube("Screen", (0.24, 0.02, 0.11), (ox, oy + 0.045, oz + 0.62), collection, material=materials["screen"], bevel=0.004))
    parts.append(cube("StatusLight", (0.04, 0.02, 0.04), (ox + 0.14, oy + 0.045, oz + 0.62), collection, material=materials["warning_light"], bevel=0.002))

    button_width = 0.075
    button_height = 0.06
    button_depth = 0.025
    start_x = ox - 0.09
    start_z = oz + 0.44

    button_number = 1
    for row in range(4):
        for col in range(3):
            z_offset = start_z - row * 0.1
            x_offset = start_x + col * 0.09
            parts.append(
                cube(
                    f"Button_{button_number}",
                    (button_width, button_depth, button_height),
                    (x_offset, oy + 0.04, z_offset),
                    collection,
                    material=materials["metal"],
                    bevel=0.003,
                )
            )
            button_number += 1

    parent_objects(root, parts)
    return root


def create_metal_desk(
    origin: tuple[float, float, float],
    collection: bpy.types.Collection,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    ox, oy, oz = origin
    root = make_empty("PWZ_MetalDesk", origin, collection)
    parts: list[bpy.types.Object] = []

    parts.append(cube("DeskTop", (1.45, 0.72, 0.08), (ox, oy, oz + 0.76), collection, material=materials["dark_paint"], bevel=0.014))
    parts.append(cube("DeskRearPanel", (1.35, 0.04, 0.54), (ox, oy - 0.34, oz + 0.36), collection, material=materials["metal"], bevel=0.008))
    parts.append(cube("DeskDrawerBlock", (0.42, 0.6, 0.62), (ox + 0.42, oy + 0.02, oz + 0.31), collection, material=materials["metal"], bevel=0.01))
    parts.append(cube("DrawerGap1", (0.38, 0.02, 0.015), (ox + 0.42, oy + 0.31, oz + 0.47), collection, material=materials["accent"], bevel=0.0))
    parts.append(cube("DrawerGap2", (0.38, 0.02, 0.015), (ox + 0.42, oy + 0.31, oz + 0.28), collection, material=materials["accent"], bevel=0.0))
    parts.append(cube("DrawerGap3", (0.38, 0.02, 0.015), (ox + 0.42, oy + 0.31, oz + 0.09), collection, material=materials["accent"], bevel=0.0))

    for leg_x in (-0.58, 0.58):
        for leg_y in (-0.28, 0.28):
            parts.append(cube("DeskLeg", (0.06, 0.06, 0.74), (ox + leg_x, oy + leg_y, oz + 0.37), collection, material=materials["metal"], bevel=0.004))

    for handle_z in (0.47, 0.28, 0.09):
        parts.append(cylinder("DrawerHandleStem", 0.01, 0.04, (ox + 0.42, oy + 0.31, oz + handle_z), collection, rotation=(math.pi / 2, 0.0, 0.0), material=materials["brass"], bevel=0.002))
        parts.append(cylinder("DrawerHandleGrip", 0.01, 0.16, (ox + 0.42, oy + 0.33, oz + handle_z), collection, rotation=(0.0, math.pi / 2, 0.0), material=materials["brass"], bevel=0.002))

    parent_objects(root, parts)
    return root


def create_vent_grate(
    origin: tuple[float, float, float],
    collection: bpy.types.Collection,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    ox, oy, oz = origin
    root = make_empty("PWZ_VentGrate", origin, collection)
    parts: list[bpy.types.Object] = []

    parts.append(cube("VentFrame", (1.05, 0.08, 0.68), (ox, oy, oz + 0.34), collection, material=materials["metal"], bevel=0.008))
    parts.append(cube("VentInterior", (0.92, 0.02, 0.55), (ox, oy + 0.04, oz + 0.34), collection, material=materials["dark_paint"], bevel=0.002))

    for index in range(8):
        parts.append(
            cube(
                f"VentSlat_{index + 1}",
                (0.84, 0.02, 0.03),
                (ox, oy + 0.05, oz + 0.12 + index * 0.06),
                collection,
                rotation=(math.radians(12), 0.0, 0.0),
                material=materials["metal"],
                bevel=0.002,
            )
        )

    for corner_x in (-0.45, 0.45):
        for corner_z in (0.08, 0.6):
            parts.append(cylinder("VentBolt", 0.016, 0.03, (ox + corner_x, oy + 0.045, oz + corner_z), collection, rotation=(math.pi / 2, 0.0, 0.0), material=materials["brass"], vertices=18, bevel=0.001))

    parent_objects(root, parts)
    return root


def create_wall_sconce(
    origin: tuple[float, float, float],
    collection: bpy.types.Collection,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    ox, oy, oz = origin
    root = make_empty("PWZ_WallSconce", origin, collection)
    parts: list[bpy.types.Object] = []

    parts.append(cube("BackPlate", (0.18, 0.05, 0.34), (ox, oy, oz + 0.5), collection, material=materials["brass"], bevel=0.008))
    parts.append(cylinder("MountArm", 0.025, 0.34, (ox, oy + 0.16, oz + 0.5), collection, rotation=(math.pi / 2, 0.0, 0.0), material=materials["brass"], bevel=0.004))
    parts.append(cylinder("LightBody", 0.09, 0.22, (ox, oy + 0.28, oz + 0.5), collection, rotation=(math.pi / 2, 0.0, 0.0), material=materials["dark_paint"], bevel=0.004))
    parts.append(cylinder("Bulb", 0.05, 0.14, (ox, oy + 0.28, oz + 0.5), collection, rotation=(math.pi / 2, 0.0, 0.0), material=materials["lamp_glow"], bevel=0.002))

    for x_offset in (-0.06, 0.0, 0.06):
        parts.append(cube("CageBar", (0.01, 0.2, 0.16), (ox + x_offset, oy + 0.28, oz + 0.5), collection, material=materials["brass"], bevel=0.001))

    parts.append(cylinder("CageRingFront", 0.095, 0.01, (ox, oy + 0.38, oz + 0.5), collection, rotation=(math.pi / 2, 0.0, 0.0), material=materials["brass"], bevel=0.001))
    parts.append(cylinder("CageRingRear", 0.095, 0.01, (ox, oy + 0.18, oz + 0.5), collection, rotation=(math.pi / 2, 0.0, 0.0), material=materials["brass"], bevel=0.001))

    parent_objects(root, parts)
    return root


def create_evidence_board(
    origin: tuple[float, float, float],
    collection: bpy.types.Collection,
    materials: dict[str, bpy.types.Material],
) -> bpy.types.Object:
    ox, oy, oz = origin
    root = make_empty("PWZ_EvidenceBoard", origin, collection)
    parts: list[bpy.types.Object] = []

    parts.append(cube("BoardFrame", (1.45, 0.08, 1.0), (ox, oy, oz + 0.6), collection, material=materials["dark_wood"], bevel=0.01))
    parts.append(cube("Cork", (1.28, 0.03, 0.84), (ox, oy + 0.03, oz + 0.6), collection, material=materials["cork"], bevel=0.004))

    note_positions = [
        (-0.36, 0.82, 0.18),
        (0.2, 0.92, 0.28),
        (-0.02, 0.46, 0.0),
        (0.38, 0.3, -0.12),
    ]
    for index, (x_offset, z_offset, rotation_z) in enumerate(note_positions, start=1):
        parts.append(
            cube(
                f"Note_{index}",
                (0.26, 0.01, 0.18),
                (ox + x_offset, oy + 0.045, oz + z_offset),
                collection,
                rotation=(0.0, 0.0, rotation_z),
                material=materials["paper"],
                bevel=0.002,
            )
        )
        parts.append(
            cylinder(
                f"Pin_{index}",
                0.012,
                0.02,
                (ox + x_offset, oy + 0.05, oz + z_offset + 0.05),
                collection,
                rotation=(math.pi / 2, 0.0, 0.0),
                material=materials["warning_light"],
                vertices=16,
                bevel=0.001,
            )
        )

    string_specs = [
        ((-0.36, 0.18), (0.2, 0.28)),
        ((0.2, 0.28), (-0.02, 0.0)),
        ((-0.02, 0.0), (0.38, -0.12)),
    ]
    for index, ((x1, z1), (x2, z2)) in enumerate(string_specs, start=1):
        dx = x2 - x1
        dz = z2 - z1
        length = math.sqrt(dx * dx + dz * dz)
        angle = math.atan2(dz, dx)
        parts.append(
            cube(
                f"String_{index}",
                (length, 0.005, 0.01),
                (ox + (x1 + x2) / 2.0, oy + 0.048, oz + (z1 + z2) / 2.0),
                collection,
                rotation=(0.0, 0.0, angle),
                material=materials["string"],
                bevel=0.0,
            )
        )

    parent_objects(root, parts)
    return root


def build_material_library() -> dict[str, bpy.types.Material]:
    return {
        "metal": make_material("PWZ_Metal", (0.46, 0.5, 0.56, 1.0), metallic=0.8, roughness=0.32),
        "dark_paint": make_material("PWZ_DarkPaint", (0.08, 0.1, 0.12, 1.0), metallic=0.18, roughness=0.52),
        "accent": make_material("PWZ_Accent", (0.18, 0.24, 0.3, 1.0), metallic=0.35, roughness=0.44),
        "brass": make_material("PWZ_Brass", (0.68, 0.52, 0.22, 1.0), metallic=0.95, roughness=0.28),
        "screen": make_material("PWZ_Screen", (0.12, 0.78, 0.95, 1.0), metallic=0.0, roughness=0.12, emission_strength=1.25),
        "warning_light": make_material("PWZ_WarningLight", (0.92, 0.18, 0.16, 1.0), metallic=0.0, roughness=0.2, emission_strength=2.0),
        "lamp_glow": make_material("PWZ_LampGlow", (0.98, 0.82, 0.48, 1.0), metallic=0.0, roughness=0.1, emission_strength=3.0),
        "dark_wood": make_material("PWZ_DarkWood", (0.22, 0.12, 0.06, 1.0), metallic=0.0, roughness=0.7),
        "cork": make_material("PWZ_Cork", (0.48, 0.3, 0.14, 1.0), metallic=0.0, roughness=0.88),
        "paper": make_material("PWZ_Paper", (0.94, 0.91, 0.8, 1.0), metallic=0.0, roughness=0.95),
        "string": make_material("PWZ_String", (0.58, 0.08, 0.08, 1.0), metallic=0.0, roughness=0.84),
    }


def main() -> None:
    collection = ensure_collection(ASSET_COLLECTION_NAME)
    materials = build_material_library()

    create_security_door((0.0, 0.0, 0.0), collection, materials)
    create_wall_keypad((2.4, 0.0, 0.0), collection, materials)
    create_metal_desk((4.9, 0.0, 0.0), collection, materials)
    create_vent_grate((7.7, 0.0, 0.0), collection, materials)
    create_wall_sconce((10.0, 0.0, 0.0), collection, materials)
    create_evidence_board((12.6, 0.0, 0.0), collection, materials)

    print(f"Created starter assets in collection: {ASSET_COLLECTION_NAME}")


if __name__ == "__main__":
    main()