// Samsung Smart TV (Tizen, 2016 og nyere) via WebSocket-API'et på port 8002/8001.
import { BaseDriver } from './base.js';
import { WSClient } from '../ws.js';
import { request, normalizeMac } from '../net.js';

const APP_NAME = Buffer.from('Fjernbetjening').toString('base64');

const MAP = {
  power: 'KEY_POWER', vol_up: 'KEY_VOLUP', vol_down: 'KEY_VOLDOWN', mute: 'KEY_MUTE',
  ch_up: 'KEY_CHUP', ch_down: 'KEY_CHDOWN',
  up: 'KEY_UP', down: 'KEY_DOWN', left: 'KEY_LEFT', right: 'KEY_RIGHT', ok: 'KEY_ENTER',
  back: 'KEY_RETURN', home: 'KEY_HOME', menu: 'KEY_MENU', info: 'KEY_INFO', guide: 'KEY_GUIDE',
  source: 'KEY_SOURCE', exit: 'KEY_EXIT',
  play: 'KEY_PLAY', pause: 'KEY_PAUSE', stop: 'KEY_STOP', rewind: 'KEY_REWIND', forward: 'KEY_FF', record: 'KEY_REC',
  red: 'KEY_RED', green: 'KEY_GREEN', yellow: 'KEY_YELLOW', blue: 'KEY_CYAN',
  prev_ch: 'KEY_PRECH', ch_list: 'KEY_CH_LIST', subtitle: 'KEY_CAPTION', settings: 'KEY_TOOLS', search: 'KEY_SEARCH',
};
for (let i = 0; i <= 9; i++) MAP[String(i)] = `KEY_${i}`;

export class SamsungDriver extends BaseDriver {
  constructor(tv, save) {
    super(tv, save);
    this.ws = null;
    this.connecting = null;
    this.waiters = new Set();
  }

  get capabilities() {
    return { ...super.capabilities, text: true, apps: true, status: true };
  }

  keymap() {
    return MAP;
  }

  async pair() {
    this.close();
    await this.connect(45000);
    await this.fetchMac();
  }

  async fetchMac() {
    if (this.tv.mac) return;
    try {
      const info = (await request(`http://${this.tv.ip}:8001/api/v2/`, { timeout: 2500 })).json();
      const mac = normalizeMac(info.device?.wifiMac);
      if (mac) this.save({ mac });
    } catch {
      /* ignorer */
    }
  }

  connect(timeout = 30000) {
    if (this.ws?.open) return Promise.resolve(this.ws);
    if (this.connecting) return this.connecting;
    this.connecting = this._connect(timeout).finally(() => (this.connecting = null));
    return this.connecting;
  }

  async _connect(timeout) {
    const ports = this.tv.port ? [this.tv.port] : [8002, 8001];
    let lastErr;
    for (const port of ports) {
      const proto = port === 8001 ? 'ws' : 'wss';
      const token = this.tv.token ? `&token=${encodeURIComponent(this.tv.token)}` : '';
      const url = `${proto}://${this.tv.ip}:${port}/api/v2/channels/samsung.remote.control?name=${APP_NAME}${token}`;
      const ws = new WSClient(url, { timeout: 4000 });
      try {
        await ws.connect();
      } catch (err) {
        lastErr = err;
        continue;
      }
      // Første gang viser TV'et en dialog "Tillad?" – vent på svar.
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          ws.close();
          reject(new Error('Ingen svar fra TV\'et – godkend forbindelsen på skærmen og prøv igen'));
        }, timeout);
        ws.on('message', (raw) => {
          let msg;
          try {
            msg = JSON.parse(raw);
          } catch {
            return;
          }
          if (msg.event === 'ms.channel.connect') {
            clearTimeout(timer);
            const tok = msg.data?.token;
            const patch = {};
            if (tok && tok !== this.tv.token) patch.token = String(tok);
            if (this.tv.port !== port) patch.port = port;
            if (Object.keys(patch).length) this.save(patch);
            resolve();
          } else if (msg.event === 'ms.channel.unauthorized') {
            clearTimeout(timer);
            ws.close();
            reject(Object.assign(new Error('Forbindelsen blev afvist på TV\'et'), { status: 403 }));
          }
          for (const w of this.waiters) w(msg);
        });
        ws.on('close', () => {
          clearTimeout(timer);
          if (this.ws === ws) this.ws = null;
          reject(new Error('TV\'et lukkede forbindelsen'));
        });
        ws.on('error', () => {});
      });
      this.ws = ws;
      return ws;
    }
    throw lastErr || new Error('Kunne ikke forbinde til Samsung TV');
  }

  async send(msg) {
    const ws = await this.connect();
    ws.send(JSON.stringify(msg));
  }

  async sendKey(code) {
    await this.send({
      method: 'ms.remote.control',
      params: { Cmd: 'Click', DataOfCmd: code, Option: 'false', TypeOfRemote: 'SendRemoteKey' },
    });
  }

  async text(text) {
    await this.send({
      method: 'ms.remote.control',
      params: { Cmd: Buffer.from(text).toString('base64'), DataOfCmd: 'base64', TypeOfRemote: 'SendInputString' },
    });
  }

  _waitFor(event, timeout = 4000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters.delete(fn);
        reject(new Error('TV\'et svarede ikke'));
      }, timeout);
      const fn = (msg) => {
        if (msg.event === event) {
          clearTimeout(timer);
          this.waiters.delete(fn);
          resolve(msg);
        }
      };
      this.waiters.add(fn);
    });
  }

  async apps() {
    const wait = this._waitFor('ed.installedApp.get');
    await this.send({ method: 'ms.channel.emit', params: { event: 'ed.installedApp.get', to: 'host', data: '' } });
    const msg = await wait;
    return (msg.data?.data || []).map((a) => ({ id: a.appId, name: a.name, type: a.app_type }));
  }

  async launchAppId(id) {
    // REST-kaldet virker på de fleste modeller; ellers bruges WebSocket.
    try {
      const r = await request(`http://${this.tv.ip}:8001/api/v2/applications/${encodeURIComponent(id)}`, { method: 'POST', timeout: 3000 });
      if (r.ok) return;
      if (r.status === 404) throw Object.assign(new Error('Appen findes ikke på TV\'et'), { status: 404 });
    } catch (err) {
      if (err.status === 404) throw err;
    }
    await this.send({
      method: 'ms.channel.emit',
      params: { event: 'ed.apps.launch', to: 'host', data: { appId: id, action_type: 'DEEP_LINK' } },
    });
  }

  async powerOff() {
    const st = await this.status();
    if (st.power === 'standby') return;
    return this.key('power');
  }

  async status() {
    try {
      const info = (await request(`http://${this.tv.ip}:8001/api/v2/`, { timeout: 1500 })).json();
      const power = info.device?.PowerState === 'standby' ? 'standby' : 'on';
      return { online: true, power, model: info.device?.modelName };
    } catch {
      return { online: false, power: 'off' };
    }
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}
