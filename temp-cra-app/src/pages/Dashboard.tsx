import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/AuthContext';

const VERSIONS = ['normale', 'fullart', 'holo'];

interface CardGroup {
  key: string;
  card: any;
  versions: { [version: string]: string }; // version → serial_id
}

function Dashboard() {
  const { user } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [userCards, setUserCards] = useState<{ card_uuid: string; version: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState<string>('');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<{ [groupKey: string]: string[] }>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError(null);
      const { data: allCards, error: err1 } = await supabase
        .from('cards').select('*').order('id', { ascending: true });
      if (err1) { setError('Errore nel caricamento delle carte'); setLoading(false); return; }
      setCards(allCards ?? []);
      if (!user) {
        setUserCards([]);
        setLoading(false);
        return;
      }
      const { data: uc } = await supabase
        .from('user_cards').select('card_uuid, version').eq('user_id', user.id);
      setUserCards(uc ?? []);
      setLoading(false);
    }
    loadAll();
  }, [user]);

  // Pre-popola selezioni dai dati salvati
  useEffect(() => {
    if (cards.length === 0) return;
    const newVersions: { [groupKey: string]: string[] } = {};
    const newSelected: string[] = [];
    userCards.forEach(uc => {
      const card = cards.find(c => c.serial_id === uc.card_uuid);
      if (!card) return;
      const groupKey = String(card.id) + '-' + card.name;
      if (!newVersions[groupKey]) newVersions[groupKey] = [];
      if (!newVersions[groupKey].includes(uc.version)) newVersions[groupKey].push(uc.version);
      if (!newSelected.includes(groupKey)) newSelected.push(groupKey);
    });
    setSelectedVersions(newVersions);
    setSelectedCards(newSelected);
  }, [userCards, cards]);

  const showVersions = (rarity: string) =>
    rarity === 'C' || rarity === 'UC' || rarity === 'Common' || rarity === 'Uncommon';

  const filteredCards = rarityFilter ? cards.filter(c => c.rarity === rarityFilter) : cards;

  // Raggruppa per id+nome (una card per carta fisica)
  const groupedCards: CardGroup[] = (() => {
    const groups: { [key: string]: CardGroup } = {};
    filteredCards.forEach(card => {
      const key = String(card.id) + '-' + card.name;
      if (!groups[key]) groups[key] = { key, card, versions: {} };
      if (card.version && card.serial_id) groups[key].versions[card.version] = card.serial_id;
    });
    return Object.values(groups);
  })();

  const handleSelectAll = () => {
    if (selectedCards.length === groupedCards.length && groupedCards.length > 0) {
      setSelectedCards([]);
    } else {
      setSelectedCards(groupedCards.map(g => g.key));
    }
  };

  const handleSelectCard = (groupKey: string) => {
    setSelectedCards(prev =>
      prev.includes(groupKey) ? prev.filter(k => k !== groupKey) : [...prev, groupKey]
    );
  };

  const handleVersionToggle = (groupKey: string, version: string) => {
    setSelectedVersions(prev => {
      const versions = prev[groupKey] || [];
      return versions.includes(version)
        ? { ...prev, [groupKey]: versions.filter(v => v !== version) }
        : { ...prev, [groupKey]: [...versions, version] };
    });
  };

  const handleSaveSelection = async () => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      const toSave: { user_id: string; card_uuid: string; version: string }[] = [];
      selectedCards.forEach(groupKey => {
        const group = groupedCards.find(g => g.key === groupKey);
        if (!group) return;
        if (showVersions(group.card.rarity)) {
          // C/UC: salva le versioni selezionate in basso
          (selectedVersions[groupKey] || []).forEach(version => {
            const serialId = group.versions[version];
            if (serialId) toSave.push({ user_id: user.id, card_uuid: serialId, version });
          });
        } else {
          // Altre carte: salva il serial_id con la versione della carta
          const serialId = group.card.serial_id;
          if (serialId) toSave.push({ user_id: user.id, card_uuid: serialId, version: group.card.version ?? 'normale' });
        }
      });

      const { error: delError } = await supabase.from('user_cards').delete().eq('user_id', user.id);
      if (delError) {
        console.error('Errore eliminazione:', delError);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
        return;
      }
      if (toSave.length > 0) {
        const { error: insError } = await supabase.from('user_cards').insert(toSave);
        if (insError) {
          console.error('Errore inserimento:', insError);
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 3000);
          return;
        }
        setUserCards(toSave);
      } else {
        setUserCards([]);
      }
      setSaveStatus('ok');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Errore salvataggio:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Tutte le carte</h1>
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <label className="text-sm">
          Filtra per rarità:
          <select className="ml-2 border rounded px-2 py-1 text-sm" value={rarityFilter} onChange={e => setRarityFilter(e.target.value)}>
            <option value="">Tutte</option>
            {Array.from(new Set(cards.map(card => card.rarity))).filter(Boolean).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <button className="ml-4 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 border border-orange-300" onClick={handleSelectAll}>
          {selectedCards.length === groupedCards.length && groupedCards.length > 0 ? 'Deseleziona tutti' : 'Seleziona tutti'}
        </button>
        <button
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 border border-blue-300 disabled:opacity-50"
          onClick={handleSaveSelection}
          disabled={!user || selectedCards.length === 0 || saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Salvataggio...' : saveStatus === 'ok' ? '✓ Salvato!' : saveStatus === 'error' ? '✗ Errore' : 'Salva selezione'}
        </button>
      </div>
      {loading && <div>Caricamento carte...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {groupedCards.length === 0 && <div className="col-span-full text-gray-500">Nessuna carta trovata.</div>}
          {groupedCards.map(({ key, card }) => (
            <article key={key} className="border rounded-lg p-3 bg-white flex flex-col items-center">
              <div className="flex items-center w-full mb-1">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selectedCards.includes(key)}
                    onChange={() => handleSelectCard(key)}
                    className="accent-orange-600"
                  />
                  <span className="text-xs text-gray-500">#{card.id}</span>
                </label>
              </div>
              <h3 className="font-semibold text-sm mb-2 text-center">{card.name}</h3>
              {card.image_url ? (
                <a href={card.image_url} target="_blank" rel="noopener noreferrer" className="block w-full">
                  <img src={card.image_url} alt={`Carta ${card.id} - ${card.name}`}
                    className="w-auto h-64 mx-auto rounded mb-2 bg-gray-100 object-contain"
                    style={{ maxHeight: 260, maxWidth: '100%' }} loading="lazy" />
                </a>
              ) : (
                <div className="w-full h-64 rounded mb-2 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                  Immagine non disponibile
                </div>
              )}
              <div className="text-xs text-gray-700">Rarità: <strong>{card.rarity}</strong></div>
              <div className="text-xs text-gray-700">Tipo: <strong>{card.type}</strong></div>
              {!showVersions(card.rarity) && (
                <div className="text-xs text-gray-700">Versione: <strong>{card.version}</strong></div>
              )}
              <div className="text-xs text-gray-700">Set: <strong>{card.set}</strong></div>
              {showVersions(card.rarity) && (
                <div className="mt-2 flex gap-2">
                  {VERSIONS.map(v => (
                    <label key={v} className={`flex items-center gap-1 text-xs ${!selectedCards.includes(key) ? 'opacity-40' : ''}`}>
                      <input
                        type="checkbox"
                        checked={(selectedVersions[key] || []).includes(v)}
                        onChange={() => handleVersionToggle(key, v)}
                        disabled={!selectedCards.includes(key)}
                      />
                      {v}
                    </label>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
