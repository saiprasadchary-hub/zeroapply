const { execSync } = require('child_process');

try {
  console.log('Staging files...');
  execSync('git add .', { stdio: 'inherit' });

  console.log('Committing changes...');
  execSync('git commit -m "feat: autonomous apply, embedded WebLLM engine, and header LLM status indicator"', { stdio: 'inherit' });

  console.log('Pushing to origin main...');
  execSync('git push origin main', { stdio: 'inherit' });

  console.log('Push completed successfully!');
} catch (err) {
  console.error('Error during git execution:', err.message);
  process.exit(1);
}
