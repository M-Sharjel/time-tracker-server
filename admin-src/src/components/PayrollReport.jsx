import { useState } from 'react';
import { apiFetch } from '../api.js';

export default function PayrollReport() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [rows, setRows] = useState([]);

  async function handleCalculate() {
    if (!start || !end) {
      alert('Pick both dates');
      return;
    }
    const res = await apiFetch(`/api/admin/payroll?start=${start}&end=${end}`);
    setRows(await res.json());
  }

  function handleExport() {
    if (!rows.length) {
      alert('Calculate a payroll report first');
      return;
    }
    const header = 'Name,Rate/hr,Total Hours,Total Pay\n';
    const csvRows = rows.map(
      (r) => `"${r.name}",${r.hourlyRate.toFixed(2)},${r.totalHours},${r.totalPay.toFixed(2)}`
    );
    const csv = header + csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payroll-${start}-to-${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card">
      <h2>Payroll Report</h2>
      <div className="payroll-form">
        <label>
          From <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          To <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <button onClick={handleCalculate}>Calculate</button>
        <button onClick={handleExport}>Export CSV</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Rate/hr</th>
            <th>Total hours</th>
            <th>Total pay</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td className="mono">${r.hourlyRate.toFixed(2)}</td>
              <td className="mono">{r.totalHours}</td>
              <td className="mono pay" style={{ color: 'var(--teal-bright)' }}>
                ${r.totalPay.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
