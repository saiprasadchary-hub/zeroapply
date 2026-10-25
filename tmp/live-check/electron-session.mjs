import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import readline from 'node:readline';
const log = fs.createWriteStream('tmp/live-check/electron-console.log', { flags: 'a' });
const app = await electron.launch({ args: ['.', '--dev'], cwd: process.cwd(), timeout: 60000 });
app.process().stderr.on('data', data => log.write(data));
app.process().stdout.on('data', data => log.write(data));
app.on('window', window => {
 window.on('console', msg => log.write(JSON.stringify({ source: 'renderer', type: msg.type(), text: msg.text() }) + '\n'));
 window.on('pageerror', error => log.write(JSON.stringify({ source: 'renderer', error: error.message }) + '\n'));
});
const page = await app.firstWindow();
await page.waitForLoadState('domcontentloaded');
console.log('READY', await page.title());
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
for await (const line of readline.createInterface({ input: process.stdin })) {
 try { console.log(JSON.stringify(await new AsyncFunction('app', 'page', 'fs', line)(app, page, fs))); }
 catch(error) { console.log(JSON.stringify({error:error.message})); }
}
