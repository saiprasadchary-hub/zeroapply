const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const signed = process.argv.includes('--signed') || process.env.ZEROAPPLY_REQUIRE_SIGNING === '1';
if (!['win32', 'darwin'].includes(process.platform)) throw new Error('Build installers on Windows or macOS so the native AI runtime matches.');
if (signed && !process.env.CSC_LINK && !process.env.ZEROAPPLY_SIGN_CERT_SHA1) throw new Error('A signing certificate is required for public releases.');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (command, args) => execFileSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' && command.endsWith('.cmd') });
run(npm, ['run', 'model:download']);
run(npm, ['run', 'typecheck']);
run(npm, ['run', 'build']);
const metadata = path.join(root, 'desktop', 'release-info.json');
const previous = fs.readFileSync(metadata);
try {
  fs.writeFileSync(metadata, JSON.stringify({ updatesEnabled: signed, channel: 'stable' }));
  const args = [path.join(root, 'node_modules', 'electron-builder', 'cli.js'), process.platform === 'darwin' ? '--mac' : '--win', '--publish', 'never'];
  if (signed) args.push('--config.forceCodeSigning=true');
  else if (process.platform === 'darwin') args.push('--config.mac.identity=null');
  if (process.env.ZEROAPPLY_SIGN_CERT_SHA1) args.push(`--config.win.signtoolOptions.certificateSha1=${process.env.ZEROAPPLY_SIGN_CERT_SHA1}`);
  run(process.execPath, args);
} finally { fs.writeFileSync(metadata, previous); }
