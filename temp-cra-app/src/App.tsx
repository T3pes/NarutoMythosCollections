import React, { type ReactElement } from 'react';
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

/** Carica la collezione dal parametro URL se non è già nel context */
function CollectionRoute({ children }: { children: ReactElement }) {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { activeCollection, setActiveCollection } = useCollection();
  const { user, loading } = useAuth();

  if (loading) return <div className="p-8 text-center">Caricamento...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // Ripristina la collezione dal URL in caso di refresh
  if (!activeCollection && collectionId) {
    const found = COLLECTIONS.find(c => c.id === collectionId);
    if (found) {
      setActiveCollection(found);
    } else {
      return <Navigate to="/" replace />;
    }
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
