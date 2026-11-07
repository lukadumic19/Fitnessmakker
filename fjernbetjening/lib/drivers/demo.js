// Et virtuelt TV til at prøve app'en uden et rigtigt TV.
import { BaseDriver, KEYS, Unsupported } from './base.js';
import { APP_CATALOG } from '../apps.js';

const INPUTS = [
  { id: 'tv', name: 'TV' },
  { id: 'hdmi1', name: 'HDMI 1 · PlayStation' },
  { id: 'hdmi2', name: 'HDMI 2 · Apple TV' },
  { id: 'hdmi3', name: 'HDMI 3' },
];

export class DemoDriver extends BaseDriver {
  constructor(tv, save) {
    super(tv, save);
    this.state = { power: 'on', volume: 18, muted: false, channel: 1, app: 'TV', input: 'tv', log: [] };
  }

  get capabilities() {
    return { text: true, apps: true, inputs: true, pointer: true, status: true, wol: false };
  }

  _log(text) {
    this.state.log = [text, ...this.state.log].slice(0, 5);
  }

  async key(name) {
    if (!KEYS.includes(name)) throw new Unsupported(`Knappen "${name}"`);
    const s = this.state;
    if (name === 'power') s.power = s.power === 'on' ? 'standby' : 'on';
    else if (s.power !== 'on') throw Object.assign(new Error('Demo-TV\'et er slukket'), { status: 409 });
    if (name === 'vol_up') s.volume = Math.min(100, s.volume + 1);
    if (name === 'vol_down') s.volume = Math.max(0, s.volume - 1);
    if (name === 'vol_up' || name === 'vol_down') s.muted = false;
    if (name === 'mute') s.muted = !s.muted;
    if (name === 'ch_up') s.channel++;
    if (name === 'ch_down') s.channel = Math.max(1, s.channel - 1);
    if (name === 'home') s.app = 'Startskærm';
    this._log(name);
  }

  async text(t) {
    this._log(`tekst: ${t}`);
  }

  async apps() {
    return APP_CATALOG.map((a) => ({ id: a.id, name: a.name }));
  }

  async launchAppId(id) {
    this.state.app = APP_CATALOG.find((a) => a.id === id)?.name || id;
    this._log(`app: ${this.state.app}`);
  }

  async inputs() {
    return INPUTS;
  }

  async setInput(id) {
    this.state.input = id;
    this.state.app = INPUTS.find((i) => i.id === id)?.name || id;
  }

  async pointer({ type }) {
    if (type === 'click') this._log('klik');
  }

  async powerOn() {
    this.state.power = 'on';
  }

  async powerOff() {
    this.state.power = 'standby';
  }

  async status() {
    const s = this.state;
    return { online: true, power: s.power, volume: s.volume, muted: s.muted, app: s.app, channel: s.channel, log: s.log };
  }
}
