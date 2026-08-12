import ShiftRing from './ShiftRing.jsx';
import { apiFetch } from '../api.js';

function formatHours(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function EmployeeTable({ employees, onChanged, onView }) {
  async function handleDelete(id) {
    if (!confirm('Remove this employee?')) return;
    await apiFetch(`/api/admin/employees/${id}`, { method: 'DELETE' });
    onChanged();
  }

  return (
    <section className="card">
      <h2>Employees — Today</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Rate/hr</th>
            <th>Shift progress</th>
            <th>Idle today</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {employees.map((e) => (
            <tr key={e.id}>
              <td>{e.name}</td>
              <td className="mono">${e.hourlyRate.toFixed(2)}</td>
              <td>
                <ShiftRing activeSeconds={e.todayActiveSeconds} />
              </td>
              <td className="mono">{formatHours(e.todayIdleSeconds)}</td>
              <td>
                <button onClick={() => onView(e.id, e.name)}>View</button>{' '}
                <button className="deleteBtn" onClick={() => handleDelete(e.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
