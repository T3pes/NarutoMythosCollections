from __future__ import annotations

from pathlib import Path
from typing import Iterable

from PIL import Image


IMAGE_EXTS = {".webp", ".jpg", ".jpeg", ".png", ".jp2"}


def folder_size_bytes(folder: Path) -> int:
    return sum(p.stat().st_size for p in folder.iterdir() if p.is_file())


def iter_images(folder: Path) -> Iterable[Path]:
    for p in sorted(folder.iterdir()):
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
            yield p


def recompress_webp(path: Path, quality: int, max_side: int | None = None) -> None:
    with Image.open(path) as img:
        img.load()
        if max_side is not None:
            w, h = img.size
            longest = max(w, h)
            if longest > max_side:
                scale = max_side / float(longest)
                img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        # Keep alpha if present.
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
        img.save(path, format="WEBP", quality=quality, method=6)


def optimize_until_limit(folder: Path, limit_mb: float) -> tuple[float, int, int]:
    limit_bytes = int(limit_mb * 1024 * 1024)
    before = folder_size_bytes(folder)

    passes = [
        (82, None),
        (74, None),
        (68, None),
        (62, None),
        (58, 1400),
        (54, 1200),
        (50, 1080),
        (46, 960),
    ]

    for quality, max_side in passes:
        for img_path in iter_images(folder):
            recompress_webp(img_path, quality=quality, max_side=max_side)

        current = folder_size_bytes(folder)
        if current <= limit_bytes:
            return before / 1_048_576, current / 1_048_576, quality

    current = folder_size_bytes(folder)
    return before / 1_048_576, current / 1_048_576, passes[-1][0]


def main() -> int:
    folder = Path(r"C:\Users\flavi\IdeaProjects\NarutoMythosCollection\Base\images\prima_edizione")
    limit_mb = 49.0

    before_mb, after_mb, quality = optimize_until_limit(folder, limit_mb)
    print(f"Before: {before_mb:.2f} MB")
    print(f"After:  {after_mb:.2f} MB")
    print(f"Quality pass reached: {quality}")
    print(f"Under limit {limit_mb}MB: {after_mb <= limit_mb}")
    return 0 if after_mb <= limit_mb else 1


if __name__ == "__main__":
    raise SystemExit(main())

