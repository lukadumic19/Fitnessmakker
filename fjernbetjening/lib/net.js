// Netværkshjælpere: HTTP med timeout, Wake-on-LAN, SSDP-søgning og MAC-opslag.
import dgram from 'node:dgram';
import fs from 'node:fs/promises';

export async function request(url, { method = 'GET', headers = {}, body, timeout = 4000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { method, headers, body, signal: ctrl.signal });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, json: () => JSON.parse(text) };
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`TV'et svarer ikke (${new URL(url).host})`);
    throw new Error(`Kan ikke nå TV'et (${new URL(url).host}): ${err.cause?.code || err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function normalizeMac(mac) {
  const hex = String(mac || '').replace(/[^0-9a-f]/gi, '');
  if (hex.length !== 12) return null;
  return hex.match(/../g).join(':').toLowerCase();
}

/** Sender en Wake-on-LAN "magic packet" for at tænde TV'et. */
export async function wakeOnLan(mac, ip) {
  const norm = normalizeMac(mac);
  if (!norm) throw new Error('Mangler gyldig MAC-adresse til at tænde TV\'et');
  const bytes = Buffer.from(norm.replace(/:/g, ''), 'hex');
  const packet = Buffer.concat([Buffer.alloc(6, 0xff), ...Array(16).fill(bytes)]);
  const targets = ['255.255.255.255'];
  if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) targets.push(ip.replace(/\.\d+$/, '.255'));
  const sock = dgram.createSocket('udp4');
  await new Promise((res, rej) => sock.bind(() => res()).once('error', rej));
  sock.setBroadcast(true);
  try {
    for (let round = 0; round < 3; round++) {
      for (const t of targets) {
        for (const port of [9, 7]) {
          await new Promise((res) => sock.send(packet, port, t, () => res()));
        }
      }
      await sleep(100);
    }
  } finally {
    sock.close();
  }
}

/** Slår MAC-adressen op i styresystemets ARP-tabel (Linux / Raspberry Pi). */
export async function macFromArp(ip) {
  try {
    const table = await fs.readFile('/proc/net/arp', 'utf8');
    for (const line of table.split('\n').slice(1)) {
      const cols = line.trim().split(/\s+/);
      if (cols[0] === ip && cols[3] && cols[3] !== '00:00:00:00:00:00') return normalizeMac(cols[3]);
    }
  } catch {
    /* ikke tilgængeligt på denne platform */
  }
  return null;
}

const SEARCH_TARGETS = [
  'urn:samsung.com:device:RemoteControlReceiver:1',
  'urn:lge-com:service:webos-second-screen:1',
  'urn:schemas-sony-com:service:ScalarWebAPI:1',
  'roku:ecp',
  'urn:dial-multiscreen-org:service:dial:1',
];

function classify(headers) {
  const all = Object.values(headers).join(' ').toLowerCase();
  if (all.includes('roku')) return 'roku';
  if (all.includes('lge') || all.includes('webos')) return 'lg';
  if (all.includes('samsung')) return 'samsung';
  if (all.includes('sony') || all.includes('bravia')) return 'sony';
  return null;
}

/** Finder TV'er på netværket via SSDP (UPnP). */
export async function discover(timeout = 3000) {
  const found = new Map();
  const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  sock.on('message', (msg, rinfo) => {
    const lines = msg.toString().split(/\r?\n/);
    const headers = {};
    for (const l of lines.slice(1)) {
      const i = l.indexOf(':');
      if (i > 0) headers[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
    }
    const type = classify(headers);
    if (!type) return;
    const prev = found.get(rinfo.address);
    // Foretræk en specifik type frem for en generisk DIAL-træffer
    if (!prev || (prev.weak && !headers.st?.includes('dial'))) {
      found.set(rinfo.address, { ip: rinfo.address, type, location: headers.location, weak: !!headers.st?.includes('dial') });
    }
  });
  await new Promise((res, rej) => sock.bind(() => res()).once('error', rej));
  try {
    sock.setBroadcast(true);
    sock.setMulticastTTL(2);
  } catch {
    /* ignorer */
  }
  for (let round = 0; round < 2; round++) {
    for (const st of SEARCH_TARGETS) {
      const m = `M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: "ssdp:discover"\r\nMX: 2\r\nST: ${st}\r\n\r\n`;
      sock.send(m, 1900, '239.255.255.250');
    }
    await sleep(300);
  }
  await sleep(timeout);
  sock.close();

  const results = await Promise.all(
    [...found.values()].map(async (d) => {
      let name = null;
      let model = null;
      if (d.location) {
        try {
          const r = await request(d.location, { timeout: 2000 });
          name = /<friendlyName>([^<]*)</i.exec(r.text)?.[1] || null;
          model = /<modelName>([^<]*)</i.exec(r.text)?.[1] || null;
        } catch {
          /* ignorer */
        }
      }
      let mac = null;
      if (d.type === 'samsung') {
        try {
          const info = (await request(`http://${d.ip}:8001/api/v2/`, { timeout: 2000 })).json();
          name = info.device?.name || name;
          model = info.device?.modelName || model;
          mac = normalizeMac(info.device?.wifiMac);
        } catch {
          /* ignorer */
        }
      }
      mac = mac || (await macFromArp(d.ip));
      return { ip: d.ip, type: d.type, name: decodeEntities(name) || defaultName(d.type), model, mac };
    }),
  );
  return results.sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
}

function decodeEntities(s) {
  return s && s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function defaultName(type) {
  return { samsung: 'Samsung TV', lg: 'LG TV', sony: 'Sony Bravia', roku: 'Roku' }[type] || 'TV';
}
