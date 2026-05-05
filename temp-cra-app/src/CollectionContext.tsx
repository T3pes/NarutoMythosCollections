import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Collection {
  id: string;
  name: string;
  description: string;
  logo: string;       // path pubblico (es. /images/naruto-mythos-logo.webp)
  accentColor: string; // classe Tailwind per colore tematico
  setName: string;    // valore usato nel campo "set" del DB (se si filtra per set)
}

// Registro statico di tutte le collezioni disponibili
export const COLLECTIONS: Collection[] = [
  {
    id: 'naruto-mythos',
    name: 'Naruto Mythos',
    description: 'Trading Card Game ufficiale basato sul manga Naruto',
    logo: '/images/naruto-mythos-logo.webp',
    accentColor: 'orange',
    setName: '',  // vuoto = tutte le carte nel DB (per ora solo Naruto Mythos)
  },
];

interface CollectionContextType {
  activeCollection: Collection | null;
  setActiveCollection: (c: Collection | null) => void;
}

const CollectionContext = createContext<CollectionContextType>({
  activeCollection: null,
  setActiveCollection: () => {},
});

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [activeCollection, setActiveCollection] = useState<Collection | null>(null);
  return (
    <CollectionContext.Provider value={{ activeCollection, setActiveCollection }}>
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollection() {
  return useContext(CollectionContext);
}

