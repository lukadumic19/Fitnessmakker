import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { startWsServer } from './fake-ws.js';
import { WSClient } from '../lib/ws.js';
import { SamsungDriver } from '../lib/drivers/samsung.js';
import { LgDriver } from '../lib/drivers/lg.js';
import { RokuDriver } from '../lib/drivers/roku.js';
import { DemoDriver } from '../lib/drivers/demo.js';

function selfSignedCert() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fjern-cert-'));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=tv',
    '-keyout', path.join(dir, 'k.pem'), '-out', path.join(dir, 'c.pem')], { stdio: 'ignore' });
  return { key: fs.readFileSync(path.join(dir, 'k.pem')), cert: fs.readFileSync(path.join(dir, 'c.pem')) };
}

test('WebSocket-klienten sender og modtager store og små beskeder', async () => {
  const srv = await startWsServer((s) => s.on('message', (m) => s.send('ekko:' + m)));
  const ws = new WSClient(`ws://127.0.0.1:${srv.port}/x`);
  await ws.connect();
  const big = 'x'.repeat(70000);
  const got = [];
  ws.on('message', (m) => got.push(m));
  ws.send('hej');
  ws.send(big);
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(got[0], 'ekko:hej');
  assert.equal(got[1], 'ekko:' + big);
  ws.close();
  await srv.close();
});

test('Samsung: parring over wss, token gemmes, knapper og tekst sendes', async () => {
  const received = [];
  const srv = await startWsServer((s) => {
    assert.match(s.path, /samsung\.remote\.control\?name=/);
    s.send({ event: 'ms.channel.connect', data: { token: '12345' } });
    s.on('message', (m) => {
      const msg = JSON.parse(m);
      received.push(msg);
      if (msg.params?.event === 'ed.installedApp.get') {
        s.send({ event: 'ed.installedApp.get', data: { data: [{ appId: 'drtv.id', name: 'DR TV', app_type: 2 }] } });
      }
    });
  }, selfSignedCert());
  const tv = { id: 't', type: 'samsung', ip: '127.0.0.1', port: srv.port };
  const d = new SamsungDriver(tv, (p) => Object.assign(tv, p));
  await d.key('vol_up');
  await d.text('Matador');
  await d.launch('drtv'); // ingen kendt id → slås op i installerede apps
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(tv.token, '12345');
  assert.equal(received[0].params.DataOfCmd, 'KEY_VOLUP');
  assert.equal(Buffer.from(received[1].params.Cmd, 'base64').toString(), 'Matador');
  const launch = received.find((m) => m.params?.event === 'ed.apps.launch');
  assert.equal(launch.params.data.appId, 'drtv.id');
  d.close();
  await srv.close();
});

test('LG: registrering, client-key, knapper via pointer-sokkel og app-start', async () => {
  const requests = [];
  const pointer = [];
  let port;
  const srv = await startWsServer((s) => {
    if (s.path.includes('pointer')) {
      s.on('message', (m) => pointer.push(m));
      return;
    }
    s.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.type === 'register') {
        assert.ok(msg.payload.manifest.signatures);
        s.send({ type: 'response', id: msg.id, payload: { pairingType: 'PROMPT' } });
        setTimeout(() => s.send({ type: 'registered', id: msg.id, payload: { 'client-key': 'abc' } }), 50);
        return;
      }
      requests.push(msg);
      const reply = (payload) => s.send({ type: 'response', id: msg.id, payload: { returnValue: true, ...payload } });
      if (msg.uri.endsWith('getPointerInputSocket')) reply({ socketPath: `ws://127.0.0.1:${port}/resources/x/netinput.pointer.sock` });
      else if (msg.uri.endsWith('getVolume')) reply({ volumeStatus: { volume: 12, muteStatus: false } });
      else reply({});
    });
  });
  port = srv.port;
  const tv = { id: 'l', type: 'lg', ip: '127.0.0.1', port, secure: false };
  const d = new LgDriver(tv, (p) => Object.assign(tv, p));
  await d.pair();
  assert.equal(tv.clientKey, 'abc');
  await d.key('up');
  await d.key('ok');
  await d.launch('netflix');
  const st = await d.status();
  await new Promise((r) => setTimeout(r, 100));
  assert.deepEqual(pointer, ['type:button\nname:UP\n\n', 'type:button\nname:ENTER\n\n']);
  assert.ok(requests.some((r) => r.uri === 'ssap://system.launcher/launch' && r.payload.id === 'netflix'));
  assert.equal(st.volume, 12);
  d.close();
  await srv.close();
});

test('Roku: knapper, tekst og app-opslag via HTTP', async () => {
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(`${req.method} ${req.url}`);
    if (req.url === '/query/apps') {
      res.end('<apps><app id="12" type="appl" version="1">Netflix</app><app id="5555" type="appl" version="1">DR TV</app><app id="tvinput.hdmi1" type="tvin" version="1">HDMI 1</app></apps>');
    } else res.end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const tv = { id: 'r', type: 'roku', ip: '127.0.0.1' };
  const d = new RokuDriver(tv, () => {});
  Object.defineProperty(d, 'base', { get: () => `http://127.0.0.1:${server.address().port}` });
  await d.key('ok');
  await d.key('5');
  await d.text('hi');
  await d.launch('drtv');
  const inputs = await d.inputs();
  assert.deepEqual(hits.slice(0, 4), ['POST /keypress/Select', 'POST /keypress/Lit_5', 'POST /keypress/Lit_h', 'POST /keypress/Lit_i']);
  assert.ok(hits.includes('POST /launch/5555'));
  assert.deepEqual(inputs.map((i) => i.id), ['tvinput.hdmi1']);
  server.close();
});

test('Demo-TV: lydstyrke og afspil/pause', async () => {
  const d = new DemoDriver({ type: 'demo' }, () => {});
  await d.key('vol_up');
  await d.key('mute');
  const st = await d.status();
  assert.equal(st.volume, 19);
  assert.equal(st.muted, true);
  await assert.rejects(d.key('findes_ikke'));
});
