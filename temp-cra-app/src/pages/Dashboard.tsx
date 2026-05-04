import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/AuthContext';

const VERSIONS = ['normale', 'fullart', 'holo'];

function Dashboard() {
  const { user } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [userCards, setUserCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError(null);
      // Carica tutte le carte
      const { data: allCards, error: err1 } = await supabase.from('cards').select('*');
      if (err1) {
        setError('Errore nel caricamento delle carte');
        setLoading(false);
        return;
      }
      setCards(allCards ?? []);
      // Carica le carte possedute dall'utente
      if (user) {
        const { data: uc } = await supabase
          .from('user_cards')
          .select('card_uuid, version')
          .eq('user_id', user.id);
        setUserCards(uc ?? []);
      } else {
        setUserCards([]);
      }
      setLoading(false);
    }
    loadAll();
  }, [user]);

  const hasCardVersion = (cardId: number, version: string) =>
    userCards.some((uc: any) => uc.card_uuid === cardId && uc.version === version);

  const handleToggle = async (cardId: number, version: string) => {
    if (!user) return;
    const exists = hasCardVersion(cardId, version);
    if (exists) {
      // Rimuovi
      await supabase.from('user_cards').delete().match({ user_id: user.id, card_uuid: cardId, version });
      setUserCards((prev: any[]) => prev.filter((uc) => !(uc.card_uuid === cardId && uc.version === version)));
    } else {
      // Aggiungi
      await supabase.from('user_cards').insert([{ user_id: user.id, card_uuid: cardId, version }]);
      setUserCards((prev: any[]) => [...prev, { user_id: user.id, card_uuid: cardId, version }]);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Tutte le carte</h1>
      {loading && <div>Caricamento carte...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {cards.length === 0 && <div className="col-span-full text-gray-500">Nessuna carta trovata.</div>}
          {cards.map(card => (
            <article key={`${card.id}-${card.name}-${card.version}`} className="border rounded-lg p-3 bg-white flex flex-col items-center">
              <div className="text-xs text-gray-500 mb-1">#{card.id}</div>
              <h3 className="font-semibold text-sm mb-2 text-center">{card.name}</h3>
              {card.image_url ? (
                <a href={card.image_url} target="_blank" rel="noopener noreferrer" className="block w-full">
                  <img
                    src={card.image_url}
                    alt={`Carta ${card.id} - ${card.name}`}
                    className="w-auto h-64 mx-auto rounded mb-2 bg-gray-100 object-contain"
                    style={{ maxHeight: 260, maxWidth: '100%' }}
                    loading="lazy"
                  />
                </a>
              ) : (
                <div className="w-full h-64 rounded mb-2 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                  Immagine non disponibile
                </div>
              )}
              <div className="text-xs text-gray-700">Rarità: <strong>{card.rarity}</strong></div>
              <div className="text-xs text-gray-700">Tipo: <strong>{card.type}</strong></div>
              <div className="text-xs text-gray-700">Versione: <strong>{card.version}</strong></div>
              <div className="text-xs text-gray-700">Set: <strong>{card.set}</strong></div>
              <div className="mt-2 flex gap-2">
                {VERSIONS.map((v) => (
                  <label key={v} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={hasCardVersion(card.id, v)}
                      onChange={() => handleToggle(card.id, v)}
                      disabled={!user}
                    />
                    {v}
                  </label>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
