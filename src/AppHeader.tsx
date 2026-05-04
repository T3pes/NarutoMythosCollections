import React from 'react';
import { Link } from 'react-router-dom';

function AppHeader() {
  return (
    <header className="bg-orange-600 text-white shadow mb-4">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="font-bold text-xl tracking-wider">
          Naruto Mythos Collection
        </div>
        <nav className="space-x-4">
          <Link to="/" className="hover:underline">Dashboard</Link>
          <Link to="/cards" className="hover:underline">Carte</Link>
          <Link to="/login" className="hover:underline">Login</Link>
        </nav>
      </div>
    </header>
  );
}

export default AppHeader;

