import csv

# Configurazione
manifest_path = r'C:/Users/flavi/IdeaProjects/NarutoMythosCollection/Base/images/prima_edizione/manifest.csv'
output_path = r'C:/Users/flavi/IdeaProjects/NarutoMythosCollection/src/data/cards_supabase.csv'
set_name = 'Prima Edizione'

# Mappatura rank -> type
rank_to_type = {
    'Mission': 'Mission',
    'M': 'Ninja', 'C': 'Ninja', 'UC': 'Ninja', 'R': 'Ninja', 'RA': 'Ninja', 'S': 'Ninja', 'SV': 'Ninja', 'L': 'Ninja',
}

def parse_id(card_id):
    # Esempio: '001/130' -> 1, 'MSS 01' -> 1, '0' -> 0
    if '/' in card_id:
        return int(card_id.split('/')[0].lstrip('0'))
    if card_id.startswith('MSS'):
        return int(card_id.split()[1])
    try:
        return int(card_id.lstrip('0'))
    except Exception:
        return card_id

with open(manifest_path, encoding='utf-8') as fin, open(output_path, 'w', newline='', encoding='utf-8') as fout:
    reader = csv.DictReader(fin)
    writer = csv.writer(fout)
    writer.writerow(['id','name','image_url','set','rarity','type','version'])
    for row in reader:
        card_id = parse_id(row['card_id'])
        name = row['name']
        image_url = row['source_url']
        rarity = row['rank']
        type_ = rank_to_type.get(row['rank'], '')
        version = ''
        writer.writerow([card_id, name, image_url, set_name, rarity, type_, version])
print('CSV generato correttamente!')

