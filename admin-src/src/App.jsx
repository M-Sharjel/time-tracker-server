import { useState, useEffect, useCallback } from 'react';
import Login from './components/Login.jsx';
import Header from './components/Header.jsx';
import AddEmployee from './components/AddEmployee.jsx';
import EmployeeTable from './components/EmployeeTable.jsx';
import PayrollReport from './components/PayrollReport.jsx';
import EmployeeDetail from './components/EmployeeDetail.jsx';
import { apiFetch, getToken, clearToken } from './api.js';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!getToken());
  const [employees, setEmployees] = useState([]);
  const [detail, setDetail] = useState(null); // { id, name }

  const loadEmployees = useCallback(async () => {
    const res = await apiFetch('/api/admin/employees');
    if (res.status === 401) {
      clearToken();
      setLoggedIn(false);
      return;
    }
    setEmployees(await res.json());
  }, []);

  useEffect(() => {
    if (loggedIn) loadEmployees();
  }, [loggedIn, loadEmployees]);

  if (!loggedIn) {
    return <Login onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div className="container">
      <Header
        onLogout={() => {
          clearToken();
          setLoggedIn(false);
        }}
      />
      <AddEmployee onAdded={loadEmployees} />
      <EmployeeTable employees={employees} onChanged={loadEmployees} onView={(id, name) => setDetail({ id, name })} />
      <PayrollReport />
      {detail && <EmployeeDetail employeeId={detail.id} name={detail.name} />}
    </div>
  );
}
