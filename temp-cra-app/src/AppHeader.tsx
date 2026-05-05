import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { useCollection } from './CollectionContext';

function AppHeader() {
  const { user, signOut } = useAuth();
  const { activeCollection } = useCollection();
  const navigate = useNavigate();
  const { collectionId } = useParams<{ collectionId: string }>();

  const isInCollection = Boolean(collectionId);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-orange-600 text-white shadow mb-4">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        {/* Sinistra: titolo + breadcrumb */}
        <div className="flex items-center gap-3">
          {isInCollection && (
            <Link
              to="/"
              className="text-orange-200 hover:text-white text-sm flex items-center gap-1"
              title="Torna alle collezioni"
            >
              ← Collezioni
            </Link>
          )}
          {isInCollection && <span className="text-orange-300 text-sm">/</span>}
          <div className="font-bold text-xl tracking-wider">
            {activeCollection ? activeCollection.name : 'My Card Collections'}
          </div>
        </div>

        {/* Destra: navigazione */}
        <nav className="space-x-4 flex items-center">
          {isInCollection && collectionId && (
            <>
              <Link to={`/collection/${collectionId}`} className="hover:underline text-sm">
                Dashboard
              </Link>
              <Link to={`/collection/${collectionId}/cards`} className="hover:underline text-sm">
                Carte
              </Link>
            </>
          )}
          {!user && <Link to="/login" className="hover:underline text-sm">Login</Link>}
          {user && (
            <>
              <span className="text-xs mr-2 text-orange-200">{user.email}</span>
              <button
                onClick={handleLogout}
                className="px-2 py-1 text-xs bg-white text-orange-600 rounded hover:bg-orange-100 border border-orange-300"
              >Logout</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default AppHeader;
