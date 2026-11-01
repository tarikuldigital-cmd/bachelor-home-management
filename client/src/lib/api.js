// API layer. If VITE_API_URL is set -> talk to the Node server (real, shared data + real SMS).
// Otherwise -> run the same engine in the browser with localStorage (demo mode).
import { createEngine } from './engine.js';
import { seedDemo } from './seed.js';

// VITE_API_URL=same  -> API on the same domain (server/index.js also serves the site)
// VITE_API_URL=https://api.example.com -> separate API server
// No VITE_API_URL -> detect at startup: if this site has the Node server (/api/health), use it;
// otherwise (GitHub Pages) run the demo engine in the browser.
const RAW = import.meta.env.VITE_API_URL || '';
export let DEMO = !RAW;
export let API_URL = RAW === 'same' ? '' : RAW.replace(/\/$/, '');

export async function detectServer() {
  if (RAW) return !DEMO;
  if (window.Capacitor) return false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch('/api/health', { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(timer);
    const j = r.ok ? await r.json() : null;
    if (j && j.ok) {
      DEMO = false;
      API_URL = '';
    }
  } catch {
    /* no server here: demo mode */
  }
  return !DEMO;
}
const DB_KEY = 'bhm_db_v6';
const TOKEN_KEY = 'bhm_token';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

let localEngine = null;
function getLocalEngine() {
  if (localEngine) return localEngine;
  const adapter = {
    hash: async (pw) => 'sha256:' + (await sha256('bhm:' + pw)),
    verify: async (pw, h) => h === 'sha256:' + (await sha256('bhm:' + pw)),
    sign: (payload) => btoa(unescape(encodeURIComponent(JSON.stringify(payload)))),
    verifyToken: (t) => {
      try {
        return JSON.parse(decodeURIComponent(escape(atob(t))));
      } catch {
        return null;
      }
    },
    // Demo: no real gateway. Logged as "simulated"; UI offers phone SMS app link.
    sendSms: async () => ({ ok: false, info: 'demo' }),
  };
  const store = {
    async load() {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) return JSON.parse(raw);
      const db = await seedDemo(adapter.hash);
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      return db;
    },
    async save(db) {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    },
  };
  localEngine = createEngine(store, adapter);
  return localEngine;
}

export function resetDemo() {
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localEngine = null;
}

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export async function api(action, payload = {}) {
  const token = getToken();
  try {
    if (DEMO) return await getLocalEngine().call(action, payload, token);
    const res = await fetch(`${API_URL}/api/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = new Error(data.message || 'Server error');
      e.code = data.code;
      throw e;
    }
    return data.result;
  } catch (e) {
    if (e.code === 'unauthorized') {
      setToken(null);
      window.dispatchEvent(new Event('bhm-logout'));
    }
    throw e;
  }
}
