// Roku-afspillere og Roku TV via External Control Protocol (HTTP på port 8060).
import { BaseDriver } from './base.js';
import { request } from '../net.js';

const MAP = {
  power: 'Power', vol_up: 'VolumeUp', vol_down: 'VolumeDown', mute: 'VolumeMute',
  ch_up: 'ChannelUp', ch_down: 'ChannelDown',
  up: 'Up', down: 'Down', left: 'Left', right: 'Right', ok: 'Select', back: 'Back', home: 'Home',
  menu: 'Info', info: 'Info', guide: 'Info', exit: 'Home', source: 'InputHDMI1',
  play: 'Play', pause: 'Play', play_pause: 'Play', stop: 'Back', rewind: 'Rev', forward: 'Fwd',
  prev_ch: 'InstantReplay', search: 'Search', settings: 'Info',
};

export class RokuDriver extends BaseDriver {
  get capabilities() {
    return { ...super.capabilities, text: true, apps: true, inputs: true, status: true };
  }

  get base() {
    return `http://${this.tv.ip}:8060`;
  }

  keymap() {
    return MAP;
  }

  async key(name) {
    if (name === 'play_pause') return this.sendKey('Play');
    if (/^[0-9]$/.test(name)) return this.sendKey(`Lit_${name}`);
    return super.key(name);
  }

  async pair() {
    const r = await request(`${this.base}/query/device-info`);
    const mac = /<wifi-mac>([^<]+)</.exec(r.text)?.[1] || /<ethernet-mac>([^<]+)</.exec(r.text)?.[1];
    if (mac && !this.tv.mac) this.save({ mac });
  }

  async sendKey(code) {
    const r = await request(`${this.base}/keypress/${encodeURIComponent(code)}`, { method: 'POST' });
    if (r.status === 403) throw Object.assign(new Error('Slå "Styring via mobilapps" til på Roku\'en'), { status: 403 });
    if (!r.ok) throw Object.assign(new Error(`Roku afviste knappen (${r.status})`), { status: 502 });
  }

  async text(text) {
    for (const ch of text) await this.sendKey(`Lit_${ch}`);
  }

  async _allApps() {
    const r = await request(`${this.base}/query/apps`);
    const apps = [];
    for (const m of r.text.matchAll(/<app\s([^>]*)>([^<]*)<\/app>/g)) {
      const attr = (n) => new RegExp(`${n}="([^"]*)"`).exec(m[1])?.[1];
      if (attr('id')) apps.push({ id: attr('id'), type: attr('type'), name: m[2].replace(/&amp;/g, '&') });
    }
    return apps;
  }

  async apps() {
    return (await this._allApps()).filter((a) => a.type !== 'tvin');
  }

  async launchAppId(id) {
    const r = await request(`${this.base}/launch/${encodeURIComponent(id)}`, { method: 'POST' });
    if (r.status === 404) throw Object.assign(new Error('Appen er ikke installeret'), { status: 404 });
    if (!r.ok) throw Object.assign(new Error(`Roku afviste (${r.status})`), { status: 502 });
  }

  async inputs() {
    const tvin = (await this._allApps()).filter((a) => a.type === 'tvin' || a.id.startsWith('tvinput.'));
    return tvin.length ? tvin : [{ id: 'home', name: 'Startskærm' }];
  }

  async setInput(id) {
    if (id === 'home') return this.sendKey('Home');
    return this.launchAppId(id);
  }

  async powerOn() {
    try {
      await this.sendKey('PowerOn');
    } catch (err) {
      if (!this.tv.mac) throw err;
      await super.powerOn();
    }
  }

  async powerOff() {
    await this.sendKey('PowerOff');
  }

  async status() {
    try {
      const r = await request(`${this.base}/query/active-app`, { timeout: 1500 });
      const app = /<app[^>]*>([^<]*)<\/app>/.exec(r.text)?.[1];
      return { online: true, power: 'on', app };
    } catch {
      return { online: false, power: 'off' };
    }
  }
}
