import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/AuthContext';

type Tab = 'possedute' | 'mancanti' | 'lista';

function CardList() {
  const { user } = useAuth();
  const [allCards, setAllCards] = useState<any[]>([]);
  const [ownedUuids, setOwnedUuids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('possedute');
  const [rarityFilter, setRarityFilter] = useState<string>('');
  const [versionFilter, setVersionFilter] = useState<string>('');
  const [setFilter, setSetFilter] = useState<string>('');
  const [listRarityFilter, setListRarityFilter] = useState('');
  const [listVersionFilter, setListVersionFilter] = useState('');
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const { data: cards, error: err1 } = await supabase
        .from('cards')
        .select('*')
        .order('id', { ascending: true });
      if (err1) { setError('Errore caricamento carte'); setLoading(false); return; }
      setAllCards(cards ?? []);

      if (!user) { setOwnedUuids(new Set()); setLoading(false); return; }

      const { data: uc, error: err2 } = await supabase
        .from('user_cards')
        .select('card_uuid')
        .eq('user_id', user.id);
      if (err2) { setError('Errore caricamento collezione'); setLoading(false); return; }
      setOwnedUuids(new Set((uc ?? []).map((r: any) => r.card_uuid)));
      setLoading(false);
    }
    load();
  }, [user]);

  const handleRemove = async (cardUuid: string) => {
    if (!user) return;
    const { error: err } = await supabase
      .from('user_cards')
      .delete()
      .match({ user_id: user.id, card_uuid: cardUuid });
    if (!err) {
      setOwnedUuids(prev => {
        const next = new Set(Array.from(prev));
        next.delete(cardUuid);
        return next;
      });
    } else {
      console.error('Errore rimozione:', err);
    }
  };

  const handleAdd = async (card: any) => {
    if (!user) return;
    const { error: err } = await supabase
      .from('user_cards')
      .insert({ user_id: user.id, card_uuid: card.serial_id, version: card.version ?? 'normale' });
    if (!err) {
      setOwnedUuids(prev => new Set(Array.from(prev).concat(card.serial_id)));
    } else {
      console.error('Errore aggiunta:', err);
    }
  };

  const handleAddSelected = async () => {
    if (!user || selectedUuids.size === 0) return;
    setSaving(true);
    const toInsert = allCards
      .filter(c => selectedUuids.has(c.serial_id))
      .map(c => ({ user_id: user.id, card_uuid: c.serial_id, version: c.version ?? 'normale' }));
    const { error: err } = await supabase.from('user_cards').insert(toInsert);
    if (!err) {
      setOwnedUuids(prev => new Set([...Array.from(prev), ...Array.from(selectedUuids)]));
      setSelectedUuids(new Set());
    } else {
      console.error('Errore aggiunta multipla:', err);
    }
    setSaving(false);
  };

  const toggleSelect = (uuid: string) => {
    setSelectedUuids(prev => {
      const next = new Set(Array.from(prev));
      next.has(uuid) ? next.delete(uuid) : next.add(uuid);
      return next;
    });
  };

  const toggleSelectAll = (cards: any[]) => {
    const allSelected = cards.every(c => selectedUuids.has(c.serial_id));
    if (allSelected) {
      setSelectedUuids(new Set());
    } else {
      setSelectedUuids(new Set(cards.map(c => c.serial_id)));
    }
  };

  const ownedCards = allCards.filter(c => ownedUuids.has(c.serial_id));
  const missingCards = allCards.filter(c => !ownedUuids.has(c.serial_id));
  const displayCards = tab === 'possedute' ? ownedCards : missingCards;

  const rarities = Array.from(new Set(displayCards.map(c => c.rarity).filter(Boolean)));
  const versions = Array.from(new Set(displayCards.map(c => c.version).filter(Boolean)));
  const sets = Array.from(new Set(displayCards.map(c => c.set).filter(Boolean)));

  const filtered = displayCards.filter(c =>
    (!rarityFilter || c.rarity === rarityFilter) &&
    (!versionFilter || c.version === versionFilter) &&
    (!setFilter || c.set === setFilter)
  );

  const resetFilters = () => {
    setRarityFilter('');
    setVersionFilter('');
    setSetFilter('');
  };

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
      tab === t
        ? 'border-orange-500 text-orange-600 bg-white'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 bg-gray-100'
    }`;

  // --- Export CSV (aperto da Excel) ---
  const handleExportExcel = () => {
    const headers = ['#', 'Nome', 'Rarita', 'Versione', 'Tipo', 'Set'];
    const rows = missingCards.map(c => [
      c.id,
      `"${(c.name ?? '').replace(/"/g, '""')}"`,
      c.rarity ?? '',
      c.version ?? '',
      c.type ?? '',
      `"${(c.set ?? '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'carte_mancanti.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Filtri per tabella lista mancanti ---
  const listRarities = Array.from(new Set(missingCards.map(c => c.rarity).filter(Boolean)));
  const listVersions = Array.from(new Set(missingCards.map(c => c.version).filter(Boolean)));
  const filteredMissingList = missingCards.filter(c =>
    (!listRarityFilter || c.rarity === listRarityFilter) &&
    (!listVersionFilter || c.version === listVersionFilter)
  );


  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-3">La tua collezione</h2>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        <button className={tabClass('possedute')} onClick={() => { setTab('possedute'); resetFilters(); }}>
          ✅ Carte possedute
          {!loading && <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{ownedCards.length}</span>}
        </button>
        <button className={tabClass('mancanti')} onClick={() => { setTab('mancanti'); resetFilters(); }}>
          ❌ Carte mancanti
          {!loading && <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{missingCards.length}</span>}
        </button>
        <button className={tabClass('lista')} onClick={() => { setTab('lista'); resetFilters(); }}>
          📋 Lista acquisti
          {!loading && <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{missingCards.length}</span>}
        </button>
      </div>

      {/* Statistiche */}
      {!loading && (
        <div className="flex gap-4 mb-4 text-xs text-gray-500">
          <span>Totale: <strong className="text-gray-700">{allCards.length}</strong></span>
          <span>Possedute: <strong className="text-green-600">{ownedCards.length}</strong></span>
          <span>Mancanti: <strong className="text-red-500">{missingCards.length}</strong></span>
          <span>Completamento: <strong className="text-orange-600">
            {allCards.length > 0 ? Math.round((ownedCards.length / allCards.length) * 100) : 0}%
          </strong></span>
        </div>
      )}

      {loading && <div>Caricamento carte...</div>}
      {!loading && error && <div className="text-red-600">{error}</div>}

      {/* Tab: Lista acquisti */}
      {!loading && !error && tab === 'lista' && (
        <div>
          {/* Toolbar filtri + export */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <label className="text-sm">
              Rarità:
              <select className="ml-2 border rounded px-2 py-1 text-sm" value={listRarityFilter} onChange={e => setListRarityFilter(e.target.value)}>
                <option value="">Tutte</option>
                {listRarities.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="text-sm">
              Versione:
              <select className="ml-2 border rounded px-2 py-1 text-sm" value={listVersionFilter} onChange={e => setListVersionFilter(e.target.value)}>
                <option value="">Tutte</option>
                {listVersions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <span className="text-xs text-gray-500">{filteredMissingList.length} carte</span>
            {selectedUuids.size > 0 && (
              <button
                onClick={handleAddSelected}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 disabled:opacity-40"
              >
                {saving ? '...' : `✅ Aggiungi selezionate (${selectedUuids.size})`}
              </button>
            )}
            <button
              onClick={handleExportExcel}
              disabled={missingCards.length === 0}
              className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ⬇ Scarica CSV (Excel)
            </button>
          </div>

          {/* Tabella */}
          {filteredMissingList.length === 0 ? (
            <div className="text-gray-500 py-8 text-center">🎉 Collezione completa!</div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm bg-white">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 w-8">
                      <input
                        type="checkbox"
                        checked={filteredMissingList.length > 0 && filteredMissingList.every(c => selectedUuids.has(c.serial_id))}
                        onChange={() => toggleSelectAll(filteredMissingList)}
                        title="Seleziona tutti"
                      />
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 w-12">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Nome</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Rarità</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Versione</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Tipo</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Set</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMissingList.map((card, i) => (
                    <tr
                      key={card.serial_id}
                      className={`border-b border-gray-100 ${selectedUuids.has(card.serial_id) ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedUuids.has(card.serial_id)}
                          onChange={() => toggleSelect(card.serial_id)}
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{card.id}</td>
                      <td className="px-3 py-2 font-medium text-gray-800">{card.name}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">{card.rarity}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{card.version ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{card.type}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{card.set}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleAdd(card)}
                          className="text-green-500 hover:text-green-700 text-lg font-bold leading-none"
                          title="Aggiungi alla collezione"
                        >＋</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Possedute / Mancanti (griglia card) */}
      {!loading && !error && tab !== 'lista' && (
        <>
          {/* Filtri */}
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
            <label className="text-sm">
              Set:
              <select className="ml-2 border rounded px-2 py-1 text-sm" value={setFilter} onChange={e => setSetFilter(e.target.value)}>
                <option value="">Tutti</option>
                {sets.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <span className="ml-auto text-xs text-gray-500">{filtered.length} {tab === 'possedute' ? 'possedute' : 'mancanti'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {filtered.length === 0 && (
              <div className="col-span-full text-gray-500">
                {tab === 'possedute'
                  ? (ownedCards.length === 0 ? 'Nessuna carta posseduta.' : 'Nessuna carta corrisponde ai filtri.')
                  : (missingCards.length === 0 ? '🎉 Collezione completa!' : 'Nessuna carta corrisponde ai filtri.')}
              </div>
            )}
            {filtered.map(card => (
              <article
                key={card.serial_id}
                className={`border-2 rounded-lg p-3 bg-white flex flex-col items-center ${
                  tab === 'possedute' ? 'border-green-500' : 'border-red-300 opacity-80'
                }`}
              >
                <div className="flex items-center w-full mb-1">
                  <span className="text-xs text-gray-500">#{card.id}</span>
                  {card.version && (
                    <span className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                      {card.version}
                    </span>
                  )}
                  {tab === 'possedute' && (
                    <button
                      onClick={() => handleRemove(card.serial_id)}
                      className="ml-2 text-red-400 hover:text-red-600 text-xs"
                      title="Rimuovi dalla collezione"
                    >🗑</button>
                  )}
                  {tab === 'mancanti' && (
                    <button
                      onClick={() => handleAdd(card)}
                      className="ml-2 text-green-500 hover:text-green-700 font-bold text-base leading-none"
                      title="Aggiungi alla collezione"
                    >＋</button>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-2 text-center">{card.name}</h3>
                {card.image_url ? (
                  <a href={card.image_url} target="_blank" rel="noopener noreferrer" className="block w-full">
                    <img
                      src={card.image_url}
                      alt={`Carta ${card.id} - ${card.name}`}
                      className={`w-auto h-64 mx-auto rounded mb-2 bg-gray-100 object-contain ${tab === 'mancanti' ? 'grayscale' : ''}`}
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
        </>
      )}
    </div>
  );
}

export default CardList;
