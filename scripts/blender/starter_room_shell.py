"""Build a simple room shell for staging rendered Puzzlewarz escape-room scenes.

This gives you a one-camera room with lights, walls, a floor, and anchor props.
Run it first, then run ``escape_room_asset_pack.py`` to generate starter props.
"""

# pyright: reportMissingImports=false

from __future__ import annotations

import math

import bpy


COLLECTION_NAME = "PWZ_StarterRoom"


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


def make_material(name: str, color: tuple[float, float, float, float], roughness: float) -> bpy.types.Material:
    material = bpy.data.materials.get(name)
    if material is None:
        material = bpy.data.materials.new(name=name)

    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled is not None:
        principled.inputs["Base Color"].default_value = color
        principled.inputs["Roughness"].default_value = roughness

    return material


def cube(
    name: str,
    size: tuple[float, float, float],
    location: tuple[float, float, float],
    collection: bpy.types.Collection,
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] / 2.0, size[1] / 2.0, size[2] / 2.0)
    move_to_collection(obj, collection)
    obj.data.materials.clear()
    obj.data.materials.append(material)
    return obj


def create_camera(collection: bpy.types.Collection) -> bpy.types.Object:
    bpy.ops.object.camera_add(location=(0.0, -7.8, 2.2), rotation=(math.radians(78), 0.0, 0.0))
    camera = bpy.context.active_object
    camera.name = "PWZ_RenderCamera"
    move_to_collection(camera, collection)
    camera.data.lens = 28
    bpy.context.scene.camera = camera
    return camera


def create_area_light(
    name: str,
    location: tuple[float, float, float],
    rotation: tuple[float, float, float],
    energy: float,
    size: float,
    collection: bpy.types.Collection,
) -> bpy.types.Object:
    bpy.ops.object.light_add(type="AREA", location=location, rotation=rotation)
    light = bpy.context.active_object
    light.name = name
    light.data.energy = energy
    light.data.shape = "RECTANGLE"
    light.data.size = size
    light.data.size_y = size * 0.55
    move_to_collection(light, collection)
    return light


def main() -> None:
    collection = ensure_collection(COLLECTION_NAME)

    wall_material = make_material("PWZ_Wall", (0.16, 0.17, 0.19, 1.0), 0.85)
    floor_material = make_material("PWZ_Floor", (0.23, 0.21, 0.2, 1.0), 0.72)
    trim_material = make_material("PWZ_Trim", (0.08, 0.09, 0.11, 1.0), 0.55)

    cube("Floor", (8.0, 8.0, 0.2), (0.0, 0.0, -0.1), collection, floor_material)
    cube("RearWall", (8.0, 0.2, 3.6), (0.0, 3.9, 1.8), collection, wall_material)
    cube("LeftWall", (0.2, 8.0, 3.6), (-3.9, 0.0, 1.8), collection, wall_material)
    cube("RightWall", (0.2, 8.0, 3.6), (3.9, 0.0, 1.8), collection, wall_material)
    cube("CeilingBeam", (8.0, 0.25, 0.18), (0.0, 3.72, 3.12), collection, trim_material)
    cube("FloorTrimRear", (8.0, 0.16, 0.14), (0.0, 3.75, 0.07), collection, trim_material)
    cube("FloorTrimLeft", (0.16, 8.0, 0.14), (-3.75, 0.0, 0.07), collection, trim_material)
    cube("FloorTrimRight", (0.16, 8.0, 0.14), (3.75, 0.0, 0.07), collection, trim_material)
    cube("DoorOpeningMask", (1.65, 0.05, 2.7), (-2.55, 3.82, 1.35), collection, trim_material)
    cube("DeskBlockout", (1.7, 0.9, 0.8), (1.7, 1.9, 0.4), collection, trim_material)
    cube("VentBlockout", (1.2, 0.08, 0.8), (3.15, 3.82, 2.25), collection, trim_material)

    create_camera(collection)
    create_area_light(
        "KeyLight",
        (-1.8, -2.4, 3.2),
        (math.radians(58), 0.0, math.radians(22)),
        2500,
        3.2,
        collection,
    )
    create_area_light(
        "FillLight",
        (2.4, -1.9, 2.6),
        (math.radians(72), 0.0, math.radians(-28)),
        900,
        2.2,
        collection,
    )
    create_area_light(
        "RimLight",
        (0.0, 3.0, 3.3),
        (math.radians(-82), 0.0, 0.0),
        1300,
        2.6,
        collection,
    )

    if bpy.context.scene.world and bpy.context.scene.world.use_nodes:
        background = bpy.context.scene.world.node_tree.nodes.get("Background")
        if background is not None:
            background.inputs[0].default_value = (0.015, 0.018, 0.024, 1.0)
            background.inputs[1].default_value = 0.3

    print(f"Created staged room shell in collection: {COLLECTION_NAME}")


if __name__ == "__main__":
    main()