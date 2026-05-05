"""
Script che legge i dati delle carte dal file HTML (base64),
li decodifica e genera un CSV con:
- 3 versioni (normale, full art, holo) per le carte C e UC
- 1 riga per le altre rarità
"""

import base64
import csv
import json
import re
import os

HTML_PATH = r'C:\Users\flavi\IdeaProjects\NarutoMythosCollection\Base\naruto_mythos_card_list.html'
OUTPUT_PATH = r'C:\Users\flavi\IdeaProjects\NarutoMythosCollection\Base\cards_v2.csv'

IMAGE_BASE_URL = 'https://capsulecorpgear.com/wp-content/uploads/'
SET_NAME = 'Prima Edizione'

# Versioni disponibili per C e UC
C_UC_VERSIONS = ['normale', 'full art', 'holo']

# Mappatura rank → rarity label leggibile
RANK_MAP = {
    'C': 'C',
    'UC': 'UC',
    'R': 'R',
    'RA': 'RA',
    'M': 'M',
    'S': 'S',
    'SV': 'SV',
    'L': 'L',
    'Mission': 'Mission',
}

# Mappatura rank → type
RANK_TYPE_MAP = {
    'C': 'Ninja', 'UC': 'Ninja', 'R': 'Ninja', 'RA': 'Ninja',
    'M': 'Ninja', 'S': 'Ninja', 'SV': 'Ninja', 'L': 'Ninja',
    'Mission': 'Mission',
}

def b64d(s: str) -> str:
    """Decodifica base64 → stringa UTF-8."""
    try:
        return base64.b64decode(s).decode('utf-8')
    except Exception:
        return s

def parse_id(raw_id: str) -> int | str:
    """Converte '001/130' → 1, 'MSS 01' → 1, '0' → 0."""
    if '/' in raw_id:
        try:
            return int(raw_id.split('/')[0].lstrip('0') or '0')
        except ValueError:
            return raw_id
    if raw_id.upper().startswith('MSS'):
        try:
            return int(raw_id.split()[1])
        except (IndexError, ValueError):
            return raw_id
    try:
        return int(raw_id.lstrip('0') or '0')
    except ValueError:
        return raw_id

# --- Leggi HTML e trova il blocco cards ---
with open(HTML_PATH, encoding='utf-8') as f:
    html = f.read()

match = re.search(r'let cards = (\[.*?\]);', html, re.DOTALL)
if not match:
    raise RuntimeError("Blocco 'let cards = [...]' non trovato nell'HTML")

cards_json = match.group(1)
raw_cards = json.loads(cards_json)

print(f"Carte trovate nell'HTML: {len(raw_cards)}")

# --- Genera CSV ---
seen_ids = {}  # per numerazione progressiva interna (non usata nel CSV)
rows = []

for card in raw_cards:
    raw_id   = b64d(card.get('id', ''))
    name     = b64d(card.get('name', ''))
    image    = b64d(card.get('image', ''))
    rank_raw = b64d(card.get('rank', ''))

    card_id  = parse_id(raw_id)
    rarity   = RANK_MAP.get(rank_raw, rank_raw)
    card_type = RANK_TYPE_MAP.get(rank_raw, 'Ninja')
    image_url = IMAGE_BASE_URL + image if image else ''

    if rarity in ('C', 'UC'):
        # 3 versioni per C e UC
        for version in C_UC_VERSIONS:
            rows.append({
                'id':        card_id,
                'name':      name,
                'image_url': image_url,
                'set':       SET_NAME,
                'rarity':    rarity,
                'type':      card_type,
                'version':   version,
            })
    else:
        # Per R, RA, M, L, S, SV, Mission → una sola riga
        # La "versione" leggibile viene dall'immagine stessa (es. ART per RA)
        version = ''
        rows.append({
            'id':        card_id,
            'name':      name,
            'image_url': image_url,
            'set':       SET_NAME,
            'rarity':    rarity,
            'type':      card_type,
            'version':   version,
        })

# --- Scrivi CSV ---
fieldnames = ['id', 'name', 'image_url', 'set', 'rarity', 'type', 'version']

with open(OUTPUT_PATH, 'w', newline='', encoding='utf-8') as fout:
    writer = csv.DictWriter(fout, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

# --- Statistiche ---
c_uc   = sum(1 for r in rows if r['rarity'] in ('C', 'UC'))
others = len(rows) - c_uc
print(f"\n✅  CSV generato: {OUTPUT_PATH}")
print(f"   Righe totali : {len(rows)}")
print(f"   C/UC (x3)    : {c_uc}")
print(f"   Altre        : {others}")

# Mostra un campione
print("\n--- Anteprima prime 9 righe (C e UC) ---")
for r in [x for x in rows if x['rarity'] in ('C', 'UC')][:9]:
    print(f"  id={r['id']:>4}  {r['rarity']:<3}  version={r['version']:<10}  {r['name']}")

