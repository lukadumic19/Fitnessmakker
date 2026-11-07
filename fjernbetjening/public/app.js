// Fjernbetjening – klient. Taler med broen (server.js) via /api.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const KEY_LABELS = {
  power: 'Tænd/sluk', vol_up: 'Lyd +', vol_down: 'Lyd −', mute: 'Lydløs', ch_up: 'Kanal +', ch_down: 'Kanal −',
  up: 'Op', down: 'Ned', left: 'Venstre', right: 'Højre', ok: 'OK', back: 'Tilbage', home: 'Hjem', menu: 'Menu',
  info: 'Info', guide: 'Guide', source: 'Kilde', exit: 'Afslut', play: 'Afspil', pause: 'Pause',
  play_pause: 'Afspil/pause', stop: 'Stop', rewind: 'Spol tilbage', forward: 'Spol frem', record: 'Optag',
  red: 'Rød', green: 'Grøn', yellow: 'Gul', blue: 'Blå', prev_ch: 'Forrige kanal', ch_list: 'Kanalliste',
  subtitle: 'Undertekster', settings: 'Hurtigmenu', search: 'Søg',
};
for (let i = 0; i <= 9; i++) KEY_LABELS[String(i)] = `Tal ${i}`;

const PAIR_TYPES = new Set(['samsung', 'lg', 'sony']);

// ---------- Lokale indstillinger ----------

const prefs = (() => {
  const defaults = { haptics: true, repeat: true, keys: true, nav: 'dpad', panel: 'media', mouse: false, history: [] };
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('fjern-prefs') || '{}');
  } catch {
    /* ingen lagring */
  }
  const p = { ...defaults, ...saved };
  p.save = () => {
    try {
      const { save, ...rest } = p;
      localStorage.setItem('fjern-prefs', JSON.stringify(rest));
    } catch {
      /* ignorer */
    }
  };
  return p;
})();

// ---------- Tilstand ----------

let state = { tvs: [], activeId: null, favorites: [], macros: [], sleep: null, catalog: [], types: {} };
let status = {};
let offline = false;

const activeTv = () => state.tvs.find((t) => t.id === state.activeId) || null;

// ---------- API ----------

// ---------- Demo i browseren (uden bro og TV) ----------

let demoMode = !!window.FJERN_DEMO || new URLSearchParams(location.search).has('demo');

const DEMO_CATALOG = [
  ['netflix', 'Netflix', '#e50914'], ['youtube', 'YouTube', '#ff0033'], ['drtv', 'DR TV', '#c8102e'],
  ['tv2play', 'TV 2 Play', '#0050ff'], ['disney', 'Disney+', '#113ccf'], ['prime', 'Prime Video', '#00a8e1'],
  ['max', 'Max', '#002be7'], ['viaplay', 'Viaplay', '#ff1e46'], ['skyshowtime', 'SkyShowtime', '#5b2be0'],
  ['spotify', 'Spotify', '#1db954'], ['plex', 'Plex', '#e5a00d'], ['twitch', 'Twitch', '#9146ff'],
].map(([id, name, color]) => ({ id, name, color }));

const DEMO_INPUTS = [
  { id: 'tv', name: 'TV' }, { id: 'hdmi1', name: 'HDMI 1 · PlayStation' },
  { id: 'hdmi2', name: 'HDMI 2 · Apple TV' }, { id: 'hdmi3', name: 'HDMI 3' },
];

const demo = {
  tv: { power: 'on', volume: 18, muted: false, channel: 1, app: 'TV', digits: '', digitTimer: null },
  state: {
    tvs: [{ id: 'demo', name: 'Stue-TV (demo)', type: 'demo', paired: true, mac: null,
      capabilities: { text: true, apps: true, inputs: true, pointer: true, status: true, wol: false } }],
    activeId: 'demo',
    favorites: [
      { id: 'f1', name: 'DR1', number: '1' }, { id: 'f2', name: 'TV 2', number: '2' },
      { id: 'f3', name: 'DR2', number: '3' }, { id: 'f4', name: 'TV3', number: '4' },
    ],
    macros: [
      { id: 'm1', name: 'Filmaften', icon: '🍿', steps: [{ power: 'on' }, { wait: 1500 }, { app: 'netflix' }] },
      { id: 'm2', name: 'Nyheder', icon: '📰', steps: [{ power: 'on' }, { wait: 1000 }, { key: 'exit' }, { channel: '1' }] },
      { id: 'm3', name: 'Spring intro over', icon: '⏩', steps: [{ key: 'forward', times: 3 }] },
      { id: 'm4', name: 'Godnat', icon: '🌙', steps: [{ sleep: 30 }] },
    ],
    sleep: null,
    catalog: DEMO_CATALOG,
    types: { demo: 'Demo-TV (i browseren)' },
  },
};

const demoWait = (ms) => new Promise((r) => setTimeout(r, ms));

function demoKey(key) {
  const t = demo.tv;
  if (key === 'power') {
    t.power = t.power === 'on' ? 'standby' : 'on';
    return;
  }
  if (t.power !== 'on') throw new Error('Demo-TV\'et er slukket – tryk på tænd-knappen');
  if (key === 'vol_up') (t.volume = Math.min(100, t.volume + 1)), (t.muted = false);
  if (key === 'vol_down') (t.volume = Math.max(0, t.volume - 1)), (t.muted = false);
  if (key === 'mute') t.muted = !t.muted;
  if (key === 'ch_up') (t.channel++, (t.app = 'TV'));
  if (key === 'ch_down') ((t.channel = Math.max(1, t.channel - 1)), (t.app = 'TV'));
  if (key === 'home') t.app = 'Startskærm';
  if (/^[0-9]$/.test(key)) {
    t.digits = (t.digits + key).slice(-4);
    clearTimeout(t.digitTimer);
    t.digitTimer = setTimeout(() => {
      t.channel = Number(t.digits) || t.channel;
      t.app = 'TV';
      t.digits = '';
    }, 900);
  }
}

async function demoSteps(steps) {
  for (const s of steps) {
    if (s.key) for (let i = 0; i < (s.times || 1); i++) (demoKey(s.key), await demoWait(150));
    else if (s.channel) (demo.tv.channel = Number(s.channel), (demo.tv.app = 'TV'));
    else if (s.app) demo.tv.app = DEMO_CATALOG.find((a) => a.id === s.app)?.name || s.app;
    else if (s.wait) await demoWait(Math.min(s.wait, 3000));
    else if (s.power) demo.tv.power = s.power === 'on' ? 'on' : 'standby';
    else if (s.sleep !== undefined) demo.state.sleep = s.sleep ? { tvId: 'demo', minutes: s.sleep, endsAt: Date.now() + s.sleep * 60000 } : null;
  }
}

async function demoApi(method, path, body = {}) {
  await demoWait(40);
  const S = demo.state;
  const m = /^\/api\/tv\/[^/]+\/(\w+)$/.exec(path);
  const sub = m?.[1];
  if (path === '/api/state') return structuredClone(S);
  if (path === '/api/active') return { ok: true };
  if (path === '/api/favorites') return (S.favorites = body.map((f, i) => ({ id: f.id || 'f' + Date.now() + i, ...f })));
  if (path === '/api/macros') return (S.macros = body.map((x, i) => ({ ...x, id: x.id || 'm' + Date.now() + i })));
  if (path === '/api/sleep') return (S.sleep = body.minutes ? { tvId: 'demo', minutes: body.minutes, endsAt: Date.now() + body.minutes * 60000 } : null);
  if (path === '/api/discover' || path.startsWith('/api/tvs'))
    throw new Error('I demoen kan du ikke tilføje rigtige TV\'er – det kræver broen (server.js) på dit netværk');
  if (sub === 'key') return demoKey(body.key), { ok: true };
  if (sub === 'status') {
    const t = demo.tv;
    return { online: true, power: t.power, volume: t.volume, muted: t.muted, app: t.app, channel: t.channel };
  }
  if (sub === 'launch') return demoSteps([{ app: body.app }]), { ok: true };
  if (sub === 'macro') return await demoSteps(body.steps || S.macros.find((x) => x.id === body.id)?.steps || []), { ok: true };
  if (sub === 'apps') return { apps: DEMO_CATALOG.map(({ id, name }) => ({ id, name })) };
  if (sub === 'inputs') return { inputs: DEMO_INPUTS };
  if (sub === 'input') return (demo.tv.app = DEMO_INPUTS.find((i) => i.id === body.id)?.name), { ok: true };
  if (sub === 'power') return (demo.tv.power = body.on === false ? 'standby' : 'on'), { ok: true };
  return { ok: true };
}

async function api(method, path, body) {
  if (method !== 'GET' && path.startsWith('/api/tv/')) flashLed();
  if (demoMode) return demoApi(method, path, body);
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Kan ikke nå broen – kører server.js?');
  }
  let data = {};
  try {
    data = await res.json();
  } catch {
    /* tomt svar */
  }
  if (!res.ok) throw new Error(data.error || `Fejl ${res.status}`);
  return data;
}

async function loadState() {
  try {
    state = await api('GET', '/api/state');
    offline = false;
  } catch (err) {
    offline = true;
  }
  renderAll();
}

// ---------- Feedback ----------

let toastTimer;
function toast(msg, { error = false, ms = 2200 } = {}) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.toggle('error', error);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

let ledTimer;
function flashLed() {
  const led = document.getElementById('led');
  if (!led) return;
  led.classList.add('on');
  clearTimeout(ledTimer);
  ledTimer = setTimeout(() => led.classList.remove('on'), 140);
}

function askConfirm(msg) {
  // I indlejrede visninger kan confirm() være blokeret – spørg så ikke
  if (window.FJERN_DEMO) return true;
  try {
    return confirm(msg);
  } catch {
    return true;
  }
}

function haptic(ms = 12) {
  if (prefs.haptics && navigator.vibrate) navigator.vibrate(ms);
}

function requireTv() {
  const tv = activeTv();
  if (offline) {
    toast('Ingen forbindelse til broen', { error: true });
    return null;
  }
  if (!tv) {
    toast('Tilføj dit TV først');
    goto('settings');
    return null;
  }
  return tv;
}

// ---------- Kommandoer ----------

let lastErrorAt = 0;
function showError(err) {
  // Undgå en storm af fejlbeskeder ved gentagne tryk
  if (Date.now() - lastErrorAt < 800) return;
  lastErrorAt = Date.now();
  toast(err.message, { error: true, ms: 3500 });
}

async function sendKey(key) {
  const tv = requireTv();
  if (!tv) return;
  haptic();
  try {
    await api('POST', `/api/tv/${tv.id}/key`, { key });
    if (demoMode) toast(`📺 ${KEY_LABELS[key] || key}`, { ms: 900 });
    if (['vol_up', 'vol_down', 'mute', 'power'].includes(key)) setTimeout(pollStatus, 250);
  } catch (err) {
    showError(err);
  }
}

async function tvCall(method, sub, body, okMsg) {
  const tv = requireTv();
  if (!tv) return null;
  haptic();
  try {
    const r = await api(method, `/api/tv/${tv.id}${sub}`, body);
    if (okMsg) toast(okMsg);
    return r;
  } catch (err) {
    showError(err);
    return null;
  }
}

// ---------- Knapper med tryk og langt tryk ----------

function bindPress(el, { onPress, onHold, repeat = false }) {
  let holdTimer = null;
  let repeating = false;
  let suppressClick = false;
  let active = false;

  const stop = () => {
    clearTimeout(holdTimer);
    holdTimer = null;
    repeating = false;
    active = false;
    el.classList.remove('pressed');
  };

  const loop = async () => {
    while (repeating) {
      const t0 = performance.now();
      await onPress();
      const wait = Math.max(0, 140 - (performance.now() - t0));
      await new Promise((r) => setTimeout(r, wait));
    }
  };

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    active = true;
    suppressClick = false;
    el.classList.add('pressed');
    if (onHold) {
      holdTimer = setTimeout(() => {
        suppressClick = true;
        haptic(30);
        onHold();
      }, 700);
    } else if (repeat && prefs.repeat) {
      holdTimer = setTimeout(() => {
        if (!active) return;
        suppressClick = true;
        repeating = true;
        loop();
      }, 420);
    }
  });
  el.addEventListener('pointerup', () => {
    clearTimeout(holdTimer);
    el.classList.remove('pressed');
    if (repeating) repeating = false;
    active = false;
  });
  el.addEventListener('pointercancel', stop);
  el.addEventListener('pointerleave', () => {
    if (repeating || holdTimer) stop();
  });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('click', (e) => {
    if (suppressClick) {
      suppressClick = false;
      e.preventDefault();
      return;
    }
    onPress();
  });
}

function bindKeyButtons(root = document) {
  for (const el of $$('[data-key]', root)) {
    if (el.dataset.bound) continue;
    el.dataset.bound = '1';
    const key = el.dataset.key;
    if (el.dataset.hold === 'poweron') {
      bindPress(el, {
        onPress: () => sendKey(key),
        onHold: () => powerOn(),
      });
    } else {
      bindPress(el, { onPress: () => sendKey(key), repeat: el.hasAttribute('data-repeat') });
    }
  }
}

async function powerOn() {
  const tv = requireTv();
  if (!tv) return;
  toast('Tænder TV\'et…');
  await tvCall('POST', '/power', { on: true }, 'Tænd-signal sendt');
  setTimeout(pollStatus, 3000);
}

// ---------- Navigation mellem visninger ----------

function goto(view) {
  for (const v of $$('.view')) v.hidden = v.dataset.view !== view;
  for (const b of $$('.nav-btn')) b.classList.toggle('active', b.dataset.goto === view);
  window.scrollTo({ top: 0 });
  if (view === 'apps') renderApps();
  if (view === 'settings') renderSettings();
}

// ---------- Top og status ----------

function renderTop() {
  const tv = activeTv();
  const dot = $('#statusDot');
  dot.className = 'dot';
  if (offline) {
    $('#tvName').textContent = 'Ingen forbindelse';
    $('#tvSub').textContent = 'Broen (server.js) svarer ikke';
    dot.classList.add('off');
    return;
  }
  if (!tv) {
    $('#tvName').textContent = 'Intet TV valgt';
    $('#tvSub').textContent = 'Tryk for at tilføje dit TV';
    return;
  }
  $('#tvName').textContent = tv.name;
  let sub = state.types[tv.type] || tv.type;
  const st = status[tv.id];
  if (st) {
    if (st.needsPair) sub = 'Ikke forbundet endnu';
    else if (!st.online) {
      sub = 'Slukket eller ikke fundet';
      dot.classList.add('off');
    } else if (st.power === 'standby') {
      sub = 'Standby';
      dot.classList.add('standby');
    } else {
      dot.classList.add('on');
      sub = 'Tændt' + (st.app ? ` · ${prettyApp(st.app)}` : '') + (st.channel && tv.type === 'demo' ? ` · kanal ${st.channel}` : '');
    }
  }
  if (state.sleep && state.sleep.tvId === tv.id) {
    const min = Math.max(0, Math.ceil((state.sleep.endsAt - Date.now()) / 60000));
    sub += ` · 🌙 ${min} min`;
  }
  $('#tvSub').textContent = sub;

  const meter = $('#volMeter');
  if (st && st.online && typeof st.volume === 'number') {
    meter.hidden = false;
    meter.classList.toggle('muted', !!st.muted);
    $('#volFill').style.width = `${Math.min(100, st.volume)}%`;
    $('#volText').textContent = st.muted ? 'Lydløs' : st.volume;
  } else {
    meter.hidden = true;
  }
}

function prettyApp(app) {
  const s = String(app);
  const hit = state.catalog.find((c) => s.toLowerCase().includes(c.id) || s.toLowerCase().includes(c.name.toLowerCase()));
  if (hit) return hit.name;
  if (s.startsWith('com.webos.app.')) return s.replace('com.webos.app.', '').replace(/^hdmi/, 'HDMI ');
  return s.length > 24 ? s.slice(0, 22) + '…' : s;
}

function renderBanner() {
  const b = $('#banner');
  const tv = activeTv();
  b.hidden = true;
  if (offline) {
    b.hidden = false;
    b.innerHTML = `<span>Kan ikke nå broen. Kør <b>npm start</b> i mappen <b>fjernbetjening</b> på en computer på samme Wi-Fi.</span><button class="btn" id="bannerBtn" type="button">Prøv igen</button><button class="btn primary" id="demoBtn" type="button">Prøv demo</button>`;
    $('#bannerBtn').onclick = loadState;
    $('#demoBtn').onclick = () => {
      demoMode = true;
      loadState().then(pollStatus);
    };
  } else if (demoMode) {
    b.hidden = false;
    b.innerHTML = `<span>🎮 <b>Demo</b> – knapperne styrer et virtuelt TV. Se lydstyrke, kanal og app ændre sig foroven.</span>`;
  } else if (!tv) {
    b.hidden = false;
    b.innerHTML = `<span>Velkommen! Tilføj dit TV for at komme i gang.</span><button class="btn primary" id="bannerBtn" type="button">Tilføj TV</button>`;
    $('#bannerBtn').onclick = () => openTvForm();
  } else if (PAIR_TYPES.has(tv.type) && !tv.paired) {
    b.hidden = false;
    b.innerHTML = `<span>${esc(tv.name)} er ikke forbundet endnu.</span><button class="btn primary" id="bannerBtn" type="button">Forbind</button>`;
    $('#bannerBtn').onclick = () => pairTv(tv);
  }
}

let polling = false;
async function pollStatus() {
  const tv = activeTv();
  if (!tv || offline || polling || document.hidden) return;
  polling = true;
  try {
    status[tv.id] = await api('GET', `/api/tv/${tv.id}/status`);
  } catch (err) {
    if (/broen/.test(err.message)) {
      offline = true;
      renderAll();
    }
  } finally {
    polling = false;
  }
  renderTop();
}

// ---------- Fjernbetjening ----------

function setNav(mode) {
  prefs.nav = mode;
  prefs.save();
  for (const b of $$('[data-nav]')) b.classList.toggle('active', b.dataset.nav === mode);
  $('#dpad').hidden = mode !== 'dpad';
  $('#touchpad').hidden = mode !== 'touch';
  renderMouseToggle();
}

function renderMouseToggle() {
  const tv = activeTv();
  const can = !!tv?.capabilities?.pointer;
  const btn = $('#mouseToggle');
  btn.hidden = !can;
  const on = can && prefs.mouse;
  btn.classList.toggle('on', on);
  btn.textContent = `Musemarkør: ${on ? 'til' : 'fra'}`;
  $('#touchHint').textContent = on ? 'Træk for at flytte markøren · Tryk for at klikke' : 'Stryg for at navigere · Tryk for OK · Hold for Tilbage';
}

function setPanel(name) {
  prefs.panel = name;
  prefs.save();
  for (const t of $$('.tab')) t.classList.toggle('active', t.dataset.panel === name);
  for (const p of $$('[data-panel-body]')) p.hidden = p.dataset.panelBody !== name;
}

let numBuffer = '';
let numTimer;
function pressDigit(d) {
  numBuffer = (numBuffer + d).slice(-4);
  $('#numDisplay').textContent = numBuffer;
  clearTimeout(numTimer);
  numTimer = setTimeout(() => {
    numBuffer = '';
    $('#numDisplay').innerHTML = '&nbsp;';
  }, 2000);
  sendKey(d);
}

function renderFavChips() {
  const el = $('#favChips');
  if (!state.favorites.length) {
    el.innerHTML = '<p class="muted small">Ingen favoritkanaler endnu.</p>';
    return;
  }
  el.innerHTML = state.favorites
    .map((f) => `<button class="chip" data-fav="${esc(f.id)}" type="button"><b>${esc(f.number)}</b>${esc(f.name)}</button>`)
    .join('');
  for (const b of $$('[data-fav]', el)) {
    b.onclick = () => {
      const f = state.favorites.find((x) => x.id === b.dataset.fav);
      if (f) {
        tvCall('POST', '/macro', { steps: [{ channel: f.number }] }, `Skifter til ${f.name}`);
      }
    };
  }
}

async function openSource() {
  const tv = requireTv();
  if (!tv) return;
  if (!tv.capabilities?.inputs) return sendKey('source');
  openSheet(`<h3>Vælg kilde</h3><div class="list" id="inputList"><div class="row"><div class="spinner"></div><span class="muted">Henter kilder…</span></div></div>`);
  const r = await tvCall('GET', '/inputs');
  const list = $('#inputList');
  if (!list) return;
  if (!r || !r.inputs.length) {
    list.innerHTML = `<div class="row"><span class="muted">Ingen kilder fundet.</span></div>`;
    return;
  }
  list.innerHTML = r.inputs
    .map(
      (i) => `<button class="row clickable" data-input="${esc(i.id)}" type="button" style="width:100%;text-align:left">
        <svg class="ico"><use href="#i-source" /></svg>
        <div class="row-main"><div class="row-title">${esc(i.name)}</div>${i.connected === false ? '<div class="row-sub">Ikke tilsluttet</div>' : ''}</div>
      </button>`,
    )
    .join('');
  for (const b of $$('[data-input]', list)) {
    b.onclick = async () => {
      closeSheet();
      await tvCall('POST', '/input', { id: b.dataset.input }, 'Kilde skiftet');
      setTimeout(pollStatus, 800);
    };
  }
}

// ---------- Touchpad ----------

function setupTouchpad() {
  const pad = $('#touchpad');
  const ripple = $('#touchRipple');
  let start = null;
  let anchor = null;
  let moved = false;
  let longTimer = null;
  let acc = { dx: 0, dy: 0 };
  let sending = false;
  let flushTimer = null;

  const showRipple = (x, y) => {
    const r = pad.getBoundingClientRect();
    ripple.style.left = `${x - r.left}px`;
    ripple.style.top = `${y - r.top}px`;
    ripple.classList.remove('go');
    void ripple.offsetWidth;
    ripple.classList.add('go');
  };

  const mouseMode = () => !!activeTv()?.capabilities?.pointer && prefs.mouse;

  const flush = async () => {
    flushTimer = null;
    if (sending || (!acc.dx && !acc.dy)) return;
    const tv = activeTv();
    if (!tv) return;
    const { dx, dy } = acc;
    acc = { dx: 0, dy: 0 };
    sending = true;
    try {
      await api('POST', `/api/tv/${tv.id}/pointer`, { type: 'move', dx, dy });
    } catch (err) {
      showError(err);
    } finally {
      sending = false;
      if (acc.dx || acc.dy) flushTimer = setTimeout(flush, 30);
    }
  };

  pad.addEventListener('pointerdown', (e) => {
    pad.setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY, t: performance.now() };
    anchor = { x: e.clientX, y: e.clientY };
    moved = false;
    clearTimeout(longTimer);
    if (!mouseMode()) {
      longTimer = setTimeout(() => {
        if (!moved && start) {
          moved = true;
          showRipple(start.x, start.y);
          sendKey('back');
          haptic(30);
        }
      }, 650);
    }
  });

  pad.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = e.clientX - anchor.x;
    const dy = e.clientY - anchor.y;
    if (mouseMode()) {
      if (Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) > 6) moved = true;
      acc.dx += dx * 1.8;
      acc.dy += dy * 1.8;
      anchor = { x: e.clientX, y: e.clientY };
      if (!flushTimer) flushTimer = setTimeout(flush, 30);
      return;
    }
    const T = 38;
    if (Math.abs(dx) < T && Math.abs(dy) < T) return;
    moved = true;
    clearTimeout(longTimer);
    const key = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    anchor = { x: e.clientX, y: e.clientY };
    showRipple(e.clientX, e.clientY);
    sendKey(key);
  });

  const end = (e) => {
    clearTimeout(longTimer);
    if (!start) return;
    const quick = performance.now() - start.t < 400;
    if (!moved && quick && e.type === 'pointerup') {
      showRipple(e.clientX, e.clientY);
      if (mouseMode()) tvCall('POST', '/pointer', { type: 'click' });
      else sendKey('ok');
    }
    start = null;
  };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);

  $('#mouseToggle').addEventListener('pointerdown', (e) => e.stopPropagation());
  $('#mouseToggle').onclick = (e) => {
    e.stopPropagation();
    prefs.mouse = !prefs.mouse;
    prefs.save();
    renderMouseToggle();
  };
}

// ---------- Apps og genveje ----------

function renderApps() {
  const grid = $('#appGrid');
  grid.innerHTML = state.catalog
    .map(
      (a) => `<button class="app-tile" style="--c:${esc(a.color)}" data-letter="${esc(a.name[0])}" data-app="${esc(a.id)}" type="button">${esc(a.name)}</button>`,
    )
    .join('');
  for (const b of $$('[data-app]', grid)) {
    b.onclick = () => launchApp(b.dataset.app, b.textContent);
  }
  renderMacros();
}

async function launchApp(id, name) {
  toast(`Åbner ${name}…`);
  const r = await tvCall('POST', '/launch', { app: id });
  if (r) {
    toast(`${name} åbnet`);
    setTimeout(pollStatus, 1500);
  }
}

function renderMacros() {
  const el = $('#macroList');
  if (!state.macros.length) {
    el.innerHTML = '<p class="muted small">Ingen genveje endnu. Lav fx en "Filmaften", der tænder TV\'et og åbner Netflix.</p>';
    return;
  }
  el.innerHTML = state.macros
    .map(
      (m) => `<div class="macro" data-macro="${esc(m.id)}" role="button" tabindex="0">
        <span class="macro-icon">${esc(m.icon)}</span>
        <span class="macro-name">${esc(m.name)}</span>
        <button class="icon-btn" data-edit-macro="${esc(m.id)}" type="button" aria-label="Ret"><svg class="ico sm"><use href="#i-edit" /></svg></button>
      </div>`,
    )
    .join('');
  for (const m of $$('[data-macro]', el)) {
    m.onclick = async (e) => {
      if (e.target.closest('[data-edit-macro]')) return;
      const macro = state.macros.find((x) => x.id === m.dataset.macro);
      if (!macro) return;
      toast(`${macro.icon} ${macro.name}…`);
      const r = await tvCall('POST', '/macro', { id: macro.id });
      if (r) {
        toast(`${macro.icon} ${macro.name} udført`);
        if (macro.steps.some((s) => s.sleep !== undefined)) loadState();
      }
    };
  }
  for (const b of $$('[data-edit-macro]', el)) {
    b.onclick = () => openMacroEditor(state.macros.find((x) => x.id === b.dataset.editMacro));
  }
}

async function loadTvApps() {
  const el = $('#tvApps');
  el.innerHTML = '<div class="row"><div class="spinner"></div><span class="muted">Henter apps fra TV\'et…</span></div>';
  const r = await tvCall('GET', '/apps');
  if (!r) {
    el.innerHTML = '<div class="row"><span class="muted">Kunne ikke hente apps.</span></div>';
    return;
  }
  const apps = [...r.apps].sort((a, b) => String(a.name).localeCompare(String(b.name), 'da'));
  el.innerHTML = apps.length
    ? apps
        .map(
          (a) => `<button class="row clickable" data-rawapp="${esc(a.id)}" type="button" style="width:100%;text-align:left">
            <svg class="ico"><use href="#i-apps" /></svg>
            <div class="row-main"><div class="row-title">${esc(a.name)}</div></div>
          </button>`,
        )
        .join('')
    : '<div class="row"><span class="muted">Ingen apps fundet.</span></div>';
  for (const b of $$('[data-rawapp]', el)) {
    b.onclick = () => launchApp(b.dataset.rawapp, b.textContent.trim());
  }
}

const STEP_TYPES = {
  key: 'Tryk på knap',
  channel: 'Skift kanal',
  app: 'Åbn app',
  text: 'Skriv tekst',
  wait: 'Vent',
  power: 'Tænd/sluk',
  sleep: 'Sleep-timer',
};

function stepType(s) {
  return Object.keys(STEP_TYPES).find((k) => s[k] !== undefined) || 'key';
}

function stepEditor(step, i) {
  const type = stepType(step);
  const opts = Object.entries(STEP_TYPES)
    .map(([k, v]) => `<option value="${k}" ${k === type ? 'selected' : ''}>${v}</option>`)
    .join('');
  let value = '';
  if (type === 'key') {
    value = `<select data-f="key">${Object.entries(KEY_LABELS)
      .map(([k, v]) => `<option value="${k}" ${k === step.key ? 'selected' : ''}>${esc(v)}</option>`)
      .join('')}</select>
      <input data-f="times" type="number" min="1" max="20" value="${step.times || 1}" style="width:64px" aria-label="Antal gange" />`;
  } else if (type === 'channel') {
    value = `<input data-f="channel" inputmode="numeric" placeholder="Kanalnr." value="${esc(step.channel || '')}" />`;
  } else if (type === 'app') {
    value = `<select data-f="app">${state.catalog
      .map((a) => `<option value="${a.id}" ${a.id === step.app ? 'selected' : ''}>${esc(a.name)}</option>`)
      .join('')}</select>`;
  } else if (type === 'text') {
    value = `<input data-f="text" placeholder="Tekst" value="${esc(step.text || '')}" />`;
  } else if (type === 'wait') {
    value = `<input data-f="wait" type="number" min="0.5" max="60" step="0.5" value="${(step.wait || 2000) / 1000}" style="width:80px" /><span class="muted small">sek.</span>`;
  } else if (type === 'power') {
    value = `<select data-f="power"><option value="on" ${step.power !== 'off' ? 'selected' : ''}>Tænd</option><option value="off" ${step.power === 'off' ? 'selected' : ''}>Sluk</option></select>`;
  } else if (type === 'sleep') {
    value = `<input data-f="sleep" type="number" min="0" max="240" value="${step.sleep ?? 30}" style="width:80px" /><span class="muted small">min.</span>`;
  }
  return `<div class="step-row" data-step="${i}">
    <span class="step-num">${i + 1}</span>
    <select data-f="type" style="width:auto;flex:none">${opts}</select>
    ${value}
    <button class="icon-btn" data-del-step="${i}" type="button" aria-label="Fjern trin"><svg class="ico sm"><use href="#i-trash" /></svg></button>
  </div>`;
}

function openMacroEditor(macro) {
  const draft = macro ? structuredClone(macro) : { id: null, name: '', icon: '⭐', steps: [{ key: 'home' }] };

  const readSteps = () =>
    $$('[data-step]').map((row) => {
      const get = (f) => $(`[data-f="${f}"]`, row)?.value;
      const type = get('type');
      if (type === 'key') return { key: get('key') || 'ok', times: Math.max(1, Number(get('times')) || 1) };
      if (type === 'channel') return { channel: (get('channel') || '').replace(/\D/g, '') };
      if (type === 'app') return { app: get('app') || state.catalog[0]?.id };
      if (type === 'text') return { text: get('text') || '' };
      if (type === 'wait') return { wait: Math.round((Number(get('wait')) || 2) * 1000) };
      if (type === 'power') return { power: get('power') || 'on' };
      if (type === 'sleep') return { sleep: Number(get('sleep')) || 0 };
      return { key: 'ok' };
    });

  const render = () => {
    openSheet(`
      <h3>${macro ? 'Ret genvej' : 'Ny genvej'}</h3>
      <div class="form">
        <div class="step-row">
          <input id="mIcon" value="${esc(draft.icon)}" style="width:58px;text-align:center;font-size:20px" aria-label="Ikon (emoji)" />
          <input id="mName" value="${esc(draft.name)}" placeholder="Navn, fx Filmaften" />
        </div>
        <div class="field"><label>Trin – udføres i rækkefølge</label>
          <div class="form" id="steps">${draft.steps.map(stepEditor).join('')}</div>
        </div>
        <button class="btn" id="addStep" type="button"><svg class="ico sm"><use href="#i-plus" /></svg> Tilføj trin</button>
        <div class="form-actions">
          ${macro ? '<button class="btn danger" id="mDelete" type="button">Slet</button>' : ''}
          <button class="btn" id="mTest" type="button">Afprøv</button>
          <button class="btn primary" id="mSave" type="button">Gem</button>
        </div>
      </div>`);
    const sync = () => {
      draft.name = $('#mName').value;
      draft.icon = $('#mIcon').value;
      draft.steps = readSteps();
    };
    for (const sel of $$('[data-f="type"]')) {
      sel.onchange = () => {
        sync();
        const i = Number(sel.closest('[data-step]').dataset.step);
        const defaults = { key: { key: 'ok' }, channel: { channel: '' }, app: { app: state.catalog[0]?.id }, text: { text: '' }, wait: { wait: 2000 }, power: { power: 'on' }, sleep: { sleep: 30 } };
        draft.steps[i] = defaults[sel.value];
        render();
      };
    }
    for (const b of $$('[data-del-step]')) {
      b.onclick = () => {
        sync();
        draft.steps.splice(Number(b.dataset.delStep), 1);
        render();
      };
    }
    $('#addStep').onclick = () => {
      sync();
      draft.steps.push({ key: 'ok' });
      render();
    };
    $('#mTest').onclick = async () => {
      sync();
      toast('Afprøver…');
      if (await tvCall('POST', '/macro', { steps: draft.steps })) toast('Genvejen virker');
    };
    $('#mSave').onclick = async () => {
      sync();
      if (!draft.name.trim()) return toast('Giv genvejen et navn', { error: true });
      const list = macro ? state.macros.map((m) => (m.id === macro.id ? draft : m)) : [...state.macros, draft];
      try {
        state.macros = await api('PUT', '/api/macros', list);
        closeSheet();
        renderMacros();
        toast('Genvej gemt');
      } catch (err) {
        showError(err);
      }
    };
    if (macro) {
      $('#mDelete').onclick = async () => {
        if (!askConfirm(`Slet "${macro.name}"?`)) return;
        state.macros = await api('PUT', '/api/macros', state.macros.filter((m) => m.id !== macro.id));
        closeSheet();
        renderMacros();
      };
    }
  };
  render();
}

// ---------- Tekst ----------

function renderHistory() {
  const el = $('#textHistory');
  el.innerHTML = prefs.history.length
    ? prefs.history.map((t, i) => `<button class="chip" data-hist="${i}" type="button">${esc(t)}</button>`).join('')
    : '<span class="muted small">Det du sender, gemmes her til næste gang.</span>';
  for (const b of $$('[data-hist]', el)) b.onclick = () => ($('#textInput').value = prefs.history[Number(b.dataset.hist)]);
}

async function sendText(enter) {
  const input = $('#textInput');
  const text = input.value.trim();
  if (!text) return toast('Skriv noget først');
  const r = await tvCall('POST', '/text', { text, enter }, 'Sendt til TV\'et');
  if (r) {
    prefs.history = [text, ...prefs.history.filter((t) => t !== text)].slice(0, 8);
    prefs.save();
    input.value = '';
    renderHistory();
  }
}

function setupMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = $('#micBtn');
  if (!SR || window.FJERN_DEMO) return;
  btn.hidden = false;
  let rec = null;
  btn.onclick = () => {
    if (rec) {
      rec.stop();
      return;
    }
    try {
      rec = new SR();
    } catch {
      return toast('Talegenkendelse er ikke tilgængelig', { error: true });
    }
    rec.lang = 'da-DK';
    rec.interimResults = true;
    rec.onresult = (e) => {
      $('#textInput').value = [...e.results].map((r) => r[0].transcript).join('');
    };
    rec.onerror = (e) => toast(e.error === 'not-allowed' ? 'Giv adgang til mikrofonen' : 'Talegenkendelse fejlede', { error: true });
    rec.onend = () => {
      btn.classList.remove('listening');
      rec = null;
    };
    btn.classList.add('listening');
    rec.start();
  };
}

// ---------- Indstillinger ----------

function renderSettings() {
  renderTvList();
  renderFavList();
  renderSleep();
  $('#optHaptics').checked = prefs.haptics;
  $('#optRepeat').checked = prefs.repeat;
  $('#optKeys').checked = prefs.keys;
}

function renderTvList() {
  const el = $('#tvList');
  if (offline) {
    el.innerHTML = '<div class="row"><span class="muted">Ingen forbindelse til broen.</span></div>';
    return;
  }
  if (!state.tvs.length) {
    el.innerHTML = '<div class="row"><span class="muted">Ingen TV\'er endnu. Tryk "Tilføj TV".</span></div>';
    return;
  }
  el.innerHTML = state.tvs
    .map((tv) => {
      const active = tv.id === state.activeId;
      const needsPair = PAIR_TYPES.has(tv.type) && !tv.paired;
      return `<div class="row clickable" data-tv="${esc(tv.id)}">
        <svg class="ico"><use href="#i-tv" /></svg>
        <div class="row-main">
          <div class="row-title">${esc(tv.name)}</div>
          <div class="row-sub">${esc(state.types[tv.type] || tv.type)}${tv.ip ? ' · ' + esc(tv.ip) : ''}${tv.mac ? '' : tv.capabilities?.wol ? ' · ingen MAC' : ''}</div>
        </div>
        ${needsPair ? `<button class="badge warn" data-pair="${esc(tv.id)}" type="button">Forbind</button>` : ''}
        ${active ? '<span class="badge">Aktiv</span>' : ''}
        <button class="icon-btn" data-edit-tv="${esc(tv.id)}" type="button" aria-label="Ret"><svg class="ico sm"><use href="#i-edit" /></svg></button>
      </div>`;
    })
    .join('');
  for (const row of $$('[data-tv]', el)) {
    row.onclick = async (e) => {
      if (e.target.closest('[data-edit-tv],[data-pair]')) return;
      await selectTv(row.dataset.tv);
      toast(`${activeTv()?.name} valgt`);
    };
  }
  for (const b of $$('[data-edit-tv]', el)) b.onclick = () => openTvForm(state.tvs.find((t) => t.id === b.dataset.editTv));
  for (const b of $$('[data-pair]', el)) b.onclick = () => pairTv(state.tvs.find((t) => t.id === b.dataset.pair));
}

async function selectTv(id) {
  try {
    await api('POST', '/api/active', { id });
    state.activeId = id;
    renderAll();
    pollStatus();
  } catch (err) {
    showError(err);
  }
}

async function pairTv(tv) {
  if (!tv) return;
  const msg = {
    samsung: 'Kig på TV\'et og vælg "Tillad"…',
    lg: 'Kig på TV\'et og tryk "Accepter" med den rigtige fjernbetjening…',
    sony: 'Forbinder med din Pre-Shared Key…',
  }[tv.type] || 'Forbinder…';
  toast(msg, { ms: 60000 });
  try {
    await api('POST', `/api/tv/${tv.id}/pair`);
    toast(`Forbundet til ${tv.name} 🎉`);
  } catch (err) {
    toast(err.message, { error: true, ms: 5000 });
  }
  await loadState();
  pollStatus();
}

function openTvForm(tv) {
  const types = Object.entries(state.types);
  openSheet(`
    <h3>${tv ? 'Ret TV' : 'Tilføj TV'}</h3>
    ${tv ? '' : `<button class="btn" id="discoverBtn" type="button" style="width:100%;margin-bottom:10px"><svg class="ico sm"><use href="#i-search" /></svg> Find TV'er på netværket</button>
    <div class="list" id="foundList" hidden style="margin-bottom:12px"></div>`}
    <div class="form">
      <div class="field"><label for="fType">Mærke / type</label>
        <select id="fType">${types.map(([k, v]) => `<option value="${k}" ${tv?.type === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>
      </div>
      <div class="field"><label for="fName">Navn</label><input id="fName" value="${esc(tv?.name || '')}" placeholder="Fx Stue-TV" /></div>
      <div class="field" id="ipField"><label for="fIp">IP-adresse</label><input id="fIp" inputmode="decimal" value="${esc(tv?.ip || '')}" placeholder="Fx 192.168.1.42" />
        <div class="hint">Findes i TV'ets netværksindstillinger. Giv gerne TV'et en fast IP i routeren.</div></div>
      <div class="field" id="macField"><label for="fMac">MAC-adresse (til at tænde TV'et)</label><input id="fMac" value="${esc(tv?.mac || '')}" placeholder="Hentes automatisk når det er muligt" autocapitalize="off" />
        <div class="hint">Slå "Tænd via Wi-Fi/netværk" (Wake-on-LAN) til på TV'et.</div></div>
      <div class="field" id="pskField"><label for="fPsk">Pre-Shared Key</label><input id="fPsk" placeholder="${tv?.hasPsk ? '•••• (uændret)' : 'Fx 0000'}" autocapitalize="off" />
        <div class="hint">På TV'et: Indstillinger → Netværk → Hjemmenetværk → IP-kontrol. Sæt godkendelse til "Normal og Pre-Shared Key".</div></div>
      <div class="hint muted small" id="typeHint"></div>
      <div class="form-actions">
        ${tv ? '<button class="btn danger" id="fDelete" type="button">Slet</button>' : ''}
        <button class="btn primary" id="fSave" type="button">${tv ? 'Gem' : 'Tilføj'}</button>
      </div>
    </div>`);

  const HINTS = {
    samsung: 'Når du gemmer, viser TV\'et en dialog – vælg "Tillad".',
    lg: 'Når du gemmer, viser TV\'et en dialog – accepter med den rigtige fjernbetjening. Slå "LG Connect Apps"/"Mobil-TV til" til, hvis det ikke virker.',
    sony: 'Kræver at IP-kontrol er slået til på TV\'et.',
    roku: 'Slå "Styring via mobilapps" til under Indstillinger → System → Avanceret.',
    demo: 'Et virtuelt TV, så du kan prøve alle funktioner uden et rigtigt TV.',
  };
  const onType = () => {
    const t = $('#fType').value;
    $('#pskField').hidden = t !== 'sony';
    $('#ipField').hidden = t === 'demo';
    $('#macField').hidden = t === 'demo';
    $('#typeHint').textContent = HINTS[t] || '';
    if (!$('#fName').value || Object.values(state.types).includes($('#fName').dataset.auto)) {
      const def = { samsung: 'Samsung TV', lg: 'LG TV', sony: 'Sony TV', roku: 'Roku', demo: 'Demo-TV' }[t];
      $('#fName').value = tv?.name || def;
      $('#fName').dataset.auto = def;
    }
  };
  $('#fType').onchange = onType;
  onType();

  $('#discoverBtn')?.addEventListener('click', async () => {
    const list = $('#foundList');
    list.hidden = false;
    list.innerHTML = '<div class="row"><div class="spinner"></div><span class="muted">Søger på netværket (ca. 4 sek.)…</span></div>';
    try {
      const { devices } = await api('GET', '/api/discover');
      if (!devices.length) {
        list.innerHTML = '<div class="row"><span class="muted small">Ingen TV\'er fundet. Tjek at TV\'et er tændt og på samme netværk – eller indtast IP-adressen herunder.</span></div>';
        return;
      }
      list.innerHTML = devices
        .map(
          (d, i) => `<button class="row clickable" data-found="${i}" type="button" style="width:100%;text-align:left">
            <svg class="ico"><use href="#i-tv" /></svg>
            <div class="row-main"><div class="row-title">${esc(d.name)}</div><div class="row-sub">${esc(state.types[d.type] || d.type)} · ${esc(d.ip)}${d.model ? ' · ' + esc(d.model) : ''}</div></div>
          </button>`,
        )
        .join('');
      for (const b of $$('[data-found]', list)) {
        b.onclick = () => {
          const d = devices[Number(b.dataset.found)];
          $('#fType').value = d.type;
          $('#fName').value = d.name;
          $('#fIp').value = d.ip;
          if (d.mac) $('#fMac').value = d.mac;
          onType();
          $('#fName').value = d.name;
          for (const x of $$('[data-found]', list)) x.style.background = '';
          b.style.background = 'var(--press)';
        };
      }
    } catch (err) {
      list.innerHTML = `<div class="row"><span class="muted small">${esc(err.message)}</span></div>`;
    }
  });

  $('#fSave').onclick = async () => {
    const body = {
      type: $('#fType').value,
      name: $('#fName').value.trim(),
      ip: $('#fIp').value.trim(),
      mac: $('#fMac').value.trim(),
      psk: $('#fPsk').value,
    };
    if (body.type === 'demo') body.ip = '';
    try {
      const saved = tv ? await api('PUT', `/api/tvs/${tv.id}`, body) : await api('POST', '/api/tvs', body);
      closeSheet();
      if (!tv) await api('POST', '/api/active', { id: saved.id });
      await loadState();
      toast(tv ? 'Gemt' : `${saved.name} tilføjet`);
      if (PAIR_TYPES.has(saved.type) && !saved.paired) pairTv(saved);
      else pollStatus();
    } catch (err) {
      showError(err);
    }
  };

  if (tv) {
    $('#fDelete').onclick = async () => {
      if (!askConfirm(`Slet ${tv.name}?`)) return;
      await api('DELETE', `/api/tvs/${tv.id}`);
      closeSheet();
      await loadState();
    };
  }
}

function renderFavList() {
  const el = $('#favList');
  el.innerHTML = state.favorites.length
    ? state.favorites
        .map(
          (f) => `<div class="row"><span class="badge">${esc(f.number)}</span><div class="row-main"><div class="row-title">${esc(f.name)}</div></div>
          <button class="icon-btn" data-del-fav="${esc(f.id)}" type="button" aria-label="Slet"><svg class="ico sm"><use href="#i-trash" /></svg></button></div>`,
        )
        .join('')
    : '<div class="row"><span class="muted">Ingen favoritter.</span></div>';
  for (const b of $$('[data-del-fav]', el)) {
    b.onclick = async () => {
      state.favorites = await api('PUT', '/api/favorites', state.favorites.filter((f) => f.id !== b.dataset.delFav));
      renderFavList();
      renderFavChips();
    };
  }
}

function openFavForm() {
  openSheet(`<h3>Ny favoritkanal</h3>
    <div class="form">
      <div class="field"><label for="favName">Navn</label><input id="favName" placeholder="Fx DR1" /></div>
      <div class="field"><label for="favNum">Kanalnummer</label><input id="favNum" inputmode="numeric" placeholder="Fx 1" /></div>
      <div class="form-actions"><button class="btn primary" id="favSave" type="button">Tilføj</button></div>
    </div>`);
  $('#favSave').onclick = async () => {
    const name = $('#favName').value.trim();
    const number = $('#favNum').value.replace(/\D/g, '');
    if (!name || !number) return toast('Udfyld navn og nummer', { error: true });
    try {
      state.favorites = await api('PUT', '/api/favorites', [...state.favorites, { name, number }]);
      closeSheet();
      renderFavList();
      renderFavChips();
    } catch (err) {
      showError(err);
    }
  };
}

function renderSleep() {
  const s = state.sleep;
  const el = $('#sleepText');
  if (s) {
    const min = Math.max(0, Math.ceil((s.endsAt - Date.now()) / 60000));
    const at = new Date(s.endsAt).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
    el.innerHTML = `🌙 TV'et slukker kl. <b>${at}</b> (om ${min} min).`;
  } else {
    el.textContent = 'Slukker TV\'et automatisk efter et valgt tidsrum.';
  }
  for (const c of $$('[data-sleep]')) c.classList.toggle('active', !!s && Number(c.dataset.sleep) === s.minutes);
}

async function setSleep(minutes) {
  const tv = requireTv();
  if (!tv) return;
  try {
    state.sleep = await api('POST', '/api/sleep', { tvId: tv.id, minutes });
    renderSleep();
    renderTop();
    toast(minutes ? `Sleep-timer: ${minutes} min` : 'Sleep-timer annulleret');
  } catch (err) {
    showError(err);
  }
}

// ---------- Ark ----------

function openSheet(html) {
  $('#sheetContent').innerHTML = html;
  $('#sheet').hidden = false;
  $('#sheetBackdrop').hidden = false;
}

function closeSheet() {
  $('#sheet').hidden = true;
  $('#sheetBackdrop').hidden = true;
  $('#sheetContent').innerHTML = '';
}

function openTvSheet() {
  if (offline) return loadState();
  if (!state.tvs.length) return openTvForm();
  openSheet(`<h3>Vælg TV</h3>
    <div class="list">${state.tvs
      .map(
        (tv) => `<button class="row clickable" data-pick="${esc(tv.id)}" type="button" style="width:100%;text-align:left">
          <svg class="ico"><use href="#i-tv" /></svg>
          <div class="row-main"><div class="row-title">${esc(tv.name)}</div><div class="row-sub">${esc(state.types[tv.type] || tv.type)}</div></div>
          ${tv.id === state.activeId ? '<span class="badge">Aktiv</span>' : ''}
        </button>`,
      )
      .join('')}</div>
    <button class="btn" id="sheetAddTv" type="button" style="width:100%;margin-top:12px"><svg class="ico sm"><use href="#i-plus" /></svg> Tilføj TV</button>`);
  for (const b of $$('[data-pick]')) {
    b.onclick = () => {
      closeSheet();
      selectTv(b.dataset.pick);
    };
  }
  $('#sheetAddTv').onclick = () => openTvForm();
}

// ---------- Tastatur (computer) ----------

function setupKeyboard() {
  const map = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'ok',
    Backspace: 'back', Escape: 'back', h: 'home', m: 'mute', '+': 'vol_up', '-': 'vol_down',
    PageUp: 'ch_up', PageDown: 'ch_down', ' ': 'play_pause', i: 'info', g: 'guide',
  };
  for (let i = 0; i <= 9; i++) map[String(i)] = String(i);
  document.addEventListener('keydown', (e) => {
    if (!prefs.keys || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest('input, textarea, select')) return;
    if (!$('#sheet').hidden) {
      if (e.key === 'Escape') closeSheet();
      return;
    }
    if ($('#view-remote').hidden) return;
    const key = map[e.key];
    if (!key) return;
    e.preventDefault();
    sendKey(key);
  });
}

// ---------- Opstart ----------

function renderAll() {
  renderTop();
  renderBanner();
  renderFavChips();
  renderMouseToggle();
  if (!$('#view-apps').hidden) renderApps();
  if (!$('#view-settings').hidden) renderSettings();
}

function init() {
  bindKeyButtons();
  for (const b of $$('[data-goto]')) b.onclick = () => goto(b.dataset.goto);
  for (const b of $$('[data-nav]')) b.onclick = () => setNav(b.dataset.nav);
  for (const t of $$('.tab')) t.onclick = () => setPanel(t.dataset.panel);
  for (const b of $$('[data-digit]')) bindPress(b, { onPress: () => pressDigit(b.dataset.digit) });
  for (const b of $$('[data-action="source"]')) bindPress(b, { onPress: openSource });
  for (const c of $$('[data-sleep]')) c.onclick = () => setSleep(Number(c.dataset.sleep));

  $('#tvPicker').onclick = openTvSheet;
  $('#sheetBackdrop').onclick = closeSheet;
  $('#addTvBtn').onclick = () => openTvForm();
  $('#addFav').onclick = openFavForm;
  $('#addMacro').onclick = () => openMacroEditor(null);
  $('#loadApps').onclick = loadTvApps;
  $('#sendText').onclick = () => sendText(false);
  $('#sendTextEnter').onclick = () => sendText(true);
  $('#textInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText(true);
    }
  });
  for (const [id, key] of [['#optHaptics', 'haptics'], ['#optRepeat', 'repeat'], ['#optKeys', 'keys']]) {
    $(id).onchange = (e) => {
      prefs[key] = e.target.checked;
      prefs.save();
    };
  }

  setupTouchpad();
  setupMic();
  setupKeyboard();
  setNav(prefs.nav);
  setPanel(prefs.panel);
  renderHistory();

  loadState().then(pollStatus);
  setInterval(pollStatus, 3000);
  setInterval(() => {
    if (offline) loadState();
    else if (state.sleep && state.sleep.endsAt < Date.now()) loadState();
    renderTop();
    if (!$('#view-settings').hidden) renderSleep();
  }, 15000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) loadState().then(pollStatus);
  });

  if ('serviceWorker' in navigator && window.isSecureContext && !window.FJERN_DEMO) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

init();
