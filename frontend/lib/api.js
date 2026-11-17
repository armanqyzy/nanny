const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('nanny_token');
}

export function setSession({ token, user }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('nanny_token', token);
  localStorage.setItem('nanny_user', JSON.stringify(user));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('nanny_token');
  localStorage.removeItem('nanny_user');
}

export function currentUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('nanny_user');
  return raw ? JSON.parse(raw) : null;
}

export function absoluteAssetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE}${path}`;
}

const NETWORK_ERROR_TEXT = 'No connection to the server. It may be waking up, please try again in a few seconds.';

async function request(method, path, body, attempt = 0) {
  const token = getToken();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    // The free Render server sleeps and restarts; reads are safe to repeat once.
    if (method === 'GET' && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return request(method, path, body, 1);
    }
    throw new Error(NETWORK_ERROR_TEXT);
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  if (res.status === 403 && data?.error === 'Account is blocked' && typeof window !== 'undefined') {
    // The account was blocked by an admin: end the session right away.
    clearSession();
    window.location.href = '/login';
  }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:    (p)    => request('GET',    p),
  post:   (p, b) => request('POST',   p, b),
  put:    (p, b) => request('PUT',    p, b),
  delete: (p, b) => request('DELETE', p, b),
};

export async function uploadFile(path, file) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': file.name || 'upload',
    },
    body: file,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}
