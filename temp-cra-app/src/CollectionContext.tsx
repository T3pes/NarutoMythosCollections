import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Collection {
  id: string;
  name: string;
  description: string;
  logo: string;
  accentColor: string;
  setName: string;
}

// Registro statico di tutte le collezioni disponibili
export const COLLECTIONS: Collection[] = [
  {
    id: 'naruto-mythos',
    name: 'Naruto Mythos',
    description: 'Trading Card Game ufficiale basato sul manga Naruto',
    logo: 'https://ekfwchaoknmsfpqocwsg.supabase.co/storage/v1/object/public/MythosCards%201%20edition/Naruto_TCG_Card_Back-0dcade80-640w.webp',
    accentColor: 'orange',
    setName: '',
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

