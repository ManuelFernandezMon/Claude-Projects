"""One-time crop of individual clinic photos out of Google Maps app
screenshot grids. Crop boxes are approximate and were tuned by visual
inspection of the source screenshots (1080x2340px) — re-verify by eye
before re-running against new source photos, since grid gutters vary.

Usage: python3 crop-images.py
Reads from ./source-grids/, writes to ../src/assets/images/
"""

from pathlib import Path

from PIL import Image

SRC = Path(__file__).parent / "source-grids"
DEST = Path(__file__).parent.parent / "src" / "assets" / "images"
DEST.mkdir(parents=True, exist_ok=True)

# (source file, crop box (x1, y1, x2, y2), output filename)
CROPS = [
    ("photo1.jpg", (44, 485, 889, 1534), "exam-room.jpg"),
    ("photo3.jpg", (9, 1210, 535, 1650), "storefront-day.jpg"),
    ("photo3.jpg", (545, 1044, 1070, 1457), "pharmacy-shelves-1.jpg"),
    ("photo4.jpg", (9, 672, 535, 1281), "pharmacy-shelves-2.jpg"),
    ("photo4.jpg", (545, 903, 1070, 1533), "medical-equipment.jpg"),
    ("photo4.jpg", (9, 1293, 535, 1685), "storefront-night.jpg"),
    ("photo5.jpg", (9, 975, 535, 1600), "pet-carriers.jpg"),
]

MAX_DIM = 1600
JPEG_QUALITY = 82

for source_name, box, output_name in CROPS:
    src_path = SRC / source_name
    with Image.open(src_path) as im:
        cropped = im.crop(box)
        cropped.thumbnail((MAX_DIM, MAX_DIM))
        cropped = cropped.convert("RGB")
        cropped.save(DEST / output_name, quality=JPEG_QUALITY)
        print(f"{source_name} {box} -> {output_name} {cropped.size}")
