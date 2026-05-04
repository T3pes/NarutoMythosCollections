import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/AuthContext';

function Dashboard() {
  const { user, signOut } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCards() {
      setLoading(true);
      setError(null);
      if (!user) {
        setCards([]);
        setLoading(false);
        return;
      }
      // Carica solo le carte collezionate dall'utente (esempio: campo user_id)
      // Se non hai user_id, mostra tutte le carte
      const { data, error } = await supabase.from('cards').select('*');
      if (error) {
        setError('Errore nel caricamento delle carte');
        setLoading(false);
        return;
      }
      setCards(data ?? []);
      setLoading(false);
    }
    loadCards();
  }, [user]);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Le tue carte</h1>
      {user && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm">{user.email}</span>
          <button
            className="ml-2 px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
            onClick={signOut}
          >
            Logout
          </button>
        </div>
      )}
      {loading && <div>Caricamento carte...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(card => (
            <article key={`${card.id}-${card.name}-${card.version}`} className="border rounded-lg p-3 bg-white">
              <div className="text-xs text-gray-500 mb-1">#{card.id}</div>
              <h3 className="font-semibold text-sm mb-2">{card.name}</h3>
              {card.image_url ? (
                <img
                  src={card.image_url}
                  alt={`Carta ${card.id} - ${card.name}`}
                  className="w-full h-52 object-cover rounded mb-2 bg-gray-100"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-52 rounded mb-2 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                  Immagine non disponibile
                </div>
              )}
              <div className="text-xs text-gray-700">Rarità: <strong>{card.rarity}</strong></div>
              <div className="text-xs text-gray-700">Tipo: <strong>{card.type}</strong></div>
              <div className="text-xs text-gray-700">Versione: <strong>{card.version}</strong></div>
              <div className="text-xs text-gray-700">Set: <strong>{card.set}</strong></div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
