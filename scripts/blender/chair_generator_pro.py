import bpy
import math

# ==============================
# Procedural Chair (Blender 5.0)
# ==============================
# Units: meters
SEAT_WIDTH = 0.52
SEAT_DEPTH = 0.48
SEAT_THICKNESS = 0.06
SEAT_TOP_Z = 0.46

BACK_HEIGHT = 0.46
BACK_THICKNESS = 0.05
BACK_TILT_DEG = -10.0

LEG_TOP_RADIUS = 0.015
LEG_BOTTOM_RADIUS = 0.022
LEG_INSET_X = 0.05
LEG_INSET_Y = 0.05

CUSHION_THICKNESS = 0.045
CUSHION_INSET = 0.02

BEVEL_WIDTH = 0.008
BEVEL_SEGMENTS = 3

COLLECTION_NAME = "Generated_Chair"


def ensure_object_mode():
    obj = bpy.context.object
    if obj and obj.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")


def activate(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def remove_collection_recursive(col):
    # Delete objects linked in this collection
    for obj in list(col.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    # Delete child collections recursively
    for child in list(col.children):
        remove_collection_recursive(child)

    bpy.data.collections.remove(col)


def reset_target_collection(name):
    existing = bpy.data.collections.get(name)
    if existing:
        remove_collection_recursive(existing)

    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


def move_to_collection(obj, col):
    if col not in obj.users_collection:
        col.objects.link(obj)

    for c in list(obj.users_collection):
        if c != col:
            c.objects.unlink(obj)


def add_box(name, size_xyz, loc_xyz, col):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=loc_xyz)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size_xyz[0] * 0.5, size_xyz[1] * 0.5, size_xyz[2] * 0.5)
    activate(obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_to_collection(obj, col)
    return obj


def add_cylinder(name, radius, depth, loc, rot=(0.0, 0.0, 0.0), vertices=32, col=None):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=loc,
        rotation=rot,
    )
    obj = bpy.context.active_object
    obj.name = name
    if col:
        move_to_collection(obj, col)
    return obj


def add_cone(name, radius_bottom, radius_top, depth, loc, rot=(0.0, 0.0, 0.0), vertices=24, col=None):
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
        location=loc,
        rotation=rot,
    )
    obj = bpy.context.active_object
    obj.name = name
    if col:
        move_to_collection(obj, col)
    return obj


def add_bevel(obj, width=0.005, segments=3):
    mod = obj.modifiers.new(name="Bevel", type="BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"


def shade_smooth(obj):
    if obj.type == "MESH":
        activate(obj)
        bpy.ops.object.shade_smooth()


def material_principled(name, color, metallic=0.0, roughness=0.5):
    mat = bpy.data.materials.get(name)
    if not mat:
        mat = bpy.data.materials.new(name=name)

    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    if not bsdf:
        nt.nodes.clear()
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        out = nt.nodes.new("ShaderNodeOutputMaterial")
        nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    bsdf.inputs["Base Color"].default_value = (color[0], color[1], color[2], 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def assign_material(obj, mat):
    if obj.type != "MESH":
        return
    if len(obj.data.materials) == 0:
        obj.data.materials.append(mat)
    else:
        obj.data.materials[0] = mat


def build_chair():
    ensure_object_mode()
    col = reset_target_collection(COLLECTION_NAME)

    created = []

    seat_bottom_z = SEAT_TOP_Z - SEAT_THICKNESS
    seat_center_z = seat_bottom_z + (SEAT_THICKNESS * 0.5)

    seat = add_box(
        "Chair_Seat_Base",
        (SEAT_WIDTH, SEAT_DEPTH, SEAT_THICKNESS),
        (0.0, 0.0, seat_center_z),
        col,
    )
    add_bevel(seat, width=BEVEL_WIDTH, segments=BEVEL_SEGMENTS)
    created.append(seat)

    cushion_w = max(0.1, SEAT_WIDTH - (CUSHION_INSET * 2.0))
    cushion_d = max(0.1, SEAT_DEPTH - (CUSHION_INSET * 2.0))
    cushion_center_z = SEAT_TOP_Z + (CUSHION_THICKNESS * 0.5)

    cushion = add_box(
        "Chair_Seat_Cushion",
        (cushion_w, cushion_d, CUSHION_THICKNESS),
        (0.0, 0.0, cushion_center_z),
        col,
    )
    add_bevel(cushion, width=BEVEL_WIDTH * 0.75, segments=BEVEL_SEGMENTS)
    created.append(cushion)

    back_w = max(0.18, SEAT_WIDTH - 0.06)
    back_h = BACK_HEIGHT
    back_center_z = SEAT_TOP_Z + (back_h * 0.5)
    back_y = -(SEAT_DEPTH * 0.5) + (BACK_THICKNESS * 0.5) - 0.005

    back = add_box(
        "Chair_Backrest",
        (back_w, BACK_THICKNESS, back_h),
        (0.0, back_y, back_center_z),
        col,
    )
    back.rotation_euler.x = math.radians(BACK_TILT_DEG)
    add_bevel(back, width=BEVEL_WIDTH * 0.65, segments=BEVEL_SEGMENTS)
    created.append(back)

    leg_height = max(0.1, seat_bottom_z)
    leg_center_z = leg_height * 0.5

    lx = (SEAT_WIDTH * 0.5) - LEG_INSET_X
    ly = (SEAT_DEPTH * 0.5) - LEG_INSET_Y

    leg_positions = [
        (-lx, -ly),
        (lx, -ly),
        (-lx, ly),
        (lx, ly),
    ]

    legs = []
    for i, (x, y) in enumerate(leg_positions, start=1):
        leg = add_cone(
            f"Chair_Leg_{i}",
            radius_bottom=LEG_BOTTOM_RADIUS,
            radius_top=LEG_TOP_RADIUS,
            depth=leg_height,
            loc=(x, y, leg_center_z),
            col=col,
        )
        add_bevel(leg, width=BEVEL_WIDTH * 0.35, segments=2)
        legs.append(leg)
        created.append(leg)

    stretcher_z = max(0.07, leg_height * 0.28)
    front_y = ly
    back_y2 = -ly
    left_x = -lx
    right_x = lx

    span_x = abs(right_x - left_x)
    span_y = abs(front_y - back_y2)
    rail_r = 0.012

    # Front/back rails (X axis)
    for name, y in (("Chair_Rail_Front", front_y), ("Chair_Rail_Back", back_y2)):
        rail = add_cylinder(
            name,
            radius=rail_r,
            depth=span_x,
            loc=(0.0, y, stretcher_z),
            rot=(0.0, math.radians(90.0), 0.0),
            col=col,
        )
        created.append(rail)

    # Left/right rails (Y axis)
    for name, x in (("Chair_Rail_Left", left_x), ("Chair_Rail_Right", right_x)):
        rail = add_cylinder(
            name,
            radius=rail_r,
            depth=span_y,
            loc=(x, 0.0, stretcher_z),
            rot=(math.radians(90.0), 0.0, 0.0),
            col=col,
        )
        created.append(rail)

    # Back supports from seat to top of backrest
    support_h = back_center_z + (back_h * 0.5) - seat_bottom_z
    support_center_z = seat_bottom_z + (support_h * 0.5)
    support_y = back_y - (BACK_THICKNESS * 0.2)
    support_x = (back_w * 0.5) - 0.04

    for i, sx in enumerate((-support_x, support_x), start=1):
        support = add_box(
            f"Chair_Back_Support_{i}",
            (0.03, 0.04, support_h),
            (sx, support_y, support_center_z),
            col,
        )
        support.rotation_euler.x = math.radians(BACK_TILT_DEG)
        add_bevel(support, width=BEVEL_WIDTH * 0.45, segments=2)
        created.append(support)

    # Materials
    wood_mat = material_principled("Chair_Wood_Mat", (0.24, 0.14, 0.08), metallic=0.0, roughness=0.58)
    fabric_mat = material_principled("Chair_Fabric_Mat", (0.08, 0.16, 0.24), metallic=0.0, roughness=0.82)

    assign_material(seat, wood_mat)
    assign_material(back, wood_mat)

    for obj in created:
        if obj.name.startswith("Chair_Leg_") or obj.name.startswith("Chair_Rail_") or obj.name.startswith("Chair_Back_Support_"):
            assign_material(obj, wood_mat)

    assign_material(cushion, fabric_mat)

    # Smooth shading pass
    for obj in created:
        shade_smooth(obj)

    # Parent parts to seat for easier transforms
    for obj in created:
        if obj != seat:
            obj.parent = seat

    activate(seat)
    print(f"Chair generated in collection: {COLLECTION_NAME}")


if __name__ == "__main__":
    build_chair()
