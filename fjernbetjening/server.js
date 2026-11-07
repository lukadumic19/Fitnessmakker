#!/usr/bin/env node
// Fjernbetjening – lokal bro mellem telefonen og TV'et.
// Start:  node server.js   (eller: npm start)
// Åbn derefter den viste adresse på telefonen (samme Wi-Fi).
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createDriver, DRIVERS } from './lib/drivers/index.js';
import { KEYS } from './lib/drivers/base.js';
import { APP_CATALOG } from './lib/apps.js';
import { discover, sleep, normalizeMac } from './lib/net.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const PORT = Number(process.env.PORT) || 8777;
const HOST = process.env.HOST || '0.0.0.0';

// ---------- Konfiguration ----------

const DEFAULT_CONFIG = {
  tvs: [],
  activeId: null,
  favorites: [
    { id: 'f1', name: 'DR1', number: '1' },
    { id: 'f2', name: 'TV 2', number: '2' },
    { id: 'f3', name: 'DR2', number: '3' },
    { id: 'f4', name: 'TV3', number: '4' },
  ],
  macros: [
    {
      id: 'm1',
      name: 'Filmaften',
      icon: '🍿',
      steps: [{ power: 'on' }, { wait: 6000 }, { app: 'netflix' }],
    },
    {
      id: 'm2',
      name: 'Nyheder',
      icon: '📰',
      steps: [{ power: 'on' }, { wait: 5000 }, { key: 'exit' }, { channel: '1' }],
    },
    {
      id: 'm3',
      name: 'Spring intro over',
      icon: '⏩',
      steps: [{ key: 'forward', times: 3 }],
    },
    {
      id: 'm4',
      name: 'Godnat',
      icon: '🌙',
      steps: [{ sleep: 30 }],
    },
  ],
};

function loadConfig() {
  try {
    return { ...structuredClone(DEFAULT_CONFIG), ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

let config = loadConfig();
let saveTimer = null;
function saveConfig() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    const tmp = CONFIG_FILE + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(config, null, 2));
    await fsp.rename(tmp, CONFIG_FILE);
  }, 100);
}

const uid = () => crypto.randomBytes(6).toString('hex');

// ---------- Drivere ----------

const drivers = new Map();
const queues = new Map();

function getTv(id) {
  const tv = config.tvs.find((t) => t.id === id);
  if (!tv) throw httpError(404, 'TV\'et findes ikke');
  return tv;
}

function driverFor(tv) {
  let d = drivers.get(tv.id);
  if (!d) {
    d = createDriver(tv, (patch) => {
      Object.assign(tv, patch);
      saveConfig();
    });
    drivers.set(tv.id, d);
  }
  return d;
}

function resetDriver(id) {
  drivers.get(id)?.close();
  drivers.delete(id);
}

/** Kører kommandoer til samme TV én ad gangen, så rækkefølgen bevares. */
function enqueue(tvId, fn) {
  const prev = queues.get(tvId) || Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  queues.set(tvId, next);
  next.finally(() => queues.get(tvId) === next && queues.delete(tvId)).catch(() => {});
  return next;
}

function publicTv(tv) {
  const { token, clientKey, psk, ...rest } = tv;
  const d = driverFor(tv);
  return {
    ...rest,
    hasPsk: !!psk,
    paired: tv.type === 'demo' || !!(token || clientKey || psk) || tv.type === 'roku' || (tv.type === 'samsung' && tv.port === 8001),
    capabilities: d.capabilities,
  };
}

// ---------- Sleep-timer ----------

let sleepTimer = null;
let sleepInfo = null;

function setSleep(tvId, minutes) {
  clearTimeout(sleepTimer);
  sleepTimer = null;
  sleepInfo = null;
  if (!minutes) return null;
  const tv = getTv(tvId);
  const ms = Math.round(minutes * 60000);
  sleepInfo = { tvId, endsAt: Date.now() + ms, minutes };
  sleepTimer = setTimeout(() => {
    sleepInfo = null;
    enqueue(tv.id, () => driverFor(tv).powerOff()).catch((e) => console.warn('Sleep-timer:', e.message));
  }, ms);
  return sleepInfo;
}

// ---------- Makroer ----------

async function runSteps(tv, steps) {
  const d = driverFor(tv);
  for (const step of steps) {
    if (step.key) {
      for (let i = 0; i < (step.times || 1); i++) {
        await d.key(step.key);
        await sleep(step.delay ?? 250);
      }
    } else if (step.channel) {
      for (const digit of String(step.channel)) {
        await d.key(digit);
        await sleep(200);
      }
      if (step.ok !== false) {
        await sleep(400);
        await d.key('ok').catch(() => {});
      }
    } else if (step.app) {
      await d.launch(step.app);
    } else if (step.text) {
      await d.text(step.text);
    } else if (step.input) {
      await d.setInput(step.input);
    } else if (step.wait) {
      await sleep(Math.min(step.wait, 60000));
    } else if (step.power === 'on') {
      const st = await d.status().catch(() => ({}));
      if (st.power !== 'on') await d.powerOn();
    } else if (step.power === 'off') {
      await d.powerOff();
    } else if (step.sleep !== undefined) {
      setSleep(tv.id, step.sleep);
    }
  }
}

// ---------- HTTP ----------

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > 1e6) throw httpError(413, 'For stor forespørgsel');
    chunks.push(c);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw httpError(400, 'Ugyldig JSON');
  }
}

function sanitizeTv(input, existing = {}) {
  const tv = { ...existing };
  if (input.name !== undefined) tv.name = String(input.name).slice(0, 60) || 'TV';
  if (input.type !== undefined) {
    if (!DRIVERS[input.type]) throw httpError(400, 'Ukendt TV-type');
    tv.type = input.type;
  }
  if (input.ip !== undefined) {
    const ip = String(input.ip).trim();
    if (tv.type !== 'demo' && !/^[a-z0-9.\-:[\]]+$/i.test(ip)) throw httpError(400, 'Ugyldig IP-adresse');
    tv.ip = ip;
  }
  if (input.mac !== undefined) {
    tv.mac = input.mac ? normalizeMac(input.mac) : null;
    if (input.mac && !tv.mac) throw httpError(400, 'Ugyldig MAC-adresse (fx a1:b2:c3:d4:e5:f6)');
  }
  if (input.psk !== undefined && input.psk !== '') tv.psk = String(input.psk);
  if (!tv.type) throw httpError(400, 'Vælg TV-type');
  if (tv.type !== 'demo' && !tv.ip) throw httpError(400, 'Angiv TV\'ets IP-adresse');
  return tv;
}

const ROUTES = [];
const route = (method, pattern, handler) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
  ROUTES.push({ method, re, keys, handler });
};

route('GET', '/api/state', () => ({
  tvs: config.tvs.map(publicTv),
  activeId: config.activeId,
  favorites: config.favorites,
  macros: config.macros,
  sleep: sleepInfo,
  catalog: APP_CATALOG.map(({ id, name, color }) => ({ id, name, color })),
  types: Object.fromEntries(Object.entries(DRIVERS).map(([k, v]) => [k, v.label])),
  keys: KEYS,
}));

route('GET', '/api/discover', async () => ({ devices: await discover(3000) }));

route('POST', '/api/tvs', async (_, body) => {
  const tv = sanitizeTv(body, { id: uid() });
  config.tvs.push(tv);
  if (!config.activeId) config.activeId = tv.id;
  saveConfig();
  return publicTv(tv);
});

route('PUT', '/api/tvs/:id', async ({ id }, body) => {
  const idx = config.tvs.findIndex((t) => t.id === id);
  if (idx < 0) throw httpError(404, 'TV\'et findes ikke');
  const old = config.tvs[idx];
  const updated = sanitizeTv(body, old);
  if (updated.ip !== old.ip || updated.type !== old.type) {
    delete updated.token;
    delete updated.clientKey;
    delete updated.port;
    delete updated.secure;
  }
  config.tvs[idx] = updated;
  resetDriver(id);
  saveConfig();
  return publicTv(updated);
});

route('DELETE', '/api/tvs/:id', async ({ id }) => {
  config.tvs = config.tvs.filter((t) => t.id !== id);
  resetDriver(id);
  if (config.activeId === id) config.activeId = config.tvs[0]?.id || null;
  saveConfig();
  return { ok: true };
});

route('POST', '/api/active', async (_, body) => {
  config.activeId = getTv(body.id).id;
  saveConfig();
  return { ok: true };
});

route('PUT', '/api/favorites', async (_, body) => {
  if (!Array.isArray(body)) throw httpError(400, 'Forventede en liste');
  config.favorites = body.slice(0, 50).map((f) => ({
    id: f.id || uid(),
    name: String(f.name || '').slice(0, 30),
    number: String(f.number || '').replace(/\D/g, '').slice(0, 5),
  })).filter((f) => f.name && f.number);
  saveConfig();
  return config.favorites;
});

route('PUT', '/api/macros', async (_, body) => {
  if (!Array.isArray(body)) throw httpError(400, 'Forventede en liste');
  config.macros = body.slice(0, 50).map((m) => ({
    id: m.id || uid(),
    name: String(m.name || 'Genvej').slice(0, 40),
    icon: String(m.icon || '⭐').slice(0, 4),
    steps: Array.isArray(m.steps) ? m.steps.slice(0, 40) : [],
  }));
  saveConfig();
  return config.macros;
});

route('POST', '/api/sleep', async (_, body) => setSleep(body.tvId || config.activeId, Number(body.minutes) || 0));

const tvRoute = (method, sub, fn) =>
  route(method, `/api/tv/:id${sub}`, async (params, body) => {
    const tv = getTv(params.id);
    return enqueue(tv.id, () => fn(driverFor(tv), body, tv));
  });

tvRoute('POST', '/pair', async (d) => {
  await d.pair();
  return { ok: true };
});
tvRoute('POST', '/key', async (d, body) => {
  if (!KEYS.includes(body.key)) throw httpError(400, 'Ukendt knap');
  await d.key(body.key);
  return { ok: true };
});
tvRoute('POST', '/text', async (d, body, tv) => {
  const text = String(body.text || '').slice(0, 500);
  if (text) await d.text(text, { enter: !!body.enter });
  // LG trykker selv Enter; de øvrige får et OK-tryk bagefter
  if (text && body.enter && tv.type !== 'lg' && tv.type !== 'demo') {
    await sleep(300);
    await d.key('ok');
  }
  return { ok: true };
});
tvRoute('POST', '/launch', async (d, body) => {
  await d.launch(String(body.app));
  return { ok: true };
});
tvRoute('GET', '/apps', async (d) => ({ apps: await d.apps() }));
tvRoute('GET', '/inputs', async (d) => ({ inputs: await d.inputs() }));
tvRoute('POST', '/input', async (d, body) => {
  await d.setInput(String(body.id));
  return { ok: true };
});
tvRoute('POST', '/pointer', async (d, body) => {
  await d.pointer(body);
  return { ok: true };
});
tvRoute('POST', '/power', async (d, body) => {
  if (body.on === true) await d.powerOn();
  else if (body.on === false) await d.powerOff();
  else await d.key('power');
  return { ok: true };
});
tvRoute('POST', '/macro', async (d, body, tv) => {
  const steps = body.steps || config.macros.find((m) => m.id === body.id)?.steps;
  if (!steps) throw httpError(404, 'Genvejen findes ikke');
  await runSteps(tv, steps);
  return { ok: true };
});
// Status må ikke stå i kø bag langsomme kommandoer
route('GET', '/api/tv/:id/status', async ({ id }) => {
  const tv = getTv(id);
  return driverFor(tv).status();
});

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
};

async function serveStatic(req, res, pathname) {
  let file = path.normalize(path.join(PUBLIC, decodeURIComponent(pathname)));
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: 'Forbudt' });
  try {
    const st = await fsp.stat(file);
    if (st.isDirectory()) file = path.join(file, 'index.html');
    const data = await fsp.readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    send(res, 404, { error: 'Ikke fundet' });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith('/api/')) return serveStatic(req, res, url.pathname);
  for (const r of ROUTES) {
    if (r.method !== req.method) continue;
    const m = r.re.exec(url.pathname);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    try {
      const body = req.method === 'GET' ? {} : await readBody(req);
      return send(res, 200, (await r.handler(params, body)) ?? { ok: true });
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.warn(`${req.method} ${url.pathname}:`, err.message);
      return send(res, status, { error: err.message });
    }
  }
  send(res, 404, { error: 'Ukendt adresse' });
});

server.listen(PORT, HOST, () => {
  const addrs = Object.values(os.networkInterfaces())
    .flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal)
    .map((a) => `http://${a.address}:${PORT}`);
  console.log('\n📺  Fjernbetjeningen kører!\n');
  console.log('   Åbn en af disse adresser på din telefon (samme Wi-Fi):');
  for (const a of addrs.length ? addrs : [`http://localhost:${PORT}`]) console.log(`   →  ${a}`);
  console.log('\n   Tryk Ctrl+C for at stoppe.\n');
});

const shutdown = () => {
  for (const d of drivers.values()) d.close();
  server.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
