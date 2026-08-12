export function getToken() {
  return localStorage.getItem('adminToken');
}
export function setToken(token) {
  localStorage.setItem('adminToken', token);
}
export function clearToken() {
  localStorage.removeItem('adminToken');
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(path, { ...options, headers });
}
