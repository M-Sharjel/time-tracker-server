import { useState, useEffect, useCallback } from 'react';
import ShiftRing from './ShiftRing.jsx';
import { apiFetch, getToken } from '../api.js';

function formatHours(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function EmployeeDetail({ employeeId, name }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState({ activeSeconds: 0, idleSeconds: 0 });
  const [files, setFiles] = useState([]);

  const refresh = useCallback(async () => {
    if (!employeeId) return;
    const summaryRes = await apiFetch(`/api/admin/employees/${employeeId}/summary?date=${date}`);
    setSummary(await summaryRes.json());
    const shotsRes = await apiFetch(`/api/admin/employees/${employeeId}/screenshots?date=${date}`);
    setFiles(await shotsRes.json());
  }, [employeeId, date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!employeeId) return null;

  return (
    <section className="card">
      <h2>{name} — Detail</h2>
      <label className="detail-date-label">
        Date <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="detail-summary-row">
        <ShiftRing activeSeconds={summary.activeSeconds} size={64} stroke={7} showLabel />
        <div>
          <span className="label">Active</span>
          <span className="value">{formatHours(summary.activeSeconds)}</span>
        </div>
        <div>
          <span className="label">Idle</span>
          <span className="value" style={{ color: 'var(--muted)' }}>
            {formatHours(summary.idleSeconds)}
          </span>
        </div>
      </div>
      <div className="screenshot-grid">
        {files.map((f) => (
          <img
            key={f}
            src={`/api/admin/employees/${employeeId}/screenshots/${date}/${f}?token=${getToken()}`}
            alt={f}
          />
        ))}
      </div>
    </section>
  );
}
