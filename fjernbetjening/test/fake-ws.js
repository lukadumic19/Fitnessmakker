// Lille WebSocket-server til tests (simulerer TV'er).
import http from 'node:http';
import https from 'node:https';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class ServerSocket extends EventEmitter {
  constructor(socket, path) {
    super();
    this.socket = socket;
    this.path = path;
    this.buf = Buffer.alloc(0);
    socket.on('data', (d) => this._data(d));
    socket.on('close', () => this.emit('close'));
    socket.on('error', () => {});
  }
  _data(d) {
    this.buf = Buffer.concat([this.buf, d]);
    while (this.buf.length >= 2) {
      const op = this.buf[0] & 0x0f;
      let len = this.buf[1] & 0x7f;
      let off = 2;
      if (len === 126) { len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      const mask = this.buf.subarray(off, off + 4);
      off += 4;
      if (this.buf.length < off + len) return;
      const p = Buffer.from(this.buf.subarray(off, off + len));
      for (let i = 0; i < p.length; i++) p[i] ^= mask[i & 3];
      this.buf = this.buf.subarray(off + len);
      if (op === 8) { this.socket.end(); return; }
      if (op === 1) this.emit('message', p.toString());
    }
  }
  send(obj) {
    const data = Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj));
    let head;
    if (data.length < 126) head = Buffer.from([0x81, data.length]);
    else if (data.length < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 126; head.writeUInt16BE(data.length, 2); }
    else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(data.length), 2); }
    this.socket.write(Buffer.concat([head, data]));
  }
}

export async function startWsServer(onConnection, tlsOpts) {
  const server = tlsOpts ? https.createServer(tlsOpts) : http.createServer();
  server.on('upgrade', (req, socket) => {
    const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + GUID).digest('base64');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    onConnection(new ServerSocket(socket, req.url));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { server, port: server.address().port, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }) };
}
