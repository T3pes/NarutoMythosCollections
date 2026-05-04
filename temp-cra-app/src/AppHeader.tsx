import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

function AppHeader() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="bg-orange-600 text-white shadow mb-4">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="font-bold text-xl tracking-wider">
          Naruto Mythos Collection
        </div>
        <nav className="space-x-4 flex items-center">
          <Link to="/" className="hover:underline">Dashboard</Link>
          <Link to="/cards" className="hover:underline">Carte</Link>
          {!user && <Link to="/login" className="hover:underline">Login</Link>}
          {user && (
            <>
              <span className="text-xs mr-2">{user.email}</span>
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
