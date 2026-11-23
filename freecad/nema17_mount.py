# -*- coding: utf-8 -*-
"""
NEMA 17 stepper motor L-bracket mount -- FreeCAD 0.21 macro.

How to run
----------
GUI:      Macro > Macros... > Create/Edit, paste this file, press Run (F6).
          Or: Macro > Macros... > select this file > Execute.
Headless: freecadcmd nema17_mount.py

What it does
------------
1. Builds the bracket from the PARAMETERS block below (all units mm).
2. Adds it to the active document as "MotorMount" (replaces an old one).
3. Exports STEP and STL next to this script (or to OUTPUT_DIR).

Change a number, run again, the part is rebuilt. Nothing leaves your PC.

Coordinate system
-----------------
X = bracket width, Y = depth (base plate extends +Y),
Z = up. The vertical plate sits at Y = 0..thickness.
The motor body hangs on the -Y side, the shaft points +Y over the base.
"""

import os
import math

import FreeCAD as App
import Part

# ---------------------------------------------------------------- PARAMETERS
P = {
    # Motor (NEMA 17 standard values)
    "motor_face": 42.3,        # square face size
    "hole_spacing": 31.0,      # mounting hole pitch (square pattern)
    "screw_hole_d": 3.4,       # M3 clearance
    "pilot_hole_d": 22.5,      # clearance for the 22 mm centring boss
    "motor_clearance": 1.0,    # gap between motor body and mounting surface

    # Bracket
    "width": 60.0,             # X size of both plates
    "base_depth": 45.0,        # Y size of the base plate
    "thickness": 5.0,          # plate thickness
    "inner_fillet": 3.0,       # fillet on the inside corner (0 = none)

    # Gussets (one on each side edge)
    "gusset": True,
    "gusset_t": 4.0,           # gusset thickness (X)
    "gusset_len": 25.0,        # along the base (Y)
    "gusset_h": 25.0,          # up the vertical plate (Z)

    # Base mounting slots (for M4 / M5 screws)
    "slot_w": 5.5,             # slot width = screw clearance
    "slot_inset": 12.0,        # slot centre distance from the X edges
    "slot_margin": 6.0,        # material left at the slot ends (Y)
}

OUTPUT_DIR = None              # None = folder of this script (or home dir)
EXPORT_STEP = True
EXPORT_STL = True
STL_DEFLECTION = 0.05          # mm, smaller = finer STL mesh
DOC_NAME = "NEMA17_Mount"
OBJ_NAME = "MotorMount"
# --------------------------------------------------------------------------


def V(x, y, z):
    return App.Vector(x, y, z)


def derived(p):
    """Values computed from the parameters."""
    d = {}
    d["motor_z"] = p["thickness"] + p["motor_face"] / 2.0 + p["motor_clearance"]
    d["plate_h"] = d["motor_z"] + p["motor_face"] / 2.0
    d["motor_x"] = p["width"] / 2.0
    return d


def check(p, d):
    """Catch parameter combinations that would make a broken part."""
    errors = []
    t = p["thickness"]

    if p["width"] < p["motor_face"]:
        errors.append("width (%.1f) is smaller than motor_face (%.1f)"
                      % (p["width"], p["motor_face"]))

    if p["gusset"]:
        motor_left = d["motor_x"] - p["motor_face"] / 2.0
        if p["gusset_t"] > motor_left:
            # Gussets are on the +Y side, motor is on -Y, so this is only
            # a warning about screw-head access on the plate.
            print("Warning: gussets overlap the motor footprint in X; "
                  "check screwdriver access.")
        if p["gusset_len"] > p["base_depth"] - t:
            errors.append("gusset_len is longer than the free base depth")
        if p["gusset_h"] > d["plate_h"] - t:
            errors.append("gusset_h is taller than the vertical plate")
        if p["slot_inset"] - p["slot_w"] / 2.0 <= p["gusset_t"]:
            errors.append("slots cut into the gussets: increase slot_inset")

    if p["slot_inset"] - p["slot_w"] / 2.0 < 1.0:
        errors.append("slots break through the side edge")

    slot_len = p["base_depth"] - t - 2 * p["slot_margin"] - p["slot_w"]
    if slot_len <= 0:
        errors.append("base_depth too small for the slots")

    if p["inner_fillet"] >= t * 2:
        errors.append("inner_fillet too large for the plate thickness")

    if errors:
        raise ValueError("Bad parameters:\n  - " + "\n  - ".join(errors))


def make_slot(x_c, y1, y2, w, t):
    """Vertical through-slot in the base, running along Y from y1 to y2
    (centres of the round ends)."""
    r = w / 2.0
    box = Part.makeBox(w, y2 - y1, t + 2, V(x_c - r, y1, -1))
    c1 = Part.makeCylinder(r, t + 2, V(x_c, y1, -1), V(0, 0, 1))
    c2 = Part.makeCylinder(r, t + 2, V(x_c, y2, -1), V(0, 0, 1))
    return box.fuse([c1, c2])


def make_gusset(x0, p):
    """Triangular rib in the YZ plane, extruded gusset_t along +X from x0."""
    t = p["thickness"]
    pts = [V(x0, t, t),
           V(x0, t + p["gusset_len"], t),
           V(x0, t, t + p["gusset_h"]),
           V(x0, t, t)]
    face = Part.Face(Part.makePolygon(pts))
    return face.extrude(V(p["gusset_t"], 0, 0))


def fillet_inner_corner(shape, p):
    """Fillet the inside edge where base meets plate (y = t, z = t)."""
    r = p["inner_fillet"]
    if r <= 0:
        return shape
    t = p["thickness"]
    tol = 1e-6
    target = []
    for e in shape.Edges:
        a, b = e.Vertexes[0].Point, e.Vertexes[-1].Point
        if (abs(a.y - t) < tol and abs(b.y - t) < tol and
                abs(a.z - t) < tol and abs(b.z - t) < tol):
            target.append(e)
    if not target:
        print("Warning: inner corner edge not found, fillet skipped.")
        return shape
    return shape.makeFillet(r, target)


def build(p):
    d = derived(p)
    check(p, d)
    t, w = p["thickness"], p["width"]

    # 1. L-shape: base plate + vertical plate
    base = Part.makeBox(w, p["base_depth"], t)
    plate = Part.makeBox(w, t, d["plate_h"])
    body = base.fuse(plate).removeSplitter()
    body = fillet_inner_corner(body, p)

    # 2. Gussets on both side edges
    if p["gusset"]:
        g1 = make_gusset(0.0, p)
        g2 = make_gusset(w - p["gusset_t"], p)
        body = body.fuse([g1, g2]).removeSplitter()

    # 3. Motor holes through the vertical plate (along Y)
    cuts = []
    mx, mz = d["motor_x"], d["motor_z"]
    depth = t + 2
    cuts.append(Part.makeCylinder(p["pilot_hole_d"] / 2.0, depth,
                                  V(mx, -1, mz), V(0, 1, 0)))
    s = p["hole_spacing"] / 2.0
    for dx in (-s, s):
        for dz in (-s, s):
            cuts.append(Part.makeCylinder(p["screw_hole_d"] / 2.0, depth,
                                          V(mx + dx, -1, mz + dz), V(0, 1, 0)))

    # 4. Mounting slots in the base
    y1 = t + p["slot_margin"] + p["slot_w"] / 2.0
    y2 = p["base_depth"] - p["slot_margin"] - p["slot_w"] / 2.0
    for xc in (p["slot_inset"], w - p["slot_inset"]):
        cuts.append(make_slot(xc, y1, y2, p["slot_w"], t))

    body = body.cut(cuts).removeSplitter()

    if not body.isValid():
        body.fix(1e-7, 1e-7, 1e-7)
    if not body.isValid():
        raise RuntimeError("Resulting solid is not valid.")
    return body, d


def output_dir():
    if OUTPUT_DIR:
        return OUTPUT_DIR
    try:
        return os.path.dirname(os.path.abspath(__file__))
    except NameError:  # pasted into the macro editor / console
        return os.path.expanduser("~")


def export(shape, folder):
    os.makedirs(folder, exist_ok=True)
    paths = []
    if EXPORT_STEP:
        f = os.path.join(folder, OBJ_NAME + ".step")
        shape.exportStep(f)
        paths.append(f)
    if EXPORT_STL:
        import MeshPart
        mesh = MeshPart.meshFromShape(Shape=shape,
                                      LinearDeflection=STL_DEFLECTION,
                                      AngularDeflection=math.radians(10),
                                      Relative=False)
        f = os.path.join(folder, OBJ_NAME + ".stl")
        mesh.write(f)
        paths.append(f)
    return paths


def main():
    shape, d = build(P)

    doc = App.ActiveDocument or App.newDocument(DOC_NAME)
    old = doc.getObject(OBJ_NAME)
    if old is not None:
        doc.removeObject(OBJ_NAME)
    obj = doc.addObject("Part::Feature", OBJ_NAME)
    obj.Shape = shape
    doc.recompute()

    if App.GuiUp:
        import FreeCADGui as Gui
        obj.ViewObject.ShapeColor = (0.30, 0.55, 0.85)
        Gui.SendMsgToActiveView("ViewFit")
        Gui.activeDocument().activeView().viewIsometric()

    bb = shape.BoundBox
    print("MotorMount built")
    print("  size      : %.1f x %.1f x %.1f mm" % (bb.XLength, bb.YLength, bb.ZLength))
    print("  volume    : %.1f cm3" % (shape.Volume / 1000.0))
    print("  PLA mass  : %.1f g (100%% infill, 1.24 g/cm3)" % (shape.Volume / 1000.0 * 1.24))
    print("  shaft axis: x=%.2f, z=%.2f mm" % (d["motor_x"], d["motor_z"]))

    for f in export(shape, output_dir()):
        print("  exported  : " + f)


main()
