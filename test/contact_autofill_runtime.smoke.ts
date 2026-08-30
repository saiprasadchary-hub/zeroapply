import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import WebSocket from 'ws';
import { generateHumanBypassScript } from '../src/agent/autofill/humanSimulator';
import { DOM_SCANNER_SCRIPT } from '../src/agent/detector/fieldScanner';

const chrome = path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe');
assert.ok(fs.existsSync(chrome), 'Google Chrome is required for this optional runtime smoke test.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'zeroapply-contact-smoke-'));

const reservation = net.createServer();
await new Promise<void>((resolve, reject) => {
  reservation.once('error', reject);
  reservation.listen(0, '127.0.0.1', () => resolve());
});
const address = reservation.address();
assert.ok(address && typeof address === 'object');
const port = address.port;
await new Promise<void>((resolve) => reservation.close(() => resolve()));

const html = `<!doctype html><form>
  <label>NAME *<input required name="name" placeholder="Name" type="text"></label>
  <label>EMAIL *<input required name="email" placeholder="Email" type="email"></label>
  <label>PHONE NUMBER *<input required name="phone" placeholder="Phone number" type="tel" inputmode="numeric" maxlength="10" pattern="[6-9]{1}[0-9]{9}"></label>
  <label>COUNTRY *<select required name="country"><option value="">Select an option</option><option value="US">United States</option><option value="IN">India</option></select></label>
  <fieldset><legend>Are you eligible to work?</legend><label><input required type="radio" name="eligible" value="yes">Yes</label><label><input type="radio" name="eligible" value="no">No</label></fieldset>
  <label><input id="accurate" required type="checkbox">The information is accurate</label>
  <button id="aria-check" type="button" role="checkbox" aria-checked="false">Enable relocation</button>
  <div role="radiogroup" aria-label="Preferred shift"><button type="button" role="radio" aria-checked="false" data-value="Day">Day</button><button type="button" role="radio" aria-checked="false" data-value="Night">Night</button></div>
  <button id="work-mode" type="button" role="combobox" aria-controls="work-options" aria-expanded="false">Choose work mode</button>
  <div id="work-options" role="listbox" hidden><button type="button" role="option" data-value="Remote">Remote</button><button type="button" role="option" data-value="Hybrid">Hybrid</button></div>
</form>`;
const child = spawn(chrome, [
  `--remote-debugging-port=${port}`,
  '--remote-debugging-address=127.0.0.1',
  '--remote-allow-origins=http://127.0.0.1',
  `--user-data-dir=${profile}`,
  '--headless=new',
  '--no-first-run',
  `data:text/html,${encodeURIComponent(html)}`,
], { stdio: 'ignore', windowsHide: true });

function getTargets(): Promise<Array<{ type: string; url?: string; webSocketDebuggerUrl?: string }>> {
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

let page: { url?: string; webSocketDebuggerUrl?: string } | undefined;
for (let attempt = 0; attempt < 40; attempt++) {
  try {
    const targets = await getTargets();
    page = targets.find((target) => target.type === 'page' && target.url?.startsWith('data:text/html'))
      || targets.find((target) => target.type === 'page');
    if (page) break;
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 100));
}
assert.ok(page?.webSocketDebuggerUrl);
const socket = new WebSocket(page.webSocketDebuggerUrl, { origin: 'http://127.0.0.1' });
await new Promise<void>((resolve, reject) => {
  socket.once('open', () => resolve());
  socket.once('error', reject);
});
let requestId = 1;
function call(method: string, params: Record<string, unknown> = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = requestId++;
    const timeout = setTimeout(() => reject(new Error(method + ' timed out')), 15_000);
    const onMessage = (data: WebSocket.RawData) => {
      const message = JSON.parse(String(data));
      if (message.id !== id) return;
      clearTimeout(timeout);
      socket.off('message', onMessage);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    };
    socket.on('message', onMessage);
    socket.send(JSON.stringify({ id, method, params }));
  });
}

const instructions = [
  { selector: 'input[name="name"]', type: 'text', value: 'Test Candidate', category: 'fullName', field: { label: 'NAME' } },
  { selector: 'input[name="email"]', type: 'email', value: 'candidate@example.com', category: 'email', field: { label: 'EMAIL' } },
  { selector: 'input[name="phone"]', type: 'tel', value: '+91 98765 43210', category: 'phone', field: { label: 'PHONE NUMBER' } },
  { selector: 'select[name="country"]', type: 'select', value: 'India', category: 'country', field: { label: 'COUNTRY' } },
  { selector: 'input[type="radio"][name="eligible"]', type: 'radio', value: 'Yes', category: 'screeningQuestion', field: { label: 'Are you eligible to work?' } },
  { selector: '#accurate', type: 'checkbox', value: 'Yes', category: 'screeningQuestion', field: { label: 'The information is accurate' } },
  { selector: '#aria-check', type: 'checkbox', value: 'Yes', category: 'screeningQuestion', field: { label: 'Enable relocation' } },
  { selector: '[role="radiogroup"] [role="radio"]', type: 'radio', value: 'Day', category: 'screeningQuestion', field: { label: 'Preferred shift' } },
  { selector: '#work-mode', type: 'custom_dropdown', value: 'Remote', category: 'workPreference', field: { label: 'Work mode' } },
];
await call('Runtime.evaluate', {
  expression: `(() => {
    const trigger = document.querySelector('#work-mode');
    const list = document.querySelector('#work-options');
    const ariaCheck = document.querySelector('#aria-check');
    ariaCheck.addEventListener('click', () => ariaCheck.setAttribute('aria-checked', ariaCheck.getAttribute('aria-checked') === 'true' ? 'false' : 'true'));
    document.querySelectorAll('[role="radiogroup"] [role="radio"]').forEach((radio) => radio.addEventListener('click', () => {
      document.querySelectorAll('[role="radiogroup"] [role="radio"]').forEach((item) => item.setAttribute('aria-checked', 'false'));
      radio.setAttribute('aria-checked', 'true');
    }));
    trigger.addEventListener('click', () => {
      list.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
    });
    list.querySelectorAll('[role="option"]').forEach((option) => option.addEventListener('click', () => {
      list.querySelectorAll('[role="option"]').forEach((item) => item.setAttribute('aria-selected', 'false'));
      option.setAttribute('aria-selected', 'true');
      trigger.textContent = option.textContent;
      trigger.setAttribute('data-value', option.getAttribute('data-value'));
      trigger.setAttribute('aria-expanded', 'false');
      list.hidden = true;
    }));
  })()`,
});
const scan = await call('Runtime.evaluate', { expression: DOM_SCANNER_SCRIPT, returnByValue: true });
assert.equal(scan.exceptionDetails, undefined, scan.exceptionDetails?.text || 'DOM scanner failed');
const scannedFields = scan.result.value as Array<{ type: string; label: string; options?: string[] }>;
assert.ok(scannedFields.some((field) => field.type === 'select' && field.options?.includes('India')));
assert.ok(scannedFields.some((field) => field.type === 'radio' && field.options?.includes('Yes') && field.options?.includes('No')));
assert.ok(
  scannedFields.some((field) => field.type === 'radio' && field.options?.includes('Day') && field.options?.includes('Night')),
  JSON.stringify(scannedFields),
);
assert.ok(scannedFields.some((field) => field.type === 'checkbox'));
assert.ok(
  scannedFields.some((field) => field.type === 'custom_dropdown' && field.options?.includes('Remote')),
  JSON.stringify(scannedFields),
);
const fillScript = generateHumanBypassScript(JSON.stringify(instructions));
const first = await call('Runtime.evaluate', { expression: fillScript, awaitPromise: true, returnByValue: true, userGesture: true });
if (first.exceptionDetails) {
  throw new Error(first.exceptionDetails.exception?.description || first.exceptionDetails.text || 'Chrome evaluation failed');
}
assert.equal(first.result.subtype, undefined, first.result.description || 'Unexpected Chrome evaluation result');
assert.equal(first.result.value.filledCount, 9, JSON.stringify(first.result.value));
assert.deepEqual(first.result.value.failedFields, []);

const values = await call('Runtime.evaluate', {
  expression: `({
    name: document.querySelector('[name="name"]').value,
    email: document.querySelector('[name="email"]').value,
    phone: document.querySelector('[name="phone"]').value,
    country: document.querySelector('[name="country"]').value,
    eligible: document.querySelector('[name="eligible"]:checked')?.value,
    accurate: document.querySelector('#accurate').checked,
    ariaCheck: document.querySelector('#aria-check').getAttribute('aria-checked'),
    shift: document.querySelector('[role="radiogroup"] [role="radio"][aria-checked="true"]')?.getAttribute('data-value'),
    workMode: document.querySelector('#work-mode').getAttribute('data-value'),
    valid: document.querySelector('form').checkValidity()
  })`,
  returnByValue: true,
});
assert.deepEqual(values.result.value, {
  name: 'Test Candidate',
  email: 'candidate@example.com',
  phone: '9876543210',
  country: 'IN',
  eligible: 'yes',
  accurate: true,
  ariaCheck: 'true',
  shift: 'Day',
  workMode: 'Remote',
  valid: true,
});

const second = await call('Runtime.evaluate', { expression: fillScript, awaitPromise: true, returnByValue: true, userGesture: true });
assert.equal(second.result.value.preservedCount, 9);
assert.deepEqual(second.result.value.failedFields, []);

await call('Browser.close').catch(() => {});
socket.close();
if (!child.killed) child.kill();
await new Promise((resolve) => setTimeout(resolve, 400));
const resolvedProfile = path.resolve(profile);
const resolvedTemp = path.resolve(os.tmpdir()) + path.sep;
assert.ok(resolvedProfile.startsWith(resolvedTemp) && path.basename(resolvedProfile).startsWith('zeroapply-contact-smoke-'));
try { fs.rmSync(resolvedProfile, { recursive: true, force: true }); } catch {}

console.log('Real Chrome contact autofill runtime smoke test passed.');
