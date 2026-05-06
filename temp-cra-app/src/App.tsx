import React, { type ReactElement, useEffect } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import CardList from './pages/CardList';
import CollectionSelector from './pages/CollectionSelector';
import { useAuth } from './auth/AuthContext';
import { useCollection, COLLECTIONS } from './CollectionContext';
import AppHeader from './AppHeader';

function PrivateRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Caricamento...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/** Ripristina la collezione attiva dal parametro URL (es. dopo refresh) */
function CollectionRoute({ children }: { children: ReactElement }) {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { activeCollection, setActiveCollection } = useCollection();
  const { user, loading } = useAuth();

  // Ripristina il context se mancante (es. dopo refresh della pagina)
  useEffect(() => {
    if (!activeCollection && collectionId) {
      const found = COLLECTIONS.find(c => c.id === collectionId);
      if (found) setActiveCollection(found);
    }
  }, [activeCollection, collectionId, setActiveCollection]);

  if (loading) return <div className="p-8 text-center">Caricamento...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // Collezione non trovata → torna alla home
  if (!activeCollection && collectionId) {
    const exists = COLLECTIONS.some(c => c.id === collectionId);
    if (!exists) return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <>
      <AppHeader />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><CollectionSelector /></PrivateRoute>} />
        <Route path="/collection/:collectionId" element={<CollectionRoute><Dashboard /></CollectionRoute>} />
        <Route path="/collection/:collectionId/cards" element={<CollectionRoute><CardList /></CollectionRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default App;
