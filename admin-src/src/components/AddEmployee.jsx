import { useState } from 'react';
import { apiFetch } from '../api.js';

export default function AddEmployee({ onAdded }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rate, setRate] = useState('');
  const [newKey, setNewKey] = useState(null);

  async function handleAdd() {
    if (!name.trim()) {
      alert('Name required');
      return;
    }
    const res = await apiFetch('/api/admin/employees', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), email: email.trim(), hourlyRate: parseFloat(rate) || 0 })
    });
    const emp = await res.json();
    setNewKey(emp.apiKey);
    setName('');
    setEmail('');
    setRate('');
    onAdded();
  }

  return (
    <section className="card">
      <h2>Add Employee</h2>
      <div className="add-employee-form">
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="number" step="0.01" placeholder="Hourly rate" value={rate} onChange={(e) => setRate(e.target.value)} />
        <button onClick={handleAdd}>Add Employee</button>
      </div>
      {newKey && (
        <div className="new-key-box">
          <p>Give this API key to the employee — they paste it into their Time Tracker app settings:</p>
          <code>{newKey}</code>
        </div>
      )}
    </section>
  );
}
