import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/AuthContext';

type Tab = 'possedute' | 'mancanti' | 'lista' | 'in_arrivo';
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
  const [editionPreset, setEditionPreset] = useState<EditionPreset>('');
  const [listRarityFilter, setListRarityFilter] = useState('');
  const [listVersionFilter, setListVersionFilter] = useState('');
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set());
  const [pendingUuids, setPendingUuids] = useState<Set<string>>(new Set());
  const [selectedPendingUuids, setSelectedPendingUuids] = useState<Set<string>>(new Set());
  const [pendingRarityFilter, setPendingRarityFilter] = useState('');
  const [pendingVersionFilter, setPendingVersionFilter] = useState('');
  const [useSupabasePending, setUseSupabasePending] = useState(true);
  const [pendingSyncWarning, setPendingSyncWarning] = useState<string | null>(null);
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

      const { data: pc, error: err3 } = await supabase
        .from('pending_cards')
        .select('card_uuid')
        .eq('user_id', user.id);
      if (err3) {
        // Fallback locale finché la tabella pending_cards non viene creata su Supabase.
        setUseSupabasePending(false);
        setPendingSyncWarning('Lista in attesa salvata solo su questo dispositivo. Per sincronizzare tra PC e smartphone esegui lo script SQL di setup pending_cards su Supabase.');
        const savedPending = localStorage.getItem(`pending_cards_${user.id}`);
        if (savedPending) {
          try {
            const parsed = JSON.parse(savedPending);
            setPendingUuids(new Set(Array.isArray(parsed) ? parsed : []));
          } catch {
            setPendingUuids(new Set());
          }
        } else {
          setPendingUuids(new Set());
        }
      } else {
        setUseSupabasePending(true);
        setPendingSyncWarning(null);
        const remotePending = new Set((pc ?? []).map((r: any) => r.card_uuid));

        // Migra eventuali carte in attesa locali nel cloud quando disponibile.
        const savedPending = localStorage.getItem(`pending_cards_${user.id}`);
        if (savedPending) {
          try {
            const parsed = JSON.parse(savedPending);
            const localPending = Array.isArray(parsed) ? parsed : [];
            const mergedPending = Array.from(new Set([...Array.from(remotePending), ...localPending]));

            if (mergedPending.length > 0) {
              const rows = mergedPending.map(cardUuid => ({ user_id: user.id, card_uuid: cardUuid }));
              const { error: migrateErr } = await supabase
                .from('pending_cards')
                .upsert(rows, { onConflict: 'user_id,card_uuid' });

              if (!migrateErr) {
                setPendingUuids(new Set(mergedPending));
                localStorage.removeItem(`pending_cards_${user.id}`);
              } else {
                setPendingUuids(remotePending);
                console.error('Errore migrazione pending locale -> cloud:', migrateErr);
              }
            } else {
              setPendingUuids(remotePending);
            }
          } catch {
            setPendingUuids(remotePending);
          }
        } else {
          setPendingUuids(remotePending);
        }
      }

      setLoading(false);
    }
    load();
  }, [user]);

  useEffect(() => {
    if (!user || useSupabasePending) return;
    localStorage.setItem(`pending_cards_${user.id}`, JSON.stringify(Array.from(pendingUuids)));
  }, [pendingUuids, user, useSupabasePending]);

  useEffect(() => {
    setPendingUuids(prev => new Set(Array.from(prev).filter(uuid => !ownedUuids.has(uuid))));
  }, [ownedUuids]);

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

  const handleMoveSelectedToPending = async () => {
    if (selectedUuids.size === 0) return;
    const toMove = Array.from(selectedUuids);
    if (user && useSupabasePending) {
      setSaving(true);
      const rows = toMove.map(cardUuid => ({ user_id: user.id, card_uuid: cardUuid }));
      const { error: err } = await supabase
        .from('pending_cards')
        .upsert(rows, { onConflict: 'user_id,card_uuid' });
      if (err) {
        console.error('Errore inserimento in attesa:', err);
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    setPendingUuids(prev => new Set([...Array.from(prev), ...toMove]));
    setSelectedUuids(new Set());
    setTab('in_arrivo');
  };

  const handleMoveSingleToPending = async (cardUuid: string) => {
    if (pendingUuids.has(cardUuid)) return;
    if (user && useSupabasePending) {
      setSaving(true);
      const { error: err } = await supabase
        .from('pending_cards')
        .upsert([{ user_id: user.id, card_uuid: cardUuid }], { onConflict: 'user_id,card_uuid' });
      if (err) {
        console.error('Errore inserimento singolo in attesa:', err);
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    setPendingUuids(prev => new Set(Array.from(prev).concat(cardUuid)));
  };

  const handleImportPendingToOwned = async () => {
    if (!user || selectedPendingUuids.size === 0) return;
    setSaving(true);
    const selectedPending = Array.from(selectedPendingUuids);
    const toInsert = allCards
      .filter(c => selectedPendingUuids.has(c.serial_id))
      .map(c => ({ user_id: user.id, card_uuid: c.serial_id, version: c.version ?? 'normale' }));
    const { error: err } = await supabase.from('user_cards').insert(toInsert);
    if (!err) {
      if (useSupabasePending) {
        const { error: pendingDeleteErr } = await supabase
          .from('pending_cards')
          .delete()
          .eq('user_id', user.id)
          .in('card_uuid', selectedPending);
        if (pendingDeleteErr) {
          console.error('Errore pulizia carte in attesa:', pendingDeleteErr);
        }
      }
      setOwnedUuids(prev => new Set([...Array.from(prev), ...selectedPending]));
      setPendingUuids(prev => new Set(Array.from(prev).filter(uuid => !selectedPending.includes(uuid))));
      setSelectedPendingUuids(new Set());
    } else {
      console.error('Errore importazione in possedute:', err);
    }
    setSaving(false);
  };

  const handleRemoveSelectedFromPending = async () => {
    if (selectedPendingUuids.size === 0) return;
    const selectedPending = Array.from(selectedPendingUuids);
    if (user && useSupabasePending) {
      setSaving(true);
      const { error: err } = await supabase
        .from('pending_cards')
        .delete()
        .eq('user_id', user.id)
        .in('card_uuid', selectedPending);
      if (err) {
        console.error('Errore rimozione dalla lista in attesa:', err);
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    setPendingUuids(prev => new Set(Array.from(prev).filter(uuid => !selectedPending.includes(uuid))));
    setSelectedPendingUuids(new Set());
  };

  const toggleSelect = (uuid: string) => {
    if (pendingUuids.has(uuid)) return;
    setSelectedUuids(prev => {
      const next = new Set(Array.from(prev));
      next.has(uuid) ? next.delete(uuid) : next.add(uuid);
      return next;
    });
  };

  const toggleSelectAll = (cards: any[]) => {
    const selectableCards = cards.filter(c => !pendingUuids.has(c.serial_id));
    const allSelected = selectableCards.length > 0 && selectableCards.every(c => selectedUuids.has(c.serial_id));
    if (allSelected) {
      setSelectedUuids(new Set());
    } else {
      setSelectedUuids(new Set(selectableCards.map(c => c.serial_id)));
    }
  };

  const togglePendingSelect = (uuid: string) => {
    setSelectedPendingUuids(prev => {
      const next = new Set(Array.from(prev));
      next.has(uuid) ? next.delete(uuid) : next.add(uuid);
      return next;
    });
  };

  const togglePendingSelectAll = (cards: any[]) => {
    const allSelected = cards.every(c => selectedPendingUuids.has(c.serial_id));
    if (allSelected) {
      setSelectedPendingUuids(new Set());
    } else {
      setSelectedPendingUuids(new Set(cards.map(c => c.serial_id)));
    }
  };

  const ownedCardsAll = allCards.filter(c => ownedUuids.has(c.serial_id));
  const missingCardsAll = allCards.filter(c => !ownedUuids.has(c.serial_id));
  const pendingCardsAll = allCards.filter(c => pendingUuids.has(c.serial_id) && !ownedUuids.has(c.serial_id));

  const ownedCards = ownedCardsAll.filter(c => matchesEditionPreset(c, editionPreset));
  const missingCards = missingCardsAll.filter(c => matchesEditionPreset(c, editionPreset));
  const pendingCards = pendingCardsAll.filter(c => matchesEditionPreset(c, editionPreset));

  const cardsForPresetCounters = tab === 'possedute'
    ? ownedCardsAll
    : tab === 'in_arrivo'
      ? pendingCardsAll
      : missingCardsAll;
  const set1Ed1Count = cardsForPresetCounters.filter(c => matchesEditionPreset(c, 'set1_ed1')).length;
  const set1Ed2Count = cardsForPresetCounters.filter(c => matchesEditionPreset(c, 'set1_ed2')).length;
  const set2Ed1Count = cardsForPresetCounters.filter(c => matchesEditionPreset(c, 'set2_ed1')).length;
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

  const pendingRarities = Array.from(new Set(pendingCards.map(c => c.rarity).filter(Boolean)));
  const pendingVersions = Array.from(new Set(pendingCards.map(c => c.version).filter(Boolean)));
  const filteredPendingList = pendingCards.filter(c =>
    (!pendingRarityFilter || c.rarity === pendingRarityFilter) &&
    (!pendingVersionFilter || c.version === pendingVersionFilter)
  );
  const allFilteredPendingSelected =
    filteredPendingList.length > 0 && filteredPendingList.every(c => selectedPendingUuids.has(c.serial_id));

  const openTab = (nextTab: Tab) => {
    setTab(nextTab);
    resetFilters();
    setListRarityFilter('');
    setListVersionFilter('');
    setPendingRarityFilter('');
    setPendingVersionFilter('');
    setSelectedUuids(new Set());
    setSelectedPendingUuids(new Set());
  };


  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-3">La tua collezione</h2>

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

      <div className="mb-3">
        <button
          type="button"
          onClick={() => setEditionPreset('')}
          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
        >
          Mostra tutte le edizioni
        </button>
      </div>

      {editionPreset && (
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 font-medium text-orange-800">
            Filtro attivo: {editionPresetLabel(editionPreset)}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-4">
        <button className={tabClass('possedute')} onClick={() => openTab('possedute')}>
          ✅ Carte possedute
          {!loading && <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{ownedCards.length}</span>}
        </button>
        <button className={tabClass('mancanti')} onClick={() => openTab('mancanti')}>
          ❌ Carte mancanti
          {!loading && <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{missingCards.length}</span>}
        </button>
        <button className={tabClass('lista')} onClick={() => openTab('lista')}>
          📋 Lista acquisti
          {!loading && <span className="ml-1 text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">{missingCards.length}</span>}
        </button>
        <button className={tabClass('in_arrivo')} onClick={() => openTab('in_arrivo')}>
          📦 In attesa di arrivo
          {!loading && <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">{pendingCards.length}</span>}
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
      {!loading && !error && pendingSyncWarning && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {pendingSyncWarning}
        </div>
      )}

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
                onClick={handleMoveSelectedToPending}
                disabled={saving}
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white text-sm font-semibold rounded hover:bg-amber-700 disabled:opacity-40"
              >
                {saving ? 'Spostamento...' : `📦 Metti in attesa (${selectedUuids.size})`}
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
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 w-16">Carta</th>
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
                    (() => {
                      const isPending = pendingUuids.has(card.serial_id);
                      return (
                    <tr
                      key={card.serial_id}
                      className={`border-b border-gray-100 ${isPending ? 'bg-yellow-50' : selectedUuids.has(card.serial_id) ? 'bg-green-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedUuids.has(card.serial_id)}
                          disabled={isPending}
                          onChange={() => toggleSelect(card.serial_id)}
                        />
                      </td>
                      <td className="px-3 py-2 text-gray-400 text-xs">{card.id}</td>
                      <td className="px-3 py-2">
                        {card.image_url ? (
                          <img
                            src={card.image_url}
                            alt={`Miniatura ${card.id} - ${card.name}`}
                            className="h-12 w-8 rounded object-cover bg-gray-100"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-12 w-8 rounded bg-gray-100 text-[10px] text-gray-400 flex items-center justify-center">
                            —
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800">{card.name}</td>
                      <td className="px-3 py-2">
                        <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">{card.rarity}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{card.version ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{card.type}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{card.set}</td>
                      <td className="px-3 py-2 text-center">
                        {isPending ? (
                          <span className="text-yellow-700 text-xs font-semibold">in attesa</span>
                        ) : (
                          <button
                            onClick={() => handleMoveSingleToPending(card.serial_id)}
                            disabled={saving}
                            className="text-amber-600 hover:text-amber-800 text-lg font-bold leading-none disabled:opacity-40"
                            title="Metti in attesa di arrivo"
                          >📦</button>
                        )}
                      </td>
                    </tr>
                      );
                    })()
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: In attesa di arrivo */}
      {!loading && !error && tab === 'in_arrivo' && (
        <div>
          {pendingCards.length === 0 ? (
            <div className="text-gray-500 py-8 text-center">Nessuna carta in attesa di arrivo.</div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 mb-4 items-center">
                <label className="text-sm">
                  Rarità:
                  <select className="ml-2 border rounded px-2 py-1 text-sm" value={pendingRarityFilter} onChange={e => setPendingRarityFilter(e.target.value)}>
                    <option value="">Tutte</option>
                    {pendingRarities.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  Versione:
                  <select className="ml-2 border rounded px-2 py-1 text-sm" value={pendingVersionFilter} onChange={e => setPendingVersionFilter(e.target.value)}>
                    <option value="">Tutte</option>
                    {pendingVersions.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
                <span className="text-xs text-gray-500">{filteredPendingList.length} carte</span>
                <button
                  onClick={() => togglePendingSelectAll(filteredPendingList)}
                  disabled={filteredPendingList.length === 0}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {allFilteredPendingSelected ? 'Deseleziona tutti' : 'Seleziona tutti'}
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm bg-white">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 w-8">
                        <input
                          type="checkbox"
                          checked={allFilteredPendingSelected}
                          onChange={() => togglePendingSelectAll(filteredPendingList)}
                          title="Seleziona tutti"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 w-12">#</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 w-16">Carta</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Nome</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Rarità</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Versione</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Tipo</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600">Set</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingList.map((card, i) => (
                      <tr
                        key={card.serial_id}
                        className={`border-b border-gray-100 ${selectedPendingUuids.has(card.serial_id) ? 'bg-yellow-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50`}
                      >
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedPendingUuids.has(card.serial_id)}
                            onChange={() => togglePendingSelect(card.serial_id)}
                          />
                        </td>
                        <td className="px-3 py-2 text-gray-400 text-xs">{card.id}</td>
                        <td className="px-3 py-2">
                          {card.image_url ? (
                            <img
                              src={card.image_url}
                              alt={`Miniatura ${card.id} - ${card.name}`}
                              className="h-12 w-8 rounded object-cover bg-gray-100"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-12 w-8 rounded bg-gray-100 text-[10px] text-gray-400 flex items-center justify-center">
                              —
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-800">{card.name}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700">{card.rarity}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{card.version ?? '—'}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{card.type}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{card.set}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleRemoveSelectedFromPending}
                  disabled={saving || selectedPendingUuids.size === 0}
                  className="mr-2 flex items-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm font-semibold rounded hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Attendi...' : `🗑 Rimuovi selezionate (${selectedPendingUuids.size})`}
                </button>
                <button
                  onClick={handleImportPendingToOwned}
                  disabled={saving || selectedPendingUuids.size === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Importazione...' : `✅ Importa nelle carte possedute (${selectedPendingUuids.size})`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Possedute / Mancanti (griglia card) */}
      {!loading && !error && (tab === 'possedute' || tab === 'mancanti') && (
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
