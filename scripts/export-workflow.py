"""Export the page-six graph using the installed Lanshu renderer primitives.

The upstream fixed layout is replaced by the user's three-column composition.
Run with --skill-root pointing at lanshu-animated-architecture-diagram.
"""
import argparse
import importlib.util
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


def export(skill_root, root):
    module_path = skill_root / "scripts/render_animated_diagram.py"
    spec_module = importlib.util.spec_from_file_location("lanshu_renderer", module_path)
    renderer = importlib.util.module_from_spec(spec_module)
    spec_module.loader.exec_module(renderer)
    renderer.SCALE = 1
    renderer.THEME.update(bg="#061a2c", white="#edf4f8")
    spec = json.loads((root / "docs/workflow-spec.json").read_text(encoding="utf-8"))
    width, height, offset = 1800, 880, 100
    canvas = dict(spec["canvas"], width=width, height=height)
    ex = renderer.Excal(width, height)
    image = Image.new("RGBA", (width, height), "#061a2c")
    draw = ImageDraw.Draw(image)
    cyan, amber = "#79dfe8", "#e4c16d"
    renderer.draw_text(ex, draw, "自然资源确权登记工作流程", 32, 10, 1200, 48, 35, align="left", bold=True)
    renderer.draw_text(ex, draw, "从前期准备到成果入库，全流程协同推进", 32, 62, 1200, 26, 21, color="#b6cbd9", align="left")
    renderer.draw_text(ex, draw, "RiverAtlas", 1510, 18, 240, 38, 24, color=cyan, align="right")
    for band in spec["bands"]:
        x, y, w, h = band["x"], band["y"] + offset, band["w"], band["height"]
        renderer.draw_rect(ex, draw, x, y, w, h, "#458a9e", "#0a293c", width=1)
        renderer.draw_rect(ex, draw, x, y, w, 68, "#4aa5ba", "#104052", width=1)
        number = str(spec["bands"].index(band) + 1).zfill(2)
        renderer.draw_text(ex, draw, number + "  " + band["lines"][0], x + 26, y + 12, w - 40, 44, 30, color=cyan, align="left", bold=True)
    for edge in spec["edges"]:
        points = [(x, y + offset) for x, y in edge["points"]]
        renderer.draw_line(ex, draw, points, amber if edge["kind"] == "condition" else "#85b5c9", width=2, arrow=edge["kind"] != "branch")
    for node in spec["nodes"]:
        x, y, w, h = node["x"], node["y"] + offset, node["w"], node["h"]
        renderer.draw_rect(ex, draw, x, y, w, h, amber if node["kind"] == "exception" else "#80afc7", "#1b4055", width=1)
        top, box_height = (8, 66) if node["id"] == "prepare" else (0, h)
        size = 17 if node["id"] in ("organization", "technical", "materials") else 27 if node["kind"] == "main" else 23
        renderer.draw_text(ex, draw, "\n".join(node["lines"]), x + 10, y + top, w - 20, box_height, size, bold=node["kind"] == "main")
    for edge in spec["edges"]:
        if not edge.get("labelAt"):
            continue
        x, y = edge["labelAt"]
        label = "\n".join(edge.get("lines") or [edge["label"]])
        font = renderer.load_font(21, cjk=True)
        tw, th = renderer.text_size(draw, label, font)
        left = x - tw if edge.get("anchor") == "end" else x - tw / 2
        draw.rounded_rectangle((left - 4, y + offset - th, left + tw + 4, y + offset + 4), radius=3, fill="#0a293c")
        renderer.draw_text(ex, draw, label, left, y + offset - th, tw, th, 21, color=amber if edge["kind"] == "condition" else cyan)
    base = image.convert("RGB")
    frames = []
    conditions = {("verify", "mapping"), ("verify", "supplement"), ("supplement", "mapping"), ("supplement", "dispute"), ("dispute", "mapping")}
    for idx in range(canvas["frames"]):
        frame = base.convert("RGBA")
        overlay = Image.new("RGBA", frame.size)
        painter = ImageDraw.Draw(overlay)
        progress = idx / canvas["frames"]
        phase = 0 if progress < .25 else 1 if progress < .75 else 2
        branch = int((progress - .25) * 6) if phase == 1 else -1
        for edge in spec["edges"]:
            pair = (edge["from"], edge["to"])
            if edge["phase"] != phase:
                continue
            if pair in conditions and pair not in [
                {( "verify", "mapping")},
                {( "verify", "supplement"), ("supplement", "mapping")},
                {( "verify", "supplement"), ("supplement", "dispute"), ("dispute", "mapping")},
            ][max(0, min(2, branch))]:
                continue
            if edge["to"] in ("organization", "technical", "materials"):
                continue
            points = [(x, y + offset) for x, y in edge["points"]]
            for trail, strength in [(0, 1), (-.025, .55)]:
                x, y = renderer.point_at_fraction(points, progress * 2 + trail)
                renderer.draw_glow_dot(painter, x, y, amber if edge["kind"] == "condition" else cyan, strength)
        for node in spec["nodes"]:
            if node["phase"] == phase and node["kind"] == "main":
                rect = (node["x"], node["y"] + offset, node["x"] + node["w"], node["y"] + offset + node["h"])
                renderer.pulse_rect(painter, rect, cyan, progress * math.tau * 2)
        frame.alpha_composite(overlay)
        frames.append(frame.convert("RGB"))
    outdir = root / "docs/exports"
    outdir.mkdir(parents=True, exist_ok=True)
    paths = {kind: outdir / ("自然资源确权登记工作流程." + kind) for kind in ("png", "gif", "excalidraw")}
    base.save(paths["png"])
    frames[0].save(paths["gif"], save_all=True, append_images=frames[1:], duration=int(1000 / canvas["fps"]), loop=0, optimize=False)
    ex.write(paths["excalidraw"])
    result = {kind: str(path) for kind, path in paths.items()}
    result["checks"] = renderer.check_outputs(result, {"canvas": canvas})
    (outdir / "验证报告.json").write_text(json.dumps(result["checks"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    assert result["checks"]["ok"], result["checks"]
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skill-root", type=Path, required=True)
    args = parser.parse_args()
    export(args.skill_root.resolve(), Path(__file__).resolve().parents[1])
