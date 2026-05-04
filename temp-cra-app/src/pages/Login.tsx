import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

function Login() {
  const { signIn, signUp, loading, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Se già loggato → redirect alla dashboard
  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (isRegister) {
      const result = await signUp(email, password);
      if (result && result.error) setError(result.error.message);
      else setSuccess('Registrazione avvenuta! Controlla la mail per confermare l\'account.');
    } else {
      const result = await signIn(email, password);
      if (result && result.error) {
        setError(result.error.message);
      } else {
        navigate('/', { replace: true });
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-xl font-bold mb-4">{isRegister ? 'Registrati' : 'Login'}</h2>
      <form className="flex flex-col gap-2 w-72" onSubmit={handleSubmit}>
        <input
          className="border rounded px-2 py-1"
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          className="border rounded px-2 py-1"
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button
          className="bg-blue-600 text-white rounded px-4 py-2 mt-2 disabled:opacity-50"
          type="submit"
          disabled={loading}
        >
          {isRegister ? 'Registrati' : 'Login'}
        </button>
        <button
          type="button"
          className="text-sm underline mt-1"
          onClick={() => setIsRegister(r => !r)}
        >
          {isRegister ? 'Hai già un account? Login' : 'Non hai un account? Registrati'}
        </button>
        {error && <div className="text-red-600 text-sm mt-1">{error}</div>}
        {success && <div className="text-green-600 text-sm mt-1">{success}</div>}
      </form>
    </div>
  );
}

export default Login;
