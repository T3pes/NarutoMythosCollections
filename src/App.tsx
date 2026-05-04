import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import CardList from './pages/CardList';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Dashboard />} />
      <Route path="/cards" element={<CardList />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;

