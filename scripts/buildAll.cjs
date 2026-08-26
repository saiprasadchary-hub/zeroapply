const { execFileSync, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function run(command, cwd) {
  console.log(`\n▶ Running: ${command}`);
  execSync(command, {
    cwd: cwd || path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
}

function signArtifact(filePath) {
  const thumbprint = process.env.ZEROAPPLY_SIGN_CERT_SHA1?.replace(/\s/g, '');
  if (!thumbprint) {
    if (process.env.ZEROAPPLY_REQUIRE_SIGNING === '1') {
      throw new Error('ZEROAPPLY_SIGN_CERT_SHA1 is required for a production release.');
    }
    console.warn(`⚠️ Unsigned development artifact: ${filePath}`);
    return;
  }

  const timestamp = process.env.ZEROAPPLY_TIMESTAMP_URL || 'http://timestamp.digicert.com';
  const command = [
    `$certificate = Get-Item -LiteralPath 'Cert:\\CurrentUser\\My\\${thumbprint}'`,
    `$signature = Set-AuthenticodeSignature -LiteralPath '${filePath.replaceAll("'", "''")}' -Certificate $certificate -HashAlgorithm SHA256 -TimestampServer '${timestamp.replaceAll("'", "''")}'`,
    `if ($signature.Status -ne 'Valid') { throw "Signing failed: $($signature.StatusMessage)" }`,
  ].join('; ');
  execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { stdio: 'inherit' });
}

async function buildAll() {
  const rootDir = path.join(__dirname, '..');
  const version = require(path.join(rootDir, 'package.json')).version;
  const exeDirName = `release_exe_v${version}`;
  const setupDirName = `release_setup_v${version}`;
  if (process.env.ZEROAPPLY_REQUIRE_SIGNING === '1' && !process.env.ZEROAPPLY_SIGN_CERT_SHA1?.trim()) {
    throw new Error('ZEROAPPLY_SIGN_CERT_SHA1 is required for a production release.');
  }

  console.log('🧹 1. Cleaning build artifacts...');

  const dirsToClean = [
    path.join(rootDir, 'dist_desktop'),
    path.join(rootDir, 'dist_exe'),
    path.join(rootDir, 'dist_portable'),
    path.join(rootDir, 'release'),
    path.join(rootDir, 'release_build'),
    path.join(rootDir, exeDirName),
    path.join(rootDir, setupDirName),
  ];

  for (const dir of dirsToClean) {
    const resolved = path.resolve(dir);
    if (path.dirname(resolved) !== path.resolve(rootDir)) {
      throw new Error(`Refusing to clean a path outside the workspace: ${resolved}`);
    }
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      } catch (e) {
        throw new Error(`Could not clean ${dir}. Close any process using the release files and retry.`, { cause: e });
      }
    }
  }

  console.log('\n📦 2. Building Vite & TypeScript client...');
  run('npm run build', rootDir);

  console.log('\n🖥️ 3. Packaging Windows standalone executable with branded icon...');
  const iconPath = path.join(rootDir, 'public', 'logo.ico');
  const packagerCmd = `npx --no-install @electron/packager . ZeroApply --platform=win32 --arch=x64 --icon="${iconPath}" --out=${exeDirName} --overwrite --prune=true --asar --ignore="^(/(release|release_exe.*|release_setup.*|release_build|dist_desktop|dist_exe|dist_portable|scripts|node_modules|src|test|\\.git|\\.firebase|\\.agents)|/(README\\.md|build-exe\\.bat|run-desktop-app\\.bat|firebase\\.json|firestore\\..*|tsconfig.*\\.json|vite\\.config\\.ts|\\.oxlintrc\\.json|package-lock\\.json)$)"`;
  run(packagerCmd, rootDir);
  signArtifact(path.join(rootDir, exeDirName, 'ZeroApply-win32-x64', 'ZeroApply.exe'));

  console.log('\n🚀 4. Compiling Cursor/Antigravity-style Setup Installer...');
  process.env.ZEROAPPLY_VERSION = version;
  process.env.ZEROAPPLY_EXE_DIR = exeDirName;
  process.env.ZEROAPPLY_SETUP_DIR = setupDirName;
  run('npx --no-install innosetup-compiler zeroapply.iss', __dirname);
  signArtifact(path.join(rootDir, setupDirName, 'ZeroApply-Setup.exe'));

  console.log('\n======================================================');
  console.log('✅ BUILD COMPLETE & READY FOR DISTRIBUTION!');
  console.log(`📁 Standalone App: ${exeDirName}/ZeroApply-win32-x64/ZeroApply.exe`);
  console.log(`📁 Setup Installer: ${setupDirName}/ZeroApply-Setup.exe`);
  console.log('======================================================\n');
}

buildAll().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
