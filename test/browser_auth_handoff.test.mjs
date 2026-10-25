import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BrowserAuthHandoff } from '../desktop/browser-auth.mjs';

async function begin(handoff) {
  let open;
  const opened = new Promise((resolve) => { open = resolve; });
  let focused = false;
  const result = handoff.start('http://localhost:5173', async (url) => open(url), () => { focused = true; });
  void result.catch(() => {});
  const url = new URL(await Promise.race([opened, result]));
  const params = new URLSearchParams(url.hash.slice(1));
  return { result, params, focused: () => focused };
}

function submit(params, overrides = {}, origin = 'http://localhost:5173') {
  return fetch(params.get('callback'), {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ state: params.get('state'), idToken: 'test-google-token-with-enough-length', ...overrides }),
  });
}

test('handoff rejects other origins and wrong state, then completes once', async () => {
  const handoff = new BrowserAuthHandoff();
  const flow = await begin(handoff);
  try {
    assert.equal((await submit(flow.params, {}, 'https://attacker.example')).status, 403);
    assert.equal((await submit(flow.params, { state: 'wrong' })).status, 400);
    assert.equal((await submit(flow.params, { idToken: '' })).status, 400);
    assert.equal(flow.focused(), false);
    assert.equal((await submit(flow.params)).status, 200);
    assert.equal(await flow.result, 'test-google-token-with-enough-length');
    assert.equal(flow.focused(), true);
    assert.equal(handoff.pending, null);
    await assert.rejects(submit(flow.params));
  } finally { handoff.cancel(); }
});

test('cancellation closes listener and rejects pending login', async () => {
  const handoff = new BrowserAuthHandoff();
  const flow = await begin(handoff);
  handoff.cancel();
  await assert.rejects(flow.result, /cancelled/);
  await assert.rejects(submit(flow.params));
});

test('a new sign-in supersedes the previous request', async () => {
  const handoff = new BrowserAuthHandoff();
  const first = await begin(handoff);
  const second = await begin(handoff);
  try {
    await assert.rejects(first.result, /cancelled/);
    assert.notEqual(first.params.get('state'), second.params.get('state'));
    assert.equal((await submit(second.params)).status, 200);
    await second.result;
  } finally { handoff.cancel(); }
});

test('Chrome launch failure cleans up the pending request', async () => {
  const handoff = new BrowserAuthHandoff();
  await assert.rejects(handoff.start('http://localhost:5173', async () => {
    throw new Error('Chrome unavailable');
  }, () => {}), /Chrome unavailable/);
  assert.equal(handoff.pending, null);
});

test('browser login cannot start from a remote app origin', async () => {
  const handoff = new BrowserAuthHandoff();
  await assert.rejects(handoff.start('https://example.com', () => {}, () => {}), /local ZeroApply/);
});
