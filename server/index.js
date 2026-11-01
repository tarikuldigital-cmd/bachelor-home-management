// Bachelor Home Management — API server
// Runs the same engine as the browser, but stores data in a JSON file
// and sends real SMS through an SMS gateway (BulkSMSBD by default).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createAuth } from './auth.js';
import { fileURLToPath } from 'node:url';
import { createEngine, emptyDb, AppError } from '../client/src/lib/engine.js';
import { sendSms } from './sms.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '.env'));

const PORT = Number(process.env.PORT || 4000);
const DATA_FILE = path.resolve(__dirname, process.env.DATA_FILE || './data/db.json');
const SECRET = process.env.JWT_SECRET || 'change-this-secret';
// Built site: client/dist by default, or STATIC_DIR (e.g. a clone of the gh-pages branch)
const STATIC_DIR = path.resolve(__dirname, process.env.STATIC_DIR || '../client/dist');
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || '*';

if (SECRET === 'change-this-secret') console.warn('⚠️  Set JWT_SECRET in server/.env before going live!');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const adapter = { ...createAuth(SECRET), sendSms };

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

// Month-end due SMS: on the 1st (or the first check after it), every member with a due
// for last month gets an SMS. Runs at most once per month. Turn off in Settings.
async function runMonthly() {
  try {
    const r = await engine.monthlyTasks();
    if (r) console.log(`📨 Month-end due SMS for ${r.month}: ${r.sent} sent`);
  } catch (e) {
    console.error('monthly task failed:', e.message);
  }
}
setTimeout(runMonthly, 10_000);
setInterval(runMonthly, 60 * 60 * 1000);

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
      if (action === 'login' && limited(ip)) throw new AppError('forbidden', 'Too many attempts, try again in 10 minutes');
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
