import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function Dashboard() {
  const { user, signOut } = useAuth();
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">Naruto Mythos Collection</h1>
      {user && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm">{user.email}</span>
          <button
            className="ml-2 px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
            onClick={signOut}
          >
            Logout
          </button>
        </div>
      )}
      <div className="mb-4">
        <Link className="inline-block px-3 py-2 rounded bg-blue-600 text-white text-sm" to="/cards">
          Vai alla lista carte
        </Link>
      </div>
      {/* Stato collezione, barra avanzamento, filtri rapidi, ecc. */}
      <div className="mt-4">[Dashboard in costruzione]</div>
    </div>
  );
}

export default Dashboard;
