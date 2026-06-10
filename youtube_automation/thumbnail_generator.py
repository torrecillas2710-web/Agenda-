"""
Generates YouTube thumbnails (1280x720) using Pillow.
High-contrast design proven to get clicks in the finance niche.
"""

import json
import textwrap
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from config import THUMBNAIL_DIR


# Color palettes for finance niche (high CTR combos)
PALETTES = [
    {"bg": "#0A0A2E", "accent": "#FFD700", "text": "#FFFFFF"},   # Dark navy + gold
    {"bg": "#1A1A1A", "accent": "#00C851", "text": "#FFFFFF"},   # Black + green
    {"bg": "#C0392B", "accent": "#FFFFFF", "text": "#FFFFFF"},   # Red + white
    {"bg": "#2C3E50", "accent": "#F39C12", "text": "#FFFFFF"},   # Dark + orange
    {"bg": "#006400", "accent": "#FFD700", "text": "#FFFFFF"},   # Green + gold
]


def hex_to_rgb(hex_color: str) -> tuple:
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def create_thumbnail(title: str, output_path: str, palette_index: int = 0) -> str:
    """Create a YouTube thumbnail and save it. Returns the path."""
    Path(THUMBNAIL_DIR).mkdir(parents=True, exist_ok=True)
    palette = PALETTES[palette_index % len(PALETTES)]

    img = Image.new("RGB", (1280, 720), color=hex_to_rgb(palette["bg"]))
    draw = ImageDraw.Draw(img)

    # Accent bar on the left
    draw.rectangle([(0, 0), (18, 720)], fill=hex_to_rgb(palette["accent"]))

    # Dollar sign watermark (background decoration)
    try:
        big_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 400)
        draw.text((750, 100), "$", font=big_font, fill=(*hex_to_rgb(palette["accent"]), 30))
    except Exception:
        pass

    # Main title text (wrapped)
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
        small_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
    except Exception:
        title_font = ImageFont.load_default()
        small_font = title_font

    lines = textwrap.wrap(title.upper(), width=18)
    y = 180
    for line in lines[:3]:
        draw.text((60, y), line, font=title_font, fill=hex_to_rgb(palette["text"]))
        y += 100

    # Accent underline
    draw.rectangle([(60, y + 10), (400, y + 16)], fill=hex_to_rgb(palette["accent"]))

    # Bottom tag
    draw.rectangle([(60, 620), (420, 680)], fill=hex_to_rgb(palette["accent"]))
    draw.text((80, 628), "PERSONAL FINANCE 2026", font=small_font, fill=hex_to_rgb(palette["bg"]))

    img.save(output_path, "JPEG", quality=95)
    print(f"  Thumbnail saved: {output_path}")
    return output_path


def generate_for_script(script_path: str, palette_index: int = 0) -> str:
    with open(script_path) as f:
        data = json.load(f)
    slug = Path(script_path).stem
    output_path = f"{THUMBNAIL_DIR}/{slug}.jpg"
    return create_thumbnail(data["title"], output_path, palette_index)


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else None
    if path:
        result = generate_for_script(path)
        print(f"Thumbnail: {result}")
    else:
        print("Usage: python thumbnail_generator.py scripts/your_script.json")
