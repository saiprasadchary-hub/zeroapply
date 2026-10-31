import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(new URL('.', import.meta.url));
function run(command, args) {
  const result = spawnSync(command, args, { cwd: directory, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) { console.error(result.error.message); process.exit(1); }
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run(process.execPath, [fileURLToPath(new URL('verify.mjs', import.meta.url))]);
run(process.platform === 'win32' ? 'npx.cmd' : 'npx', [
  '--yes', 'firebase-tools@15.34.2', 'deploy', '--only', 'hosting',
  '--project', 'zero-apply-app', '--config', fileURLToPath(new URL('firebase.json', import.meta.url)),
  '--non-interactive',
]);
