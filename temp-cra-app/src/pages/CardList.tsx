import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/AuthContext';

function CardList() {
  const { user } = useAuth();
  const [userCards, setUserCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserCards() {
      setLoading(true);
      setError(null);
      if (!user) {
        setUserCards([]);
        setLoading(false);
        return;
      }
      // Prendi tutte le carte possedute dall'utente
      const { data, error } = await supabase
        .from('user_cards')
        .select('card_id, version, cards (id, name, image_url, rarity, type, version, set)')
        .eq('user_id', user.id);
      if (error) {
        setError('Errore nel caricamento delle carte utente');
        setLoading(false);
        return;
      }
      setUserCards(data ?? []);
      setLoading(false);
    }
    loadUserCards();
  }, [user]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-1">Le tue carte</h2>
      {loading && <div>Caricamento carte...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {userCards.map((uc) => (
            <article key={`${uc.card_id}-${uc.version}`} className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">#{uc.cards.id}</div>
              <h3 className="font-semibold text-sm mb-2">{uc.cards.name}</h3>
              {uc.cards.image_url ? (
                <img
                  src={uc.cards.image_url}
                  alt={`Carta ${uc.cards.id} - ${uc.cards.name}`}
                  className="w-full h-52 object-cover rounded mb-2 bg-gray-100"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-52 rounded mb-2 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                  Immagine non disponibile
                </div>
              )}
              <div className="text-xs text-gray-700">Rarità: <strong>{uc.cards.rarity}</strong></div>
              <div className="text-xs text-gray-700">Tipo: <strong>{uc.cards.type}</strong></div>
              <div className="text-xs text-gray-700">Versione: <strong>{uc.version}</strong></div>
              <div className="text-xs text-gray-700">Set: <strong>{uc.cards.set}</strong></div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default CardList;
