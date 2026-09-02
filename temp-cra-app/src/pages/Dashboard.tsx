import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

type EditionPreset = 'set1_ed1' | 'set1_ed2' | 'set2_ed1';

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


function isSecondEdition(text: string): boolean {
  return /\b2\s*ed\b/.test(text) || text.includes('2nd') || text.includes('second') || text.includes('seconda');
}

function matchesEditionPreset(card: any, preset: EditionPreset): boolean {
  const setText = normalizeText(card?.set);
  const inSet1 = setText.includes('set 1') && setText.includes('konoha');
  const inSet2 = setText.includes('set 2') && setText.includes('shinobi');

  // Nel DB alcune carte Set 1 non riportano esplicitamente "1 ed".
  if (preset === 'set1_ed1') return inSet1 && !isSecondEdition(setText);
  if (preset === 'set1_ed2') return inSet1 && isSecondEdition(setText);
  // Set 2 nel dataset spesso non espone esplicitamente il marker edizione.
  if (preset === 'set2_ed1') return inSet2 && !isSecondEdition(setText);
  return true;
}

function editionPresetLabel(preset: EditionPreset): string {
  if (preset === 'set1_ed1') return 'Set 1: Konoha Shido 1ed';
  if (preset === 'set1_ed2') return 'Set 1: Konoha Shido 2ed';
  if (preset === 'set2_ed1') return 'Set 2: Shinobi Shiren 1ed';
  return '';
}

const EDITION_PRESETS: EditionPreset[] = ['set1_ed1', 'set1_ed2', 'set2_ed1'];

function Dashboard() {
  const navigate = useNavigate();
  const { collectionId } = useParams<{ collectionId: string }>();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCards() {
      setLoading(true);
      setError(null);
      const { data: allCards, error: err1 } = await supabase
        .from('cards').select('*').order('id', { ascending: true });
      if (err1) {
        setError('Errore nel caricamento delle carte');
        setLoading(false);
        return;
      }
      setCards(allCards ?? []);
      setLoading(false);
    }
    loadCards();
  }, []);

  const countByPreset = (preset: EditionPreset) => cards.filter(card => matchesEditionPreset(card, preset)).length;

  const openPreset = (preset: EditionPreset) => {
    if (!collectionId) return;
    navigate(`/collection/${collectionId}/cards?preset=${preset}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-white tracking-wider mb-2">🃏 Seleziona il set</h1>
        <p className="text-gray-400 text-sm">Scegli il set e apri la vista completa con filtri e liste</p>
      </div>

      {loading && <div className="text-gray-300">Caricamento set...</div>}
      {error && <div className="text-red-300">{error}</div>}

      {!loading && !error && (
        <div className="flex flex-wrap gap-8 justify-center">
          {EDITION_PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => openPreset(preset)}
              className={`group relative flex flex-col items-center bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 border-transparent transition-all duration-200 overflow-hidden w-64 cursor-pointer ${
                preset === 'set2_ed1' ? 'hover:border-blue-400' : 'hover:border-orange-400'
              }`}
            >
              <div className={`w-full px-4 py-8 text-center ${preset === 'set2_ed1' ? 'bg-blue-50' : 'bg-orange-50'}`}>
                <h2 className="text-lg font-bold text-gray-800 mb-1">{editionPresetLabel(preset)}</h2>
                <p className={`text-sm font-semibold ${preset === 'set2_ed1' ? 'text-blue-700' : 'text-orange-700'}`}>
                  {countByPreset(preset)} carte
                </p>
              </div>
              <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                Apri →
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
