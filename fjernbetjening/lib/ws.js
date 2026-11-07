// Minimal WebSocket-klient (RFC 6455) uden afhængigheder.
// TV'er bruger selvsignerede certifikater på wss://, så certifikatet kontrolleres
// ikke – forbindelsen går kun til TV'et på det lokale netværk.
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export class WSClient extends EventEmitter {
  constructor(url, { timeout = 5000 } = {}) {
    super();
    this.url = new URL(url);
    this.timeout = timeout;
    this.socket = null;
    this.open = false;
    this._buf = Buffer.alloc(0);
    this._frag = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const secure = this.url.protocol === 'wss:';
      const port = Number(this.url.port) || (secure ? 443 : 80);
      const host = this.url.hostname;
      const key = crypto.randomBytes(16).toString('base64');
      let done = false;
      const fail = (err) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.socket?.destroy();
        reject(err);
      };
      const timer = setTimeout(() => fail(new Error(`Timeout ved forbindelse til ${host}:${port}`)), this.timeout);

      const onConnect = () => {
        const path = this.url.pathname + this.url.search;
        this.socket.write(
          `GET ${path} HTTP/1.1\r\n` +
            `Host: ${host}:${port}\r\n` +
            'Upgrade: websocket\r\n' +
            'Connection: Upgrade\r\n' +
            `Sec-WebSocket-Key: ${key}\r\n` +
            'Sec-WebSocket-Version: 13\r\n\r\n',
        );
      };

      this.socket = secure
        ? tls.connect({ host, port, rejectUnauthorized: false, servername: net.isIP(host) ? undefined : host }, onConnect)
        : net.connect({ host, port }, onConnect);
      this.socket.setNoDelay(true);

      let header = Buffer.alloc(0);
      const onHandshake = (chunk) => {
        header = Buffer.concat([header, chunk]);
        const end = header.indexOf('\r\n\r\n');
        if (end === -1) return;
        this.socket.off('data', onHandshake);
        const head = header.subarray(0, end).toString();
        const rest = header.subarray(end + 4);
        const status = head.split('\r\n')[0];
        if (!/^HTTP\/1\.1 101/.test(status)) return fail(new Error(`WebSocket afvist: ${status}`));
        const accept = /sec-websocket-accept:\s*(\S+)/i.exec(head)?.[1];
        const expected = crypto.createHash('sha1').update(key + GUID).digest('base64');
        if (accept !== expected) return fail(new Error('Ugyldigt WebSocket-svar'));
        done = true;
        clearTimeout(timer);
        this.open = true;
        this.socket.on('data', (d) => this._onData(d));
        resolve(this);
        if (rest.length) this._onData(rest);
      };
      this.socket.on('data', onHandshake);
      this.socket.on('error', (err) => {
        if (!done) fail(err);
        else this.emit('error', err);
      });
      this.socket.on('close', () => {
        const wasOpen = this.open;
        this.open = false;
        if (!done) fail(new Error('Forbindelsen blev lukket'));
        else if (wasOpen) this.emit('close');
      });
    });
  }

  _onData(chunk) {
    this._buf = Buffer.concat([this._buf, chunk]);
    while (this._buf.length >= 2) {
      const b0 = this._buf[0];
      const b1 = this._buf[1];
      const fin = (b0 & 0x80) !== 0;
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let off = 2;
      if (len === 126) {
        if (this._buf.length < 4) return;
        len = this._buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (this._buf.length < 10) return;
        len = Number(this._buf.readBigUInt64BE(2));
        off = 10;
      }
      const maskOff = off;
      if (masked) off += 4;
      if (this._buf.length < off + len) return;
      let payload = Buffer.from(this._buf.subarray(off, off + len));
      if (masked) {
        const mask = this._buf.subarray(maskOff, maskOff + 4);
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      }
      this._buf = this._buf.subarray(off + len);

      if (opcode === 0x8) {
        this._frame(0x8, payload.subarray(0, 2));
        this.socket.end();
        return;
      }
      if (opcode === 0x9) {
        this._frame(0xa, payload);
        continue;
      }
      if (opcode === 0xa) continue;
      if (opcode === 0x0) {
        if (!this._frag) continue;
        this._frag.parts.push(payload);
      } else {
        this._frag = { opcode, parts: [payload] };
      }
      if (fin) {
        const data = Buffer.concat(this._frag.parts);
        const op = this._frag.opcode;
        this._frag = null;
        this.emit('message', op === 0x1 ? data.toString('utf8') : data);
      }
    }
  }

  _frame(opcode, payload) {
    if (!this.socket || this.socket.destroyed) return;
    const len = payload.length;
    let head;
    if (len < 126) {
      head = Buffer.alloc(2);
      head[1] = 0x80 | len;
    } else if (len < 65536) {
      head = Buffer.alloc(4);
      head[1] = 0x80 | 126;
      head.writeUInt16BE(len, 2);
    } else {
      head = Buffer.alloc(10);
      head[1] = 0x80 | 127;
      head.writeBigUInt64BE(BigInt(len), 2);
    }
    head[0] = 0x80 | opcode;
    const mask = crypto.randomBytes(4);
    const body = Buffer.from(payload);
    for (let i = 0; i < body.length; i++) body[i] ^= mask[i & 3];
    this.socket.write(Buffer.concat([head, mask, body]));
  }

  send(data) {
    if (!this.open) throw new Error('Ikke forbundet til TV');
    this._frame(0x1, Buffer.from(typeof data === 'string' ? data : JSON.stringify(data), 'utf8'));
  }

  close() {
    if (this.open) this._frame(0x8, Buffer.from([0x03, 0xe8]));
    this.open = false;
    this.socket?.end();
    setTimeout(() => this.socket?.destroy(), 500).unref?.();
  }
}
