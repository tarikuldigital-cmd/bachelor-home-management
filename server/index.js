// Bachelor Home Management — API server
// Runs the same engine as the browser, but stores data in a JSON file
// and sends real SMS through an SMS gateway (BulkSMSBD by default).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createEngine, emptyDb, AppError } from '../client/src/lib/engine.js';
import { sendSms } from './sms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 4000);
const DATA_FILE = path.resolve(__dirname, process.env.DATA_FILE || './data/db.json');
const SECRET = process.env.JWT_SECRET || 'change-this-secret';
const STATIC_DIR = path.resolve(__dirname, '../client/dist');
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || '*';

if (SECRET === 'change-this-secret') console.warn('⚠️  Set JWT_SECRET in server/.env before going live!');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

// ---------- crypto ----------
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const adapter = {
  async hash(pw) {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(pw, salt, 32);
    return `scrypt:${b64u(salt)}:${b64u(key)}`;
  },
  async verify(pw, stored) {
    const [kind, s, k] = String(stored || '').split(':');
    if (kind !== 'scrypt') return false;
    const key = crypto.scryptSync(pw, Buffer.from(s, 'base64url'), 32);
    const want = Buffer.from(k, 'base64url');
    return key.length === want.length && crypto.timingSafeEqual(key, want);
  },
  sign(payload) {
    const body = b64u(JSON.stringify({ ...payload, exp: Date.now() + 1000 * 60 * 60 * 24 * 60 }));
    const sig = b64u(crypto.createHmac('sha256', SECRET).update(body).digest());
    return `${body}.${sig}`;
  },
  verifyToken(token) {
    const [body, sig] = String(token).split('.');
    if (!body || !sig) return null;
    const want = b64u(crypto.createHmac('sha256', SECRET).update(body).digest());
    if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  },
  sendSms,
};

// ---------- storage ----------
let cache = null;
const store = {
  async load() {
    if (cache) return cache;
    if (fs.existsSync(DATA_FILE)) cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    else cache = await firstRun();
    return cache;
  },
  async save(db) {
    cache = db;
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DATA_FILE);
  },
};

async function firstRun() {
  const db = emptyDb();
  db.settings.messName = process.env.MESS_NAME || 'Bachelor Home';
  const username = (process.env.ADMIN_USERNAME || 'manager').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '1234';
  db.members.push({
    id: crypto.randomUUID().slice(0, 12),
    username,
    name: process.env.ADMIN_NAME || 'Manager',
    role: 'manager',
    phone: process.env.ADMIN_PHONE || '',
    active: true,
    joinDate: new Date().toISOString().slice(0, 10),
    defaultMeals: { b: 1, l: 1, d: 1 },
    passwordHash: await adapter.hash(password),
    createdAt: new Date().toISOString(),
  });
  await store.save(db);
  console.log(`✅ New database created. Login: ${username} / ${password}  (change the password after login!)`);
  return db;
}

const engine = createEngine(store, adapter);

// ---------- http ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };

function send(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new AppError('too_large', 'Request too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {});
      } catch {
        reject(new AppError('bad_json', 'Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// simple login rate limit
const attempts = new Map();
function limited(ip) {
  const now = Date.now();
  const a = (attempts.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  a.push(now);
  attempts.set(ip, a);
  return a.length > 20;
}

const STATUS = { unauthorized: 401, bad_login: 401, forbidden: 403, inactive: 403, not_found: 404, unknown_action: 404, too_large: 413 };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (url.pathname === '/api/health') return send(res, 200, { ok: true });

  const m = url.pathname.match(/^\/api\/([a-zA-Z]+)$/);
  if (m && req.method === 'POST') {
    try {
      const action = m[1];
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
      if (action === 'login' && limited(ip)) throw new AppError('forbidden', 'অনেকবার চেষ্টা করা হয়েছে, ১০ মিনিট পর আবার চেষ্টা করুন');
      const body = await readBody(req);
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;
      const result = await engine.call(action, body, token);
      return send(res, 200, { result });
    } catch (e) {
      const code = e.code || 'error';
      if (!(e instanceof AppError)) console.error(e);
      return send(res, STATUS[code] || (e instanceof AppError ? 400 : 500), { code, message: e.message });
    }
  }

  // serve the built React app (optional: same server for site + API)
  if (fs.existsSync(STATIC_DIR)) {
    let file = path.join(STATIC_DIR, decodeURIComponent(url.pathname));
    if (!file.startsWith(STATIC_DIR)) return send(res, 403, {});
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(STATIC_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    return fs.createReadStream(file).pipe(res);
  }
  send(res, 404, { code: 'not_found' });
});

server.listen(PORT, () => console.log(`🏠 Bachelor Home API running on http://localhost:${PORT}`));
