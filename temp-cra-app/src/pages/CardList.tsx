import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

type CardRow = Record<string, unknown>;

type CardView = {
  id: string;
  name: string;
  imageUrl: string;
  rarity: string;
  type: string;
  version: string;
  setName: string;
};

function asText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function normalizeCardRow(row: CardRow): CardView {
  const id = asText(row.id ?? row.card_number ?? row.cardNumber, '-');
  const name = asText(row.name ?? row.title, 'Carta senza nome');
  const imageUrl = asText(row.image_url ?? row.imageUrl ?? row.image, '');
  const rarity = asText(row.rarity, '-');
  const type = asText(row.type ?? row.category, '-');
  const version = asText(row.version ?? row.variant, '-');
  const setName = asText(row.set ?? row.set_name ?? row.setName, '-');

  return { id, name, imageUrl, rarity, type, version, setName };
}

function CardList() {
  const [cards, setCards] = useState<CardView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    async function loadCards() {
      setLoading(true);
      setError(null);
      setErrorDetails('');

      const { data, error } = await supabase.from('cards').select('*');
      if (error) {
        if (error.code === 'PGRST205') {
          setError('Tabella public.cards non trovata su Supabase.');
          setErrorDetails(
            'Crea la tabella in schema public e verifica che il progetto Supabase configurato nelle variabili ambiente sia quello corretto.'
          );
        } else {
          setError('Impossibile caricare le carte da Supabase.');
          setErrorDetails(`${error.code ?? 'UNKNOWN'} - ${error.message}`);
        }
        setLoading(false);
        return;
      }

      const normalized = ((data ?? []) as CardRow[]).map(normalizeCardRow);
      normalized.sort((a, b) => Number(a.id) - Number(b.id));
      setCards(normalized);
      setLoading(false);
    }

    loadCards();
  }, []);

  const total = useMemo(() => cards.length, [cards]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-1">Lista Carte</h2>
      <p className="text-sm text-gray-600 mb-4">Totale carte caricate: {total}</p>

      {loading && <div className="text-sm">Caricamento carte...</div>}
      {error && (
        <div className="text-sm text-red-600 mb-3">
          <div>{error}</div>
          {errorDetails && <div className="mt-1 text-xs text-red-500">{errorDetails}</div>}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(card => (
            <article key={`${card.id}-${card.name}-${card.version}`} className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">#{card.id}</div>
              <h3 className="font-semibold text-sm mb-2">{card.name}</h3>

              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  alt={`Carta ${card.id} - ${card.name}`}
                  className="w-full h-52 object-cover rounded mb-2 bg-gray-100"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-52 rounded mb-2 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                  Immagine non disponibile
                </div>
              )}

              <div className="text-xs text-gray-700">Rarita`: <strong>{card.rarity}</strong></div>
              <div className="text-xs text-gray-700">Tipo: <strong>{card.type}</strong></div>
              <div className="text-xs text-gray-700">Versione: <strong>{card.version}</strong></div>
              <div className="text-xs text-gray-700">Set: <strong>{card.setName}</strong></div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default CardList;

