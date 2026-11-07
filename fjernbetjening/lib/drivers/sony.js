// Sony Bravia via IP-kontrol (REST + IRCC). Kræver "Pre-Shared Key" sat på TV'et:
// Indstillinger → Netværk → Hjemmenetværk → IP-kontrol → Godkendelse: Normal og Pre-Shared Key.
import { BaseDriver, Unsupported } from './base.js';
import { request } from '../net.js';

// Generisk knap → mulige Sony-navne (det første som TV'et kender, bruges).
const NAMES = {
  power: ['Power', 'TvPower'], vol_up: ['VolumeUp'], vol_down: ['VolumeDown'], mute: ['Mute'],
  ch_up: ['ChannelUp'], ch_down: ['ChannelDown'],
  up: ['Up'], down: ['Down'], left: ['Left'], right: ['Right'], ok: ['Confirm', 'DpadCenter'],
  back: ['Return', 'Back'], home: ['Home'], menu: ['ActionMenu', 'Options', 'SyncMenu'], info: ['Display'],
  guide: ['GGuide', 'EPG'], source: ['Input'], exit: ['Exit'],
  play: ['Play'], pause: ['Pause'], stop: ['Stop'], rewind: ['Rewind'], forward: ['Forward'], record: ['Rec'],
  red: ['Red'], green: ['Green'], yellow: ['Yellow'], blue: ['Blue'],
  prev_ch: ['Jump'], ch_list: ['Tv', 'Digital'], subtitle: ['SubTitle'], settings: ['ActionMenu', 'Options'],
  search: ['Assists', 'GooglePlay'],
};
for (let i = 0; i <= 9; i++) NAMES[String(i)] = [`Num${i}`];

// Reserve-koder hvis TV'et ikke kan levere sin egen liste.
const FALLBACK = {
  Power: 'AAAAAQAAAAEAAAAVAw==', VolumeUp: 'AAAAAQAAAAEAAAASAw==', VolumeDown: 'AAAAAQAAAAEAAAATAw==',
  Mute: 'AAAAAQAAAAEAAAAUAw==', ChannelUp: 'AAAAAQAAAAEAAAAQAw==', ChannelDown: 'AAAAAQAAAAEAAAARAw==',
  Up: 'AAAAAQAAAAEAAAB0Aw==', Down: 'AAAAAQAAAAEAAAB1Aw==', Left: 'AAAAAQAAAAEAAAA0Aw==',
  Right: 'AAAAAQAAAAEAAAAzAw==', Confirm: 'AAAAAQAAAAEAAABlAw==', Home: 'AAAAAQAAAAEAAABgAw==',
  Return: 'AAAAAgAAAJcAAAAjAw==', Options: 'AAAAAgAAAJcAAAA2Aw==', Input: 'AAAAAQAAAAEAAAAlAw==',
  Display: 'AAAAAQAAAAEAAAA6Aw==', Exit: 'AAAAAQAAAAEAAABjAw==',
  Play: 'AAAAAgAAAJcAAAAaAw==', Pause: 'AAAAAgAAAJcAAAAZAw==', Stop: 'AAAAAgAAAJcAAAAYAw==',
  Rewind: 'AAAAAgAAAJcAAAAbAw==', Forward: 'AAAAAgAAAJcAAAAcAw==', Rec: 'AAAAAgAAAJcAAAAgAw==',
  Red: 'AAAAAgAAAJcAAAAlAw==', Green: 'AAAAAgAAAJcAAAAmAw==', Yellow: 'AAAAAgAAAJcAAAAnAw==',
  Blue: 'AAAAAgAAAJcAAAAkAw==', SubTitle: 'AAAAAgAAAJcAAAAoAw==',
  Num1: 'AAAAAQAAAAEAAAAAAw==', Num2: 'AAAAAQAAAAEAAAABAw==', Num3: 'AAAAAQAAAAEAAAACAw==',
  Num4: 'AAAAAQAAAAEAAAADAw==', Num5: 'AAAAAQAAAAEAAAAEAw==', Num6: 'AAAAAQAAAAEAAAAFAw==',
  Num7: 'AAAAAQAAAAEAAAAGAw==', Num8: 'AAAAAQAAAAEAAAAHAw==', Num9: 'AAAAAQAAAAEAAAAIAw==',
  Num0: 'AAAAAQAAAAEAAAAJAw==',
};

export class SonyDriver extends BaseDriver {
  constructor(tv, save) {
    super(tv, save);
    this.codes = null;
  }

  get capabilities() {
    return { ...super.capabilities, text: true, apps: true, inputs: true, status: true };
  }

  get headers() {
    return { 'Content-Type': 'application/json; charset=UTF-8', 'X-Auth-PSK': this.tv.psk || '' };
  }

  async api(service, method, params = [], version = '1.0') {
    const r = await request(`http://${this.tv.ip}/sony/${service}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ method, id: 1, params, version }),
    });
    if (r.status === 403) throw Object.assign(new Error('Forkert Pre-Shared Key (PSK) – tjek indstillingen på TV\'et'), { status: 403 });
    let data;
    try {
      data = r.json();
    } catch {
      throw Object.assign(new Error(`Uventet svar fra TV'et (${r.status})`), { status: 502 });
    }
    if (data.error) {
      const [code, text] = data.error;
      if (code === 40005) throw Object.assign(new Error('TV\'et er slukket'), { status: 409 });
      throw Object.assign(new Error(`Sony-fejl ${code}: ${text}`), { status: 502 });
    }
    return data.result || [];
  }

  async pair() {
    if (!this.tv.psk) throw Object.assign(new Error('Indtast den Pre-Shared Key der er sat på TV\'et'), { status: 400 });
    await this.api('system', 'getPowerStatus');
    this.codes = null;
    await this._codes();
    try {
      const [info] = await this.api('system', 'getSystemInformation');
      if (info?.macAddr && !this.tv.mac) this.save({ mac: info.macAddr.toLowerCase() });
    } catch {
      /* ignorer */
    }
  }

  async _codes() {
    if (this.codes) return this.codes;
    try {
      const res = await this.api('system', 'getRemoteControllerInfo');
      const list = res[1] || [];
      this.codes = Object.fromEntries(list.map((c) => [c.name, c.value]));
    } catch (err) {
      if (err.status === 403) throw err;
      return FALLBACK;
    }
    return this.codes;
  }

  async key(name) {
    if (name === 'power') {
      const st = await this.status();
      if (st.power === 'on') return this.powerOff();
      return this.powerOn();
    }
    if (name === 'play_pause') return super.key(name);
    const codes = await this._codes();
    const candidates = NAMES[name];
    const code = candidates?.map((n) => codes[n] || FALLBACK[n]).find(Boolean);
    if (!code) throw new Unsupported(`Knappen "${name}"`);
    return this.sendKey(code);
  }

  async sendKey(code) {
    const body =
      '<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" ' +
      's:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body>' +
      '<u:X_SendIRCC xmlns:u="urn:schemas-sony-com:service:IRCC:1">' +
      `<IRCCCode>${code}</IRCCCode></u:X_SendIRCC></s:Body></s:Envelope>`;
    const r = await request(`http://${this.tv.ip}/sony/IRCC`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=UTF-8',
        SOAPACTION: '"urn:schemas-sony-com:service:IRCC:1#X_SendIRCC"',
        'X-Auth-PSK': this.tv.psk || '',
      },
      body,
    });
    if (r.status === 403) throw Object.assign(new Error('Forkert Pre-Shared Key (PSK)'), { status: 403 });
    if (!r.ok) throw Object.assign(new Error(`TV'et afviste knappen (${r.status})`), { status: 502 });
  }

  async text(text) {
    await this.api('appControl', 'setTextForm', [text]);
  }

  async apps() {
    const [list = []] = await this.api('appControl', 'getApplicationList');
    return list.map((a) => ({ id: a.uri, name: a.title }));
  }

  async launchAppId(uri) {
    await this.api('appControl', 'setActiveApp', [{ uri }]);
  }

  async inputs() {
    const [list = []] = await this.api('avContent', 'getCurrentExternalInputsStatus');
    return list.map((i) => ({ id: i.uri, name: i.label || i.title, connected: i.connection }));
  }

  async setInput(uri) {
    await this.api('avContent', 'setPlayContent', [{ uri }]);
  }

  async powerOn() {
    try {
      await this.api('system', 'setPowerStatus', [{ status: true }]);
    } catch (err) {
      if (!this.tv.mac) throw err;
    }
    if (this.tv.mac) await super.powerOn();
  }

  async powerOff() {
    await this.api('system', 'setPowerStatus', [{ status: false }]);
  }

  async status() {
    let power;
    try {
      const [p] = await this.api('system', 'getPowerStatus');
      power = p?.status === 'active' ? 'on' : 'standby';
    } catch (err) {
      return { online: false, power: 'off', error: err.status === 403 ? err.message : undefined };
    }
    const out = { online: true, power };
    if (power === 'on') {
      try {
        const [vols = []] = await this.api('audio', 'getVolumeInformation');
        const v = vols.find((x) => x.target === 'speaker') || vols[0];
        if (v) Object.assign(out, { volume: v.volume, muted: v.mute });
      } catch {
        /* ignorer */
      }
    }
    return out;
  }
}
