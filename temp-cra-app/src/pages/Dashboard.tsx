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
  const [rarityFilter, setRarityFilter] = useState<string>('');
  // Selezione univoca tramite card_uuid (una sola checkbox per carta)
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  // Azione di massa: aggiungi/rimuovi versione selezionata a tutte le carte selezionate
  const [massVersion, setMassVersion] = useState<string>('');

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError(null);
      // Carica tutte le carte ordinate per id crescente
      const { data: allCards, error: err1 } = await supabase.from('cards').select('*').order('id', { ascending: true });
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

  // Usa cardUuid: string invece di cardId: number
  const hasCardVersion = (cardUuid: string, version: string) =>
    userCards.some((uc: any) => uc.card_uuid === cardUuid && uc.version === version);

  const handleToggle = async (cardUuid: string, version: string) => {
    if (!user) return;
    const exists = hasCardVersion(cardUuid, version);
    if (exists) {
      // Rimuovi
      await supabase.from('user_cards').delete().match({ user_id: user.id, card_uuid: cardUuid, version });
      setUserCards((prev: any[]) => prev.filter((uc) => !(uc.card_uuid === cardUuid && uc.version === version)));
    } else {
      // Aggiungi
      await supabase.from('user_cards').insert([{ user_id: user.id, card_uuid: cardUuid, version }]);
      setUserCards((prev: any[]) => [...prev, { user_id: user.id, card_uuid: cardUuid, version }]);
    }
  };

  // Filtra le carte per rarità se selezionato
  const filteredCards = rarityFilter
    ? cards.filter((card) => card.rarity === rarityFilter)
    : cards;

  // Seleziona/deseleziona tutte le carte visibili
  const handleSelectAll = () => {
    if (selectedCards.length === filteredCards.length) {
      setSelectedCards([]);
    } else {
      setSelectedCards(filteredCards.map(card => card.card_uuid));
    }
  }

  // Seleziona/deseleziona una singola carta
  const handleSelectCard = (cardUuid: string) => {
    setSelectedCards((prev) =>
      prev.includes(cardUuid) ? prev.filter((id) => id !== cardUuid) : [...prev, cardUuid]
    );
  }

  // Azione di massa: aggiungi la versione selezionata a tutte le carte selezionate
  const handleMassAdd = async () => {
    if (!user || !massVersion) return;
    // Filtra solo le carte selezionate che non hanno già la versione
    const toAdd = selectedCards.filter(cardUuid => !hasCardVersion(cardUuid, massVersion));
    if (toAdd.length === 0) return;
    await supabase.from('user_cards').insert(
      toAdd.map(cardUuid => ({ user_id: user.id, card_uuid: cardUuid, version: massVersion }))
    );
    setUserCards(prev => ([...prev, ...toAdd.map(cardUuid => ({ user_id: user.id, card_uuid: cardUuid, version: massVersion }))]));
  };
  // Azione di massa: rimuovi la versione selezionata da tutte le carte selezionate
  const handleMassRemove = async () => {
    if (!user || !massVersion) return;
    await supabase.from('user_cards').delete().in('card_uuid', selectedCards).eq('user_id', user.id).eq('version', massVersion);
    setUserCards(prev => prev.filter(uc => !(selectedCards.includes(uc.card_uuid) && uc.version === massVersion)));
  };

  // Determina se mostrare la tripletta di versioni (solo per C/UC/Common/Uncommon)
  const showVersions = (rarity: string) =>
    rarity === 'C' || rarity === 'UC' || rarity === 'Common' || rarity === 'Uncommon';

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Tutte le carte</h1>
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <label className="text-sm">
          Filtra per rarità:
          <select
            className="ml-2 border rounded px-2 py-1 text-sm"
            value={rarityFilter}
            onChange={e => setRarityFilter(e.target.value)}
          >
            <option value="">Tutte</option>
            {Array.from(new Set(cards.map(card => card.rarity))).filter(Boolean).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <button
          className="ml-4 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 border border-orange-300"
          onClick={handleSelectAll}
        >
          {selectedCards.length === filteredCards.length && filteredCards.length > 0 ? 'Deseleziona tutti' : 'Seleziona tutti'}
        </button>
        <label className="text-sm ml-4">
          Azione di massa:
          <select
            className="ml-2 border rounded px-2 py-1 text-sm"
            value={massVersion}
            onChange={e => setMassVersion(e.target.value)}
          >
            <option value="">Seleziona versione</option>
            {VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <button
          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 border border-green-300"
          onClick={handleMassAdd}
          disabled={!user || !massVersion || selectedCards.length === 0}
        >Aggiungi versione a selezionate</button>
        <button
          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 border border-red-300"
          onClick={handleMassRemove}
          disabled={!user || !massVersion || selectedCards.length === 0}
        >Rimuovi versione da selezionate</button>
      </div>
      {loading && <div>Caricamento carte...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filteredCards.length === 0 && <div className="col-span-full text-gray-500">Nessuna carta trovata.</div>}
          {filteredCards.map(card => (
            <article key={`${card.id}-${card.name}-${card.version}`} className={`border rounded-lg p-3 bg-white flex flex-col items-center`}>
              <div className="flex items-center w-full justify-between mb-1">
                {/* Checkbox di selezione singola per la carta (non per versione) */}
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selectedCards.includes(card.card_uuid)}
                    onChange={() => handleSelectCard(card.card_uuid)}
                    className="accent-orange-600"
                  />
                  <span className="text-xs text-gray-500">#{card.id}</span>
                </label>
              </div>
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
                {showVersions(card.rarity) ? (
                  VERSIONS.map((v) => (
                    <label key={v} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={hasCardVersion(card.card_uuid, v)}
                        onChange={() => handleToggle(card.card_uuid, v)}
                        disabled={!user}
                      />
                      {v}
                    </label>
                  ))
                ) : (
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={hasCardVersion(card.card_uuid, card.version)}
                      onChange={() => handleToggle(card.card_uuid, card.version)}
                      disabled={!user}
                    />
                    {card.version}
                  </label>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
