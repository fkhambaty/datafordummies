#!/usr/bin/env python3
"""Build the app icon, Android adaptive layers and splash image from the site logo.

Source: ../logo.png (the Data For Dummies mark used on the homepage and in og:image).
Run from mobile/: python3 scripts/generate_assets.py
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

MOBILE = Path(__file__).resolve().parents[1]
SOURCE = MOBILE.parent / "logo.png"
OUT = MOBILE / "assets"

# Site tokens: --dfd-accent and the paywall CTA gradient end colour.
ACCENT = (79, 70, 229)
ACCENT_END = (124, 58, 237)
WHITE = (255, 255, 255)


def trimmed_logo() -> Image.Image:
    logo = Image.open(SOURCE).convert("RGBA")
    alpha = logo.getchannel("A")
    box = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    if box is None:
        raise SystemExit(f"{SOURCE} has no visible pixels")
    return logo.crop(box)


def fit(image: Image.Image, width: int, height: int) -> Image.Image:
    scale = min(width / image.width, height / image.height)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.LANCZOS)


def paste_center(canvas: Image.Image, art: Image.Image) -> Image.Image:
    x = (canvas.width - art.width) // 2
    y = (canvas.height - art.height) // 2
    canvas.alpha_composite(art, (x, y))
    return canvas


def gradient(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(canvas)
    for offset in range(size * 2):
        t = offset / (size * 2 - 1)
        colour = tuple(round(a + (b - a) * t) for a, b in zip(ACCENT, ACCENT_END)) + (255,)
        draw.line([(offset, 0), (0, offset)], fill=colour, width=2)
    return canvas


def main() -> None:
    OUT.mkdir(exist_ok=True)
    logo = trimmed_logo()

    # iOS and the store listing need an opaque square icon.
    icon = paste_center(gradient(1024), fit(logo, 860, 860))
    icon.convert("RGB").save(OUT / "icon.png", optimize=True)

    # Android adaptive icon: art inside the 66% safe zone on a transparent layer.
    foreground = paste_center(Image.new("RGBA", (1024, 1024), (0, 0, 0, 0)), fit(logo, 640, 640))
    foreground.save(OUT / "android-icon-foreground.png", optimize=True)
    gradient(1024).convert("RGB").save(OUT / "android-icon-background.png", optimize=True)

    # Themed icons tint one colour, so keep the logo's dark line work, not its silhouette.
    opaque = foreground.getchannel("A").point(lambda value: 255 if value > 96 else 0)
    dark = foreground.convert("L").point(lambda value: 255 if value < 70 else 0)
    lines = Image.new("L", foreground.size, 0)
    lines.paste(dark, mask=opaque)
    monochrome = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    monochrome.paste(Image.new("RGBA", (1024, 1024), WHITE + (255,)), mask=lines)
    monochrome.save(OUT / "android-icon-monochrome.png", optimize=True)

    # The splash plugin scales this to imageWidth on a white background.
    splash = paste_center(Image.new("RGBA", (1200, 1200), (0, 0, 0, 0)), fit(logo, 1200, 1200))
    splash.save(OUT / "splash-icon.png", optimize=True)

    # In-app header and onboarding mark.
    fit(logo, 900, 900).save(OUT / "logo.png", optimize=True)

    for name in sorted(path.name for path in OUT.glob("*.png")):
        with Image.open(OUT / name) as image:
            print(f"{name}: {image.width}x{image.height} {image.mode}")


if __name__ == "__main__":
    main()
