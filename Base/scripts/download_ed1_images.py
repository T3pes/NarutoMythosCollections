import argparse
import base64
import csv
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

SOURCES = {
    "capsulecorp": {
        "page_url": "https://capsulecorpgear.com/naruto-mythos-card-list/",
        "uploads_base": "https://capsulecorpgear.com/wp-content/uploads/",
        "default_folder": "prima_edizione",
    },
    "official": {
        "page_url": "https://www.narutotcgmythos.com/it/card-gallery",
        "api_url": "https://cards.narutotcgmythos.com/api/cards",
        "uploads_base": "",
        "default_folder": "official_gallery",
    },
}

REQUEST_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    )
}


def b64decode_text(value: str) -> str:
    raw = base64.b64decode(value)
    return raw.decode("utf-8", errors="ignore")


def load_cards_from_page(html: str):
    match = re.search(r"let\s+cards\s*=\s*(\[.*?\]);", html, flags=re.DOTALL)
    if not match:
        raise RuntimeError("Dataset cards non trovato nella pagina")
    payload = match.group(1)
    return json.loads(payload)


def fetch_html(page_url: str) -> str:
    request = urllib.request.Request(page_url, headers=REQUEST_HEADERS)
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read().decode("utf-8", errors="ignore")


def fetch_json(json_url: str):
    request = urllib.request.Request(
        json_url,
        headers={**REQUEST_HEADERS, "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        raw = response.read().decode("utf-8", errors="ignore")
    return json.loads(raw)


def parse_capsulecorp_entries(html: str, uploads_base: str):
    cards = load_cards_from_page(html)
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
        if image_name in images:
            continue

        images[image_name] = {
            "file_name": image_name,
            "source_url": uploads_base + image_name,
            "card_id": b64decode_text(card.get("id", "")) if card.get("id") else "",
            "rank": b64decode_text(card.get("rank", "")) if card.get("rank") else "",
            "name": b64decode_text(card.get("name", "")) if card.get("name") else "",
            "source": "capsulecorp",
        }

    return [images[name] for name in sorted(images.keys())]


def _extract_image_urls_from_html(html: str, base_url: str):
    found = []

    # Match src/href image URLs in absolute, protocol-relative, or relative form.
    attr_pattern = re.compile(
        r"(?:src|href)=[\"'](?P<url>(?:(?:https?:)?//|/)[^\"']+\.(?:webp|png|jpe?g))(?:\?[^\"']*)?[\"']",
        flags=re.IGNORECASE,
    )
    for match in attr_pattern.finditer(html):
        url = match.group("url")
        if url.startswith("//"):
            url = "https:" + url
        elif url.startswith("/"):
            url = urllib.parse.urljoin(base_url, url)
        found.append(url)

    # Match escaped JSON-like URLs: https:\/\/cdn.example.com\/img.webp
    escaped_pattern = re.compile(
        r"https?:\\/\\/[^\"'\s]+?\.(?:webp|png|jpe?g)",
        flags=re.IGNORECASE,
    )
    for match in escaped_pattern.finditer(html):
        found.append(match.group(0).replace("\\/", "/"))

    return found


def _file_name_from_url(url: str) -> str:
    path = urllib.parse.urlparse(url).path
    return Path(path).name


def _infer_card_id_from_name(file_name: str) -> str:
    match = re.match(r"^(\d{1,3})(?:[_\-.]|$)", file_name)
    return match.group(1) if match else ""


def _normalize_official_card_id(card_id: str) -> str:
    value = (card_id or "").strip()
    if "/" in value:
        value = value.split("/", 1)[0]
    match = re.search(r"\d+", value)
    return match.group(0) if match else ""


def parse_official_entries_from_html(html: str, page_url: str):
    raw_urls = _extract_image_urls_from_html(html, page_url)

    # Keep image candidates likely related to cards, avoid generic site assets.
    card_like_urls = []
    for url in raw_urls:
        lower = url.lower()
        if "card" in lower or "gallery" in lower or "naruto" in lower:
            card_like_urls.append(url)

    deduped = sorted(set(card_like_urls))
    rows = []
    for url in deduped:
        file_name = _file_name_from_url(url)
        if not file_name:
            continue
        rows.append(
            {
                "file_name": file_name,
                "source_url": url,
                "card_id": _infer_card_id_from_name(file_name),
                "rank": "",
                "name": "",
                "source": "official",
            }
        )
    return rows


def parse_official_entries_from_api(payload, preferred_lang: str):
    # API shape observed: list with one element {"Title": ..., "Cards": [...]}
    cards = []
    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict) and isinstance(item.get("Cards"), list):
                cards.extend(item["Cards"])
    elif isinstance(payload, dict) and isinstance(payload.get("Cards"), list):
        cards = payload["Cards"]

    rows = []
    seen_urls = set()
    for card in cards:
        image_url = (card.get("Image") or "").strip()
        if not image_url or image_url in seen_urls:
            continue

        langs = card.get("Langs") if isinstance(card.get("Langs"), list) else []
        if preferred_lang and langs and preferred_lang not in langs:
            continue

        title = (card.get("Title") or "").strip()
        version = (card.get("Version") or "").strip()
        display_name = f"{title} - {version}" if title and version else (title or version)

        seen_urls.add(image_url)
        rows.append(
            {
                "file_name": _file_name_from_url(image_url),
                "source_url": image_url,
                "card_id": _normalize_official_card_id(card.get("ID") or ""),
                "rank": (card.get("Rarity") or "").strip(),
                "name": display_name,
                "source": "official",
            }
        )

    return rows


def download_entries(entries, target: Path, *, dry_run: bool, limit: int | None):
    rows = []
    effective_entries = entries[:limit] if limit and limit > 0 else entries

    for entry in effective_entries:
        out_path = target / entry["file_name"]
        if dry_run:
            rows.append(entry)
            continue

        try:
            request = urllib.request.Request(entry["source_url"], headers=REQUEST_HEADERS)
            with urllib.request.urlopen(request, timeout=45) as response:
                data = response.read()
            out_path.write_bytes(data)
        except Exception as exc:
            print(f"skip {entry['source_url']} -> {exc}")
            continue
        rows.append(entry)

    return rows


def parse_args():
    parser = argparse.ArgumentParser(description="Download Naruto Mythos card images")
    parser.add_argument(
        "--source",
        choices=sorted(SOURCES.keys()),
        default="capsulecorp",
        help="Image source to use",
    )
    parser.add_argument(
        "--output-dir",
        default="",
        help="Optional output directory; defaults to Base/images/<source default folder>",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional max number of images to process",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only build manifest entries without downloading image files",
    )
    parser.add_argument(
        "--keep-existing",
        action="store_true",
        help="Do not clear target folder before running",
    )
    parser.add_argument(
        "--official-lang",
        default="en",
        help="Preferred language filter for official API cards (default: en)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_cfg = SOURCES[args.source]

    repo_base = Path(__file__).resolve().parents[2]
    if args.output_dir:
        target = Path(args.output_dir)
    else:
        target = repo_base / "Base" / "images" / source_cfg["default_folder"]

    target.mkdir(parents=True, exist_ok=True)

    if not args.keep_existing:
        # Remove previous files extracted from prior runs.
        for p in target.iterdir():
            if p.is_file():
                p.unlink()

    if args.source == "capsulecorp":
        try:
            html = fetch_html(source_cfg["page_url"])
        except Exception as exc:
            print(f"Error loading source page ({source_cfg['page_url']}): {exc}")
            return 1
        entries = parse_capsulecorp_entries(html, source_cfg["uploads_base"])
    else:
        entries = []
        api_url = source_cfg.get("api_url", "")
        if api_url:
            try:
                payload = fetch_json(api_url)
                entries = parse_official_entries_from_api(payload, args.official_lang)
            except Exception as exc:
                print(f"Official API unavailable ({api_url}): {exc}")

        # Fallback parser from page HTML, useful if API changes.
        if not entries:
            try:
                html = fetch_html(source_cfg["page_url"])
            except Exception as exc:
                print(f"Error loading source page ({source_cfg['page_url']}): {exc}")
                return 1
            entries = parse_official_entries_from_html(html, source_cfg["page_url"])

    rows = download_entries(
        entries,
        target,
        dry_run=args.dry_run,
        limit=args.limit if args.limit > 0 else None,
    )

    manifest = target / "manifest.csv"
    with manifest.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["file_name", "source_url", "card_id", "rank", "name", "source"],
        )
        writer.writeheader()
        writer.writerows(rows)

    action = "Prepared" if args.dry_run else "Downloaded"
    print(f"{action} {len(rows)} card images from {args.source} to: {target}")
    return 0 if rows else 1


if __name__ == "__main__":
    raise SystemExit(main())
