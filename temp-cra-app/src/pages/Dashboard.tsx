import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

type EditionPreset = 'set1_ed1' | 'set1_ed2' | 'set2_ed1';

const EDITION_PRESETS: EditionPreset[] = ['set1_ed1', 'set1_ed2', 'set2_ed1'];
const TABLE_BY_PRESET: Record<EditionPreset, string> = {
  set1_ed1: 'cards',
  set1_ed2: 'cards_2ed',
  set2_ed1: 'Card_shiren',
};

function editionPresetLabel(preset: EditionPreset): string {
  if (preset === 'set1_ed1') return 'Set 1: Konoha Shido 1ed';
  if (preset === 'set1_ed2') return 'Set 1: Konoha Shido 2ed';
  return 'Set 2: Shinobi Shiren 1ed';
}

function Dashboard() {
  const navigate = useNavigate();
  const { collectionId } = useParams<{ collectionId: string }>();
  const [counts, setCounts] = useState<Record<EditionPreset, number>>({
    set1_ed1: 0,
    set1_ed2: 0,
    set2_ed1: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCounts() {
      setLoading(true);
      setError(null);

      const nextCounts: Record<EditionPreset, number> = {
        set1_ed1: 0,
        set1_ed2: 0,
        set2_ed1: 0,
      };

      for (const preset of EDITION_PRESETS) {
        const tableName = TABLE_BY_PRESET[preset];
        const { data, error: tableError } = await supabase.from(tableName).select('id');

        if (tableError) {
          setError(`Errore nel caricamento tabella ${tableName}`);
          setLoading(false);
          return;
        }

        nextCounts[preset] = data?.length ?? 0;
      }

      setCounts(nextCounts);
      setLoading(false);
    }

    loadCounts();
  }, []);

  const openPreset = (preset: EditionPreset) => {
    if (!collectionId) {
      setError('Collezione non trovata');
      return;
    }
    navigate(`/collection/${collectionId}/cards?preset=${preset}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center text-gray-300">
        Caricamento set...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-white tracking-wider mb-2">🃏 Seleziona il set</h1>
        <p className="text-gray-400 text-sm">Scegli il set da aprire</p>
      </div>

      <div className="flex flex-wrap gap-8 justify-center">
        {EDITION_PRESETS.map(preset => {
          const isSet2 = preset === 'set2_ed1';
          return (
            <button
              key={preset}
              onClick={() => openPreset(preset)}
              className={`group relative flex flex-col items-center bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 border-transparent transition-all duration-200 overflow-hidden w-64 cursor-pointer ${
                isSet2 ? 'hover:border-blue-400' : 'hover:border-orange-400'
              }`}
            >
              <div className={`w-full px-4 py-8 text-center ${isSet2 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                <h2 className="text-lg font-bold text-gray-800 mb-1">{editionPresetLabel(preset)}</h2>
                <p className={`text-sm font-semibold ${isSet2 ? 'text-blue-700' : 'text-orange-700'}`}>
                  {counts[preset]} carte
                </p>
              </div>
              <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                Apri →
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Dashboard;
