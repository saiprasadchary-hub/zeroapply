import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import WebSocket from 'ws';

const chrome = path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe');
assert.ok(fs.existsSync(chrome), 'Google Chrome is required for this optional runtime smoke test.');

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'zeroapply-chrome-smoke-'));
const server = net.createServer();
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
assert.ok(address && typeof address === 'object');
const port = address.port;
await new Promise((resolve) => server.close(resolve));

const chromeProcess = spawn(chrome, [
  `--remote-debugging-port=${port}`,
  '--remote-debugging-address=127.0.0.1',
  '--remote-allow-origins=http://127.0.0.1',
  `--user-data-dir=${profile}`,
  '--headless=new',
  '--no-first-run',
  'about:blank',
], { stdio: 'ignore', windowsHide: true });

function getTargets() {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: '127.0.0.1', port, path: '/json/list', timeout: 1000 }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.on('timeout', () => request.destroy(new Error('timeout')));
  });
}

let page;
for (let attempt = 0; attempt < 40; attempt++) {
  try {
    const targets = await getTargets();
    page = targets.find((target) => target.type === 'page');
    if (page) break;
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 100));
}
assert.ok(page?.webSocketDebuggerUrl, 'Chrome did not expose a controllable page.');

const socket = new WebSocket(page.webSocketDebuggerUrl, { origin: 'http://127.0.0.1' });
await new Promise((resolve, reject) => {
  socket.once('open', resolve);
  socket.once('error', reject);
});
let nextId = 1;
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 5000);
    const onMessage = (data) => {
      const message = JSON.parse(String(data));
      if (message.id !== id) return;
      clearTimeout(timer);
      socket.off('message', onMessage);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    };
    socket.on('message', onMessage);
    socket.send(JSON.stringify({ id, method, params }));
  });
}

const result = await call('Runtime.evaluate', {
  expression: 'document.body.innerText = "ZeroApply Chrome Agent OK"; document.body.innerText',
  returnByValue: true,
  userGesture: true,
});
assert.equal(result.result.value, 'ZeroApply Chrome Agent OK');
await call('Browser.close').catch(() => {});
socket.close();
await new Promise((resolve) => setTimeout(resolve, 500));
if (!chromeProcess.killed) chromeProcess.kill();

const resolvedProfile = path.resolve(profile);
const resolvedTemp = path.resolve(os.tmpdir()) + path.sep;
assert.ok(resolvedProfile.startsWith(resolvedTemp) && path.basename(resolvedProfile).startsWith('zeroapply-chrome-smoke-'));
try { fs.rmSync(resolvedProfile, { recursive: true, force: true }); } catch {}

console.log('Chrome DevTools runtime smoke test passed.');
