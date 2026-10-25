const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');

function run(cmd) {
  console.log(`\n▶ [Deploy] ${cmd}`);
  execSync(cmd, { cwd: rootDir, stdio: 'inherit', env: process.env });
}

async function main() {
  console.log('🚀 ZeroApply Firebase Deployment Pipeline');
  console.log('==========================================');

  const args = process.argv.slice(2);
  const target = args.length > 0 ? args.join(' ') : '';

  // 1. Check config files
  const firebasercPath = path.join(rootDir, '.firebaserc');
  const firebaseJsonPath = path.join(rootDir, 'firebase.json');

  if (!fs.existsSync(firebasercPath)) {
    console.error('❌ Error: .firebaserc not found!');
    process.exit(1);
  }
  if (!fs.existsSync(firebaseJsonPath)) {
    console.error('❌ Error: firebase.json not found!');
    process.exit(1);
  }

  const firebaserc = JSON.parse(fs.readFileSync(firebasercPath, 'utf8'));
  console.log(`🎯 Active Firebase Project: ${firebaserc.projects?.default || 'undefined'}`);

  // 2. Build web bundle if not deploying firestore only
  const isFirestoreOnly = target.includes('--only firestore');
  if (!isFirestoreOnly) {
    console.log('\n📦 Step 1: Building production web bundle...');
    run('npm run build');

    const distIndex = path.join(rootDir, 'dist', 'index.html');
    if (!fs.existsSync(distIndex)) {
      console.error('❌ Error: dist/index.html was not generated.');
      process.exit(1);
    }
    console.log('✅ Web bundle build verified (dist/index.html ready).');
  }

  // 3. Deploy to Firebase
  console.log('\n🔥 Step 2: Deploying to Firebase...');
  const deployCmd = target
    ? `npx --yes firebase-tools deploy ${target}`
    : 'npx --yes firebase-tools deploy';

  try {
    run(deployCmd);
    console.log('\n🎉 Successfully deployed to Firebase!');
  } catch (err) {
    console.error('\n⚠️ Firebase deploy failed.');
    console.error('If you are not logged in, please run:');
    console.error('   npx firebase-tools login');
    console.error('and try again.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
