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
  // Stato delle versioni selezionate per ogni carta (checkbox in basso)
  const [selectedVersions, setSelectedVersions] = useState<{ [cardUuid: string]: string[] }>({});

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

  useEffect(() => {
    // Pre-seleziona le versioni possedute per ogni carta selezionata
    const versionsMap: { [cardUuid: string]: string[] } = {};
    userCards.forEach(uc => {
      if (!versionsMap[uc.card_uuid]) versionsMap[uc.card_uuid] = [];
      versionsMap[uc.card_uuid].push(uc.version);
    });
    setSelectedVersions(versionsMap);
  }, [userCards]);

  // Usa cardUuid: string invece di cardId: number
  // const hasCardVersion = (cardUuid: string, version: string) =>
  //   userCards.some((uc: any) => uc.card_uuid === cardUuid && uc.version === version);

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

  // Aggiorna la selezione delle versioni per una carta
  const handleVersionToggle = (cardUuid: string, version: string) => {
    setSelectedVersions(prev => {
      const versions = prev[cardUuid] || [];
      if (versions.includes(version)) {
        return { ...prev, [cardUuid]: versions.filter(v => v !== version) };
      } else {
        return { ...prev, [cardUuid]: [...versions, version] };
      }
    });
  };

  // Salva la selezione: per ogni carta selezionata, salvo solo le versioni selezionate in basso
  const handleSaveSelection = async () => {
    if (!user) return;
    // Costruisci la lista completa delle coppie carta+versione da salvare
    const toSave = selectedCards.flatMap(cardUuid =>
      (selectedVersions[cardUuid] || []).map(version => ({ user_id: user.id, card_uuid: cardUuid, version }))
    );
    // Rimuovi tutte le user_cards dell'utente
    await supabase.from('user_cards').delete().eq('user_id', user.id);
    // Inserisci solo quelle selezionate
    if (toSave.length > 0) {
      await supabase.from('user_cards').insert(toSave);
      setUserCards(toSave);
    } else {
      setUserCards([]);
    }
  };

  // Determina se mostrare la tripletta di versioni (solo per C/UC/Common/Uncommon)
  const showVersions = (rarity: string) =>
    rarity === 'C' || rarity === 'UC' || rarity === 'Common' || rarity === 'Uncommon';

  // Filtra le carte per rarità se selezionato
  const filteredCards = rarityFilter
    ? cards.filter((card) => card.rarity === rarityFilter)
    : cards;

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
        <button
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 border border-blue-300"
          onClick={handleSaveSelection}
          disabled={!user || selectedCards.length === 0}
        >Salva selezione</button>
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
                {showVersions(card.rarity) && (
                  VERSIONS.map((v) => (
                    <label key={v} className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={(selectedVersions[card.card_uuid] || []).includes(v)}
                        onChange={() => handleVersionToggle(card.card_uuid, v)}
                        disabled={!selectedCards.includes(card.card_uuid)}
                      />
                      {v}
                    </label>
                  ))
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
