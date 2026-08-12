import { useState } from 'react';
import { apiFetch, setToken } from '../api.js';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin() {
    const res = await apiFetch('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    if (!res.ok) {
      setError('Wrong password');
      return;
    }
    const data = await res.json();
    setToken(data.token);
    onLogin();
  }

  return (
    <div className="login-box">
      <div className="brand-mark">
        <span className="brand-dot"></span>TIME TRACKER
      </div>
      <input
        type="password"
        placeholder="Admin password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
      />
      <button onClick={handleLogin}>Log In</button>
      <div className="error">{error}</div>
    </div>
  );
}
