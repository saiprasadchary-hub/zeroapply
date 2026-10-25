import assert from 'node:assert/strict';
import { test } from 'node:test';
import { watchAuthStartup } from '../src/auth/authStartup';

test('auth initialization has a finite budget and releases the loading screen', (context): void => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  let releases = 0;
  watchAuthStartup((): void => { releases++; });
  context.mock.timers.tick(4_999);
  assert.equal(releases, 0);
  context.mock.timers.tick(1);
  assert.equal(releases, 1);
});
test('successful authentication and unmount cancel the startup fallback', (context): void => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  let releases = 0;
  const cancel = watchAuthStartup((): void => { releases++; });
  cancel(); cancel();
  context.mock.timers.tick(10_000);
  assert.equal(releases, 0);
});
