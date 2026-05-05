import React from 'react';
import { useNavigate } from 'react-router-dom';
import { COLLECTIONS, Collection, useCollection } from '../CollectionContext';

function CollectionCard({ collection }: { collection: Collection }) {
  const navigate = useNavigate();
  const { setActiveCollection } = useCollection();

  const handleSelect = () => {
    setActiveCollection(collection);
    navigate(`/collection/${collection.id}`);
  };

  return (
    <button
      onClick={handleSelect}
      className="group relative flex flex-col items-center bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 border-transparent hover:border-orange-400 transition-all duration-200 overflow-hidden w-64 cursor-pointer"
    >
      {/* Logo */}
      <div className="w-full bg-gradient-to-b from-gray-900 to-gray-700 flex items-center justify-center p-6" style={{ minHeight: 280 }}>
        <img
          src={collection.logo}
          alt={`Logo ${collection.name}`}
          className="h-64 w-auto object-contain drop-shadow-xl group-hover:scale-105 transition-transform duration-200"
        />
      </div>

      {/* Info */}
      <div className="w-full px-4 py-4 text-center">
        <h2 className="text-lg font-bold text-gray-800 mb-1">{collection.name}</h2>
        <p className="text-xs text-gray-500">{collection.description}</p>
      </div>

      {/* Badge "Seleziona" */}
      <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        Apri →
      </div>
    </button>
  );
}

function CollectionSelector() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center px-4 py-12">
      {/* Titolo */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-white tracking-wider mb-2">
          🃏 My Card Collections
        </h1>
        <p className="text-gray-400 text-sm">Seleziona una collezione per iniziare</p>
      </div>

      {/* Griglia collezioni */}
      <div className="flex flex-wrap gap-8 justify-center">
        {COLLECTIONS.map(col => (
          <CollectionCard key={col.id} collection={col} />
        ))}

        {/* Placeholder "Prossimamente" */}
        <div className="flex flex-col items-center bg-white/5 border-2 border-dashed border-gray-600 rounded-2xl w-64 cursor-not-allowed opacity-50"
          style={{ minHeight: 340 }}>
          <div className="flex-1 flex items-center justify-center text-gray-500 text-5xl">＋</div>
          <div className="w-full px-4 py-4 text-center">
            <h2 className="text-lg font-bold text-gray-500 mb-1">Prossimamente</h2>
            <p className="text-xs text-gray-600">Nuove collezioni in arrivo</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollectionSelector;

