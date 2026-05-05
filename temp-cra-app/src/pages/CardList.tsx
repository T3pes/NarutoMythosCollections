import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../auth/AuthContext';

function CardList() {
  const { user } = useAuth();
  const [userCards, setUserCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState<string>('');
  const [versionFilter, setVersionFilter] = useState<string>('');
  const [setFilter, setSetFilter] = useState<string>('');

  useEffect(() => {
    async function loadUserCards() {
      setLoading(true);
      setError(null);
      if (!user) { setUserCards([]); setLoading(false); return; }
      // user_cards.card_uuid → cards.serial_id (nuovo schema)
      const { data, error: err } = await supabase
        .from('user_cards')
        .select('card_uuid, version, cards:card_uuid(serial_id, id, name, image_url, rarity, type, version, set)')
        .eq('user_id', user.id);
      if (err) { setError('Errore nel caricamento delle carte utente'); setLoading(false); return; }
      const normalized = (data ?? []).map((uc: any) => ({
        ...uc,
        cards: Array.isArray(uc.cards) ? uc.cards[0] : uc.cards
      }));
      setUserCards(normalized);
      setLoading(false);
    }
    loadUserCards();
  }, [user]);

  // Valori unici per i filtri
  const rarities = Array.from(new Set(userCards.map(uc => uc.cards?.rarity).filter(Boolean)));
  const versions = Array.from(new Set(userCards.map(uc => uc.version).filter(Boolean)));
  const sets = Array.from(new Set(userCards.map(uc => uc.cards?.set).filter(Boolean)));

  const filtered = userCards.filter(uc =>
    (!rarityFilter || uc.cards?.rarity === rarityFilter) &&
    (!versionFilter || uc.version === versionFilter) &&
    (!setFilter || uc.cards?.set === setFilter)
  );

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Le tue carte</h2>
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
        <span className="ml-auto text-xs text-gray-500">{filtered.length} carta{filtered.length !== 1 ? 'e' : ''}</span>
      </div>
      {loading && <div>Caricamento carte...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {filtered.length === 0 && (
            <div className="col-span-full text-gray-500">
              {userCards.length === 0 ? 'Nessuna carta posseduta.' : 'Nessuna carta corrisponde ai filtri.'}
            </div>
          )}
          {filtered.map((uc) => (
            <article key={`${uc.card_uuid}-${uc.version}`} className="border rounded-lg p-3 bg-white flex flex-col items-center">
              <div className="flex items-center w-full mb-1">
                <span className="text-xs text-gray-500">#{uc.cards?.id ?? '-'}</span>
                <span className="ml-auto text-xs font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">{uc.version}</span>
              </div>
              <h3 className="font-semibold text-sm mb-2 text-center">{uc.cards?.name ?? 'Carta non trovata'}</h3>
              {uc.cards?.image_url ? (
                <a href={uc.cards.image_url} target="_blank" rel="noopener noreferrer" className="block w-full">
                  <img
                    src={uc.cards.image_url}
                    alt={`Carta ${uc.cards.id} - ${uc.cards.name}`}
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
              <div className="text-xs text-gray-700">Rarità: <strong>{uc.cards?.rarity ?? '-'}</strong></div>
              <div className="text-xs text-gray-700">Tipo: <strong>{uc.cards?.type ?? '-'}</strong></div>
              <div className="text-xs text-gray-700">Set: <strong>{uc.cards?.set ?? '-'}</strong></div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default CardList;
