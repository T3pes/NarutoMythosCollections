import csv
import os

# Configurazione
csv_path = r'C:/Users/flavi/IdeaProjects/NarutoMythosCollection/src/data/cards_supabase.csv'
temp_path = r'C:/Users/flavi/IdeaProjects/NarutoMythosCollection/src/data/cards_supabase_updated.csv'
url_prefix = 'https://ekfwchaoknmsfpqocwsg.supabase.co/storage/v1/object/public/MythosCards%201%20edition/'

def get_file_name(old_url):
    # Prende solo il nome file, anche se ci sono parametri o path
    return old_url.split('/')[-1].split('?')[0]

with open(csv_path, encoding='utf-8') as fin, open(temp_path, 'w', newline='', encoding='utf-8') as fout:
    reader = csv.DictReader(fin)
    fieldnames = reader.fieldnames
    writer = csv.DictWriter(fout, fieldnames=fieldnames)
    writer.writeheader()
    for row in reader:
        old_url = row['image_url']
        if old_url:
            file_name = get_file_name(old_url)
            row['image_url'] = url_prefix + file_name
        writer.writerow(row)

os.replace(temp_path, csv_path)
print('CSV aggiornato con i nuovi URL Supabase!')
