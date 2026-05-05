-- ============================================================
-- Aggiorna tutte le image_url nella tabella cards
-- dal vecchio CDN capsulecorpgear.com → Supabase Storage
-- ============================================================

UPDATE cards
SET image_url = REPLACE(
    image_url,
    'https://capsulecorpgear.com/wp-content/uploads/',
    'https://ekfwchaoknmsfpqocwsg.supabase.co/storage/v1/object/public/MythosCards%201%20edition/'
)
WHERE image_url LIKE 'https://capsulecorpgear.com/%';

-- Verifica risultato
SELECT COUNT(*) AS carte_aggiornate
FROM cards
WHERE image_url LIKE 'https://ekfwchaoknmsfpqocwsg.supabase.co/%';

