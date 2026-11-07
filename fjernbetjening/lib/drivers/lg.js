// LG webOS TV via SSAP-protokollen (wss://:3001, ældre modeller ws://:3000).
import { createRequire } from 'node:module';
import { BaseDriver } from './base.js';
import { WSClient } from '../ws.js';

const require = createRequire(import.meta.url);
const PAIRING = require('./lg-pairing.json');

// Knapper sendes via "pointer input"-soklen.
const MAP = {
  vol_up: 'VOLUMEUP', vol_down: 'VOLUMEDOWN', mute: 'MUTE', ch_up: 'CHANNELUP', ch_down: 'CHANNELDOWN',
  up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', ok: 'ENTER', back: 'BACK', home: 'HOME',
  menu: 'MENU', info: 'INFO', guide: 'GUIDE', exit: 'EXIT',
  play: 'PLAY', pause: 'PAUSE', stop: 'STOP', rewind: 'REWIND', forward: 'FASTFORWARD', record: 'RECORD',
  red: 'RED', green: 'GREEN', yellow: 'YELLOW', blue: 'BLUE',
  prev_ch: 'FLASHBACK', ch_list: 'LIST', subtitle: 'CC', settings: 'QMENU', search: 'SEARCH',
  power: '__power', source: '__source',
};
for (let i = 0; i <= 9; i++) MAP[String(i)] = String(i);

export class LgDriver extends BaseDriver {
  constructor(tv, save) {
    super(tv, save);
    this.ws = null;
    this.pointerWs = null;
    this.connecting = null;
    this.nextId = 1;
    this.pending = new Map();
  }

  get capabilities() {
    return { ...super.capabilities, text: true, apps: true, inputs: true, pointer: true, status: true };
  }

  keymap() {
    return MAP;
  }

  async pair() {
    this.close();
    await this.connect(60000);
  }

  connect(timeout = 30000) {
    if (this.ws?.open) return Promise.resolve(this.ws);
    if (this.connecting) return this.connecting;
    this.connecting = this._connect(timeout).finally(() => (this.connecting = null));
    return this.connecting;
  }

  async _connect(timeout) {
    const secureUrl = `wss://${this.tv.ip}:${this.tv.port || 3001}`;
    const plainUrl = `ws://${this.tv.ip}:${this.tv.port || 3000}`;
    const urls = this.tv.secure === false ? [plainUrl] : this.tv.secure === true ? [secureUrl] : [secureUrl, plainUrl];
    let lastErr;
    for (const url of urls) {
      const ws = new WSClient(url, { timeout: 4000 });
      try {
        await ws.connect();
      } catch (err) {
        lastErr = err;
        continue;
      }
      ws.on('message', (raw) => this._onMessage(raw));
      ws.on('close', () => {
        if (this.ws === ws) this.ws = null;
        this.pointerWs?.close();
        this.pointerWs = null;
        for (const [, p] of this.pending) p.reject(new Error('Forbindelsen til TV\'et blev afbrudt'));
        this.pending.clear();
      });
      ws.on('error', () => {});
      this.ws = ws;
      const secure = url.startsWith('wss');
      if (this.tv.secure !== secure) this.save({ secure });
      try {
        await this._register(timeout);
      } catch (err) {
        this.close();
        throw err;
      }
      return ws;
    }
    throw lastErr || new Error('Kunne ikke forbinde til LG TV');
  }

  _onMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    const p = this.pending.get(msg.id);
    if (!p) return;
    if (msg.type === 'error') {
      this.pending.delete(msg.id);
      p.reject(Object.assign(new Error(msg.error || 'Fejl fra TV\'et'), { status: 502 }));
    } else if (p.register) {
      if (msg.type === 'registered') {
        this.pending.delete(msg.id);
        p.resolve(msg.payload);
      }
      // type "response" med pairingType=PROMPT betyder at TV'et viser en dialog – vent videre
    } else {
      this.pending.delete(msg.id);
      if (msg.payload?.returnValue === false) {
        p.reject(Object.assign(new Error(msg.payload.errorText || 'TV\'et afviste kommandoen'), { status: 502 }));
      } else {
        p.resolve(msg.payload || {});
      }
    }
  }

  _register(timeout) {
    return new Promise((resolve, reject) => {
      const id = `register_${this.nextId++}`;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Ingen svar – godkend forbindelsen på TV\'et og prøv igen'));
      }, timeout);
      this.pending.set(id, {
        register: true,
        resolve: (payload) => {
          clearTimeout(timer);
          const key = payload?.['client-key'];
          if (key && key !== this.tv.clientKey) this.save({ clientKey: key });
          resolve();
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      const payload = { ...PAIRING };
      if (this.tv.clientKey) payload['client-key'] = this.tv.clientKey;
      this.ws.send(JSON.stringify({ type: 'register', id, payload }));
    });
  }

  async req(uri, payload = {}) {
    await this.connect();
    const id = `req_${this.nextId++}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('TV\'et svarede ikke'));
      }, 5000);
      this.pending.set(id, {
        resolve: (v) => (clearTimeout(timer), resolve(v)),
        reject: (e) => (clearTimeout(timer), reject(e)),
      });
      this.ws.send(JSON.stringify({ type: 'request', id, uri, payload }));
    });
  }

  async _pointer() {
    if (this.pointerWs?.open) return this.pointerWs;
    const { socketPath } = await this.req('ssap://com.webos.service.networkinput/getPointerInputSocket');
    if (!socketPath) throw new Error('TV\'et gav ingen input-sokkel');
    const ws = new WSClient(socketPath, { timeout: 4000 });
    await ws.connect();
    ws.on('error', () => {});
    ws.on('close', () => this.pointerWs === ws && (this.pointerWs = null));
    this.pointerWs = ws;
    return ws;
  }

  async _pointerSend(type, fields = {}) {
    const ws = await this._pointer();
    const body = [`type:${type}`, ...Object.entries(fields).map(([k, v]) => `${k}:${v}`)].join('\n') + '\n\n';
    ws.send(body);
  }

  async sendKey(code) {
    if (code === '__power') return this.req('ssap://system/turnOff');
    if (code === '__source') {
      // Ingen kilde-knap på webOS – skift til næste kilde i listen
      const list = await this.inputs();
      const { appId } = await this.req('ssap://com.webos.applicationManager/getForegroundAppInfo').catch(() => ({}));
      const idx = list.findIndex((i) => i.appId && i.appId === appId);
      const next = list[(idx + 1) % list.length];
      if (next) return this.setInput(next.id);
      return;
    }
    return this._pointerSend('button', { name: code });
  }

  async pointer({ type, dx = 0, dy = 0 }) {
    if (type === 'move') return this._pointerSend('move', { dx: Math.round(dx), dy: Math.round(dy), down: 0 });
    if (type === 'scroll') return this._pointerSend('scroll', { dx: Math.round(dx), dy: Math.round(dy) });
    if (type === 'click') return this._pointerSend('click');
  }

  async text(text, { enter = false } = {}) {
    await this.req('ssap://com.webos.service.ime/insertText', { text, replace: 0 });
    if (enter) await this.req('ssap://com.webos.service.ime/sendEnterKey');
  }

  async apps() {
    const { launchPoints = [] } = await this.req('ssap://com.webos.applicationManager/listLaunchPoints');
    return launchPoints.map((a) => ({ id: a.id, name: a.title }));
  }

  async launchAppId(id) {
    await this.req('ssap://system.launcher/launch', { id });
  }

  async inputs() {
    const { devices = [] } = await this.req('ssap://tv/getExternalInputList');
    return devices.map((d) => ({ id: d.id, name: d.label || d.id, appId: d.appId, connected: d.connected }));
  }

  async setInput(id) {
    await this.req('ssap://tv/switchInput', { inputId: id });
  }

  async powerOff() {
    await this.req('ssap://system/turnOff');
  }

  async status() {
    // Undgå at TV'et viser en parringsdialog hver gang app'en tjekker status
    if (!this.tv.clientKey) return { online: false, power: 'off', needsPair: true };
    try {
      await this.connect(6000);
    } catch {
      return { online: false, power: 'off' };
    }
    const out = { online: true, power: 'on' };
    try {
      const v = await this.req('ssap://audio/getVolume');
      out.volume = v.volumeStatus?.volume ?? v.volume;
      out.muted = v.volumeStatus?.muteStatus ?? v.muted;
    } catch {
      /* ignorer */
    }
    try {
      const fg = await this.req('ssap://com.webos.applicationManager/getForegroundAppInfo');
      out.app = fg.appId;
    } catch {
      /* ignorer */
    }
    return out;
  }

  async toast(message) {
    await this.req('ssap://system.notifications/createToast', { message });
  }

  close() {
    this.pointerWs?.close();
    this.pointerWs = null;
    this.ws?.close();
    this.ws = null;
  }
}
