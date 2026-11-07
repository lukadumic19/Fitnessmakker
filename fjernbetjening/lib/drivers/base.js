import { wakeOnLan } from '../net.js';
import { findCatalogApp, matchInstalled } from '../apps.js';

/**
 * Fælles knapnavne, som app'en sender. Hver driver oversætter dem til TV'ets egne koder.
 */
export const KEYS = [
  'power', 'vol_up', 'vol_down', 'mute', 'ch_up', 'ch_down',
  'up', 'down', 'left', 'right', 'ok', 'back', 'home', 'menu', 'info', 'guide', 'source', 'exit',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'play', 'pause', 'play_pause', 'stop', 'rewind', 'forward', 'record',
  'red', 'green', 'yellow', 'blue', 'prev_ch', 'ch_list', 'subtitle', 'settings', 'search',
];

export class Unsupported extends Error {
  constructor(what) {
    super(`${what} understøttes ikke af dette TV`);
    this.status = 400;
  }
}

export class BaseDriver {
  /** @param {object} tv gemt TV-konfiguration  @param {(patch:object)=>void} save gemmer ændringer (fx token) */
  constructor(tv, save) {
    this.tv = tv;
    this.save = save;
    this._playing = false;
  }

  /** Hvad dette TV kan – bruges af app'en til at vise/skjule funktioner. */
  get capabilities() {
    return { text: false, apps: false, inputs: false, pointer: false, status: false, wol: true };
  }

  async pair() {}

  async key(name) {
    if (name === 'play_pause') {
      this._playing = !this._playing;
      return this.key(this._playing ? 'play' : 'pause');
    }
    const code = this.keymap()[name];
    if (!code) throw new Unsupported(`Knappen "${name}"`);
    return this.sendKey(code, name);
  }

  keymap() {
    return {};
  }

  async sendKey() {
    throw new Unsupported('Knapper');
  }

  async text() {
    throw new Unsupported('Tekstindtastning');
  }

  async apps() {
    throw new Unsupported('App-listen');
  }

  async launchAppId() {
    throw new Unsupported('At åbne apps');
  }

  /** Åbner en app ud fra et katalog-id (fx "netflix") eller et rå app-id fra TV'et. */
  async launch(app) {
    const entry = typeof app === 'string' ? findCatalogApp(app) : null;
    if (!entry) return this.launchAppId(app);
    const ids = entry.ids?.[this.tv.type] || [];
    let lastErr = null;
    for (const id of ids) {
      try {
        await this.launchAppId(id);
        return;
      } catch (err) {
        lastErr = err;
      }
    }
    let installed;
    try {
      installed = await this.apps();
    } catch (err) {
      throw lastErr || err;
    }
    const hit = matchInstalled(installed, entry);
    if (!hit) throw Object.assign(new Error(`${entry.name} er ikke installeret på TV'et`), { status: 404 });
    return this.launchAppId(hit.id);
  }

  async inputs() {
    throw new Unsupported('Kildelisten');
  }

  async setInput() {
    throw new Unsupported('At skifte kilde');
  }

  async pointer() {
    throw new Unsupported('Musemarkøren');
  }

  async powerOn() {
    if (!this.tv.mac) throw Object.assign(new Error('Tilføj TV\'ets MAC-adresse under Indstillinger for at kunne tænde det'), { status: 400 });
    await wakeOnLan(this.tv.mac, this.tv.ip);
  }

  async powerOff() {
    return this.key('power');
  }

  async status() {
    return {};
  }

  close() {}
}
