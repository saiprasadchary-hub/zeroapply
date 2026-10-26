import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

test('ZeroApply account login still uses Chrome and returns its token', async () => {
  const main = fs.readFileSync('main.js', 'utf8');
  const start = main.indexOf("ipcMain.handle('desktop-google-login',");
  const end = main.indexOf("ipcMain.handle('desktop-google-login-cancel'", start);
  let handler;
  const opened = [];
  const context = vm.createContext({
    ipcMain: { handle: (_name, callback) => { handler = callback; } },
    requireTrustedIpcSender: () => {}, rendererUrlInUse: 'http://localhost:5173', mainWindow: null,
    openAccountChrome: async url => { opened.push(url); },
    browserAuthHandoff: { start: async (_origin, open) => { await open('https://accounts.google.com/test'); return 'fixture-token'; } },
  });
  vm.runInContext(main.slice(start, end), context);
  const result = await handler({});
  assert.equal(result.ok, true);
  assert.equal(result.idToken, 'fixture-token');
  assert.deepEqual(opened, ['https://accounts.google.com/test']);
});
