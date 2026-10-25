const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
if (process.platform !== 'darwin') throw new Error('Create macOS previews on macOS.');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, 'release_build', process.arch === 'arm64' ? 'mac-arm64' : 'mac');
const bundle = path.join(directory, 'ZeroApply.app');
if (!fs.existsSync(path.join(bundle, 'Contents', 'Info.plist'))) throw new Error('Package ZeroApply.app first.');
if (fs.readdirSync(directory).some(name => name !== 'ZeroApply.app' && name !== '.DS_Store')) throw new Error('The package staging folder must contain only ZeroApply.app.');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const output = path.join(root, 'release_build', `ZeroApply-${version}-${process.arch}-Launchpad-Fix.pkg`);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'zeroapply-package-'));
const components = path.join(temporary, 'components.plist');
const run = (command, args) => execFileSync(command, args, { stdio: 'inherit' });
try {
  run('/usr/bin/pkgbuild', ['--analyze', '--root', directory, components]);
  run('/usr/libexec/PlistBuddy', ['-c', 'Set :0:BundleIsRelocatable false', components]);
  run('/usr/bin/pkgbuild', ['--root', directory, '--component-plist', components, '--install-location', '/Applications', '--identifier', 'com.zeroapply.app', '--version', version, output]);
  console.log(`Installer created: ${output}`);
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
