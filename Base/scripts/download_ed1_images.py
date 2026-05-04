import base64
import csv
import json
import re
import urllib.request
from pathlib import Path

PAGE_URL = "https://capsulecorpgear.com/naruto-mythos-card-list/"
UPLOADS_BASE = "https://capsulecorpgear.com/wp-content/uploads/"


def b64decode_text(value: str) -> str:
    raw = base64.b64decode(value)
    return raw.decode("utf-8", errors="ignore")


def load_cards_from_page(html: str):
    match = re.search(r"let\s+cards\s*=\s*(\[.*?\]);", html, flags=re.DOTALL)
    if not match:
        raise RuntimeError("Dataset cards non trovato nella pagina")
    payload = match.group(1)
    return json.loads(payload)


def main() -> int:
    repo_base = Path(__file__).resolve().parents[2]
    target = repo_base / "Base" / "images" / "prima_edizione"
    target.mkdir(parents=True, exist_ok=True)

    # Remove previous files extracted from PDF or prior runs.
    for p in target.iterdir():
        if p.is_file():
            p.unlink()

    with urllib.request.urlopen(PAGE_URL, timeout=45) as r:
        html = r.read().decode("utf-8", errors="ignore")

    cards = load_cards_from_page(html)

    # Deduplicate by decoded image file name.
    images = {}
    for card in cards:
        encoded_image = card.get("image", "")
        if not encoded_image:
            continue
        try:
            image_name = b64decode_text(encoded_image)
        except Exception:
            continue

        if not image_name:
            continue

        if image_name not in images:
            images[image_name] = {
                "card_id": b64decode_text(card.get("id", "")) if card.get("id") else "",
                "rank": b64decode_text(card.get("rank", "")) if card.get("rank") else "",
                "name": b64decode_text(card.get("name", "")) if card.get("name") else "",
            }

    rows = []
    for image_name in sorted(images.keys()):
        source_url = UPLOADS_BASE + image_name
        out_path = target / image_name

        try:
            with urllib.request.urlopen(source_url, timeout=45) as r:
                data = r.read()
            out_path.write_bytes(data)
        except Exception as exc:
            print(f"skip {source_url} -> {exc}")
            continue

        meta = images[image_name]
        rows.append(
            {
                "file_name": image_name,
                "source_url": source_url,
                "card_id": meta["card_id"],
                "rank": meta["rank"],
                "name": meta["name"],
            }
        )

    manifest = target / "manifest.csv"
    with manifest.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["file_name", "source_url", "card_id", "rank", "name"]
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Downloaded {len(rows)} card images to: {target}")
    return 0 if rows else 1


if __name__ == "__main__":
    raise SystemExit(main())
