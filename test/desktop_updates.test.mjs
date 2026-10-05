import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { DesktopUpdateService } from '../desktop/update-service.mjs';

function fixture(enabled = true) {
  const updater = new EventEmitter();
  let checks = 0, downloads = 0, installs = 0, active = false;
  updater.checkForUpdates = async () => { checks++; updater.emit('update-available', { version: '1.0.1' }); };
  updater.downloadUpdate = async () => { downloads++; updater.emit('download-progress', { percent: 52.2 }); updater.emit('update-downloaded', { version: '1.0.1' }); };
  updater.quitAndInstall = () => { installs++; };
  const service = new DesktopUpdateService({ updater, currentVersion: '1.0.0', enabled, canRestart: () => !active });
  return { updater, service, counts: () => ({ checks, downloads, installs }), activity: value => { active = value; } };
}

test('checking is passive until requested, deduplicated, and never auto installs', async () => {
  const f = fixture();
  assert.deepEqual(f.counts(), { checks: 0, downloads: 0, installs: 0 });
  assert.equal(f.updater.autoDownload, false);
  assert.equal(f.updater.autoInstallOnAppQuit, false);
  assert.equal(f.updater.allowDowngrade, false);
  await Promise.all([f.service.check(), f.service.check()]);
  assert.equal(f.counts().checks, 1);
  assert.equal(f.service.status().phase, 'available');
  await Promise.all([f.service.download(), f.service.download()]);
  assert.equal(f.counts().downloads, 1);
  assert.equal(f.service.status().phase, 'downloaded');
  assert.equal(f.counts().installs, 0);
  f.service.install(); f.service.install();
  assert.equal(f.counts().installs, 1);
});
test('AutoApply blocks downloads and restart even if update is ready', async () => {
  const f = fixture();
  assert.throws(() => f.service.install(), /verified/);
  await f.service.check(); f.activity(true);
  await assert.rejects(f.service.download(), /AutoApply/);
  assert.equal(f.counts().downloads, 0);
  f.activity(false); await f.service.download(); f.activity(true);
  assert.throws(() => f.service.install(), /AutoApply/);
  assert.equal(f.counts().installs, 0);
});
test('preview builds cannot fetch, download, or install release updates', async () => {
  const f = fixture(false);
  await f.service.check();
  await assert.rejects(f.service.download(), /public/);
  assert.throws(() => f.service.install());
  assert.deepEqual(f.counts(), { checks: 0, downloads: 0, installs: 0 });
});
test('offline failures are recoverable without exposing remote error details', async () => {
  const f = fixture();
  f.updater.checkForUpdates = async () => { throw new Error('private transport details'); };
  await f.service.check();
  assert.equal(f.service.status().phase, 'error');
  assert.doesNotMatch(f.service.status().error, /private/);
  f.updater.checkForUpdates = async () => f.updater.emit('update-available', { version: '1.0.1' });
  await f.service.check();
  assert.equal(f.service.status().phase, 'available');
});
