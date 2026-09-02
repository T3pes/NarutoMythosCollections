import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/AuthContext';

type EditionPreset = '' | 'set1_ed1' | 'set1_ed2' | 'set2_ed1';

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isFirstEdition(text: string): boolean {
  return /\b1\s*ed\b/.test(text) || text.includes('1st') || text.includes('first') || text.includes('prima');
}

function isSecondEdition(text: string): boolean {
  return /\b2\s*ed\b/.test(text) || text.includes('2nd') || text.includes('second') || text.includes('seconda');
}

function matchesEditionPreset(card: any, preset: EditionPreset): boolean {
  if (!preset) return true;

  const setText = normalizeText(card?.set);
  const inSet1 = setText.includes('set 1') && setText.includes('konoha');
  const inSet2 = setText.includes('set 2') && setText.includes('shinobi');

  if (preset === 'set1_ed1') return inSet1 && isFirstEdition(setText);
  if (preset === 'set1_ed2') return inSet1 && isSecondEdition(setText);
  if (preset === 'set2_ed1') return inSet2 && isFirstEdition(setText);
  return true;
}

function editionPresetLabel(preset: EditionPreset): string {
  if (preset === 'set1_ed1') return 'Set 1: Konoha Shido 1ed';
  if (preset === 'set1_ed2') return 'Set 1: Konoha Shido 2ed';
  if (preset === 'set2_ed1') return 'Set 2: Shinobi Shiren 1ed';
  return '';
}

function Dashboard() {
  const { user } = useAuth();
  const [cards, setCards] = useState<any[]>([]);
  const [userCardUuids, setUserCardUuids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState<string>('');
  const [versionFilter, setVersionFilter] = useState<string>('');
  const [editionPreset, setEditionPreset] = useState<EditionPreset>('');
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      setError(null);
      const { data: allCards, error: err1 } = await supabase
        .from('cards').select('*').order('id', { ascending: true });
      if (err1) { setError('Errore nel caricamento delle carte'); setLoading(false); return; }
      setCards(allCards ?? []);
      if (!user) { setLoading(false); return; }
      const { data: uc } = await supabase
        .from('user_cards').select('card_uuid').eq('user_id', user.id);
      setUserCardUuids(new Set((uc ?? []).map((r: any) => r.card_uuid)));
      setLoading(false);
    }
    loadAll();
  }, [user]);

  const rarities = Array.from(new Set(cards.map(c => c.rarity).filter(Boolean)));
  const versions = Array.from(new Set(cards.map(c => c.version).filter(Boolean)));

  const filteredCards = cards.filter(c =>
    matchesEditionPreset(c, editionPreset) &&
    (!rarityFilter || c.rarity === rarityFilter) &&
    (!versionFilter || c.version === versionFilter)
  );
  const set1Ed1Count = cards.filter(c => matchesEditionPreset(c, 'set1_ed1')).length;
  const set1Ed2Count = cards.filter(c => matchesEditionPreset(c, 'set1_ed2')).length;
  const set2Ed1Count = cards.filter(c => matchesEditionPreset(c, 'set2_ed1')).length;

  const handleSelectAll = () => {
    const currentIds = filteredCards.map(c => c.serial_id).filter(Boolean);
    const allSelected = currentIds.every(id => selectedCards.includes(id)) && currentIds.length > 0;
    if (allSelected) {
      setSelectedCards(prev => prev.filter(id => !currentIds.includes(id)));
    } else {
      setSelectedCards(prev => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const handleSelectCard = (serialId: string) => {
    setSelectedCards(prev =>
      prev.includes(serialId) ? prev.filter(id => id !== serialId) : [...prev, serialId]
    );
  };

  const handleSaveSelection = async () => {
    if (!user) return;
    setSaveStatus('saving');
    try {
      const toAdd = selectedCards
        .map(serialId => cards.find(c => c.serial_id === serialId))
        .filter(Boolean)
        .filter(card => !userCardUuids.has(card.serial_id))
        .map(card => ({
          user_id: user.id,
          card_uuid: card.serial_id,
          version: card.version ?? 'normale',
        }));

      if (toAdd.length > 0) {
        const { error: insError } = await supabase.from('user_cards').insert(toAdd);
        if (insError) {
          console.error('Errore inserimento:', insError);
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('idle'), 3000);
          return;
        }
        setUserCardUuids(prev => new Set([...Array.from(prev), ...toAdd.map(r => r.card_uuid)]));
      }
      setSaveStatus('ok');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (e) {
      console.error('Errore salvataggio:', e);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const allVisibleSelected =
    filteredCards.length > 0 &&
    filteredCards.every(c => selectedCards.includes(c.serial_id));

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Tutte le carte</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <button
          type="button"
          onClick={() => setEditionPreset('set1_ed1')}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold text-left transition-colors ${
            editionPreset === 'set1_ed1'
              ? 'bg-orange-600 text-white border-orange-700'
              : 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100'
          }`}
        >
          Set 1: Konoha Shido 1ed ({set1Ed1Count})
        </button>
        <button
          type="button"
          onClick={() => setEditionPreset('set1_ed2')}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold text-left transition-colors ${
            editionPreset === 'set1_ed2'
              ? 'bg-orange-600 text-white border-orange-700'
              : 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100'
          }`}
        >
          Set 1: Konoha Shido 2ed ({set1Ed2Count})
        </button>
        <button
          type="button"
          onClick={() => setEditionPreset('set2_ed1')}
          className={`rounded-lg border px-3 py-2 text-sm font-semibold text-left transition-colors ${
            editionPreset === 'set2_ed1'
              ? 'bg-blue-600 text-white border-blue-700'
              : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
          }`}
        >
          Set 2: Shinobi Shiren 1ed ({set2Ed1Count})
        </button>
      </div>
      {editionPreset && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 font-medium text-orange-800">
            Filtro attivo: {editionPresetLabel(editionPreset)}
          </span>
        </div>
      )}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <label className="text-sm">
          Rarità:
          <select className="ml-2 border rounded px-2 py-1 text-sm" value={rarityFilter} onChange={e => setRarityFilter(e.target.value)}>
            <option value="">Tutte</option>
            {rarities.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="text-sm">
          Versione:
          <select className="ml-2 border rounded px-2 py-1 text-sm" value={versionFilter} onChange={e => setVersionFilter(e.target.value)}>
            <option value="">Tutte</option>
            {versions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <button
          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
          onClick={() => setEditionPreset('')}
        >
          Mostra tutte le edizioni
        </button>
        <button
          className="ml-2 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 border border-orange-300"
          onClick={handleSelectAll}
        >
          {allVisibleSelected ? 'Deseleziona visibili' : 'Seleziona visibili'}
        </button>
        <button
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 border border-blue-300 disabled:opacity-50"
          onClick={handleSaveSelection}
          disabled={!user || selectedCards.length === 0 || saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Salvataggio...' : saveStatus === 'ok' ? '✓ Salvato!' : saveStatus === 'error' ? '✗ Errore' : 'Salva selezione'}
        </button>
        <span className="ml-auto text-xs text-gray-500">{filteredCards.length} carte · {selectedCards.length} selezionate</span>
      </div>
      {loading && <div>Caricamento carte...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filteredCards.length === 0 && <div className="col-span-full text-gray-500">Nessuna carta trovata.</div>}
          {filteredCards.map(card => (
            <article
              key={card.serial_id}
              className={`border-2 rounded-lg p-3 bg-white flex flex-col items-center ${userCardUuids.has(card.serial_id) ? 'border-green-500' : 'border-gray-200'}`}
            >
              <div className="flex items-center w-full mb-1">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCards.includes(card.serial_id)}
                    onChange={() => handleSelectCard(card.serial_id)}
                    className="accent-orange-600"
                  />
                  <span className="text-xs text-gray-500">#{card.id}</span>
                </label>
                {card.version && (
                  <span className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                    {card.version}
                  </span>
                )}
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
              <div className="text-xs text-gray-700">Set: <strong>{card.set}</strong></div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
