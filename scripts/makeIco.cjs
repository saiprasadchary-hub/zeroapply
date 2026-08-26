const fs = require('fs');
const path = require('path');

async function makeIco() {
  const pngToIcoModule = await import('png-to-ico');
  const pngToIco = pngToIcoModule.default || pngToIcoModule;
  const inputPath = path.join(__dirname, '..', 'public', 'logo_square.png');
  const outputPath = path.join(__dirname, '..', 'public', 'logo.ico');

  const buf = await pngToIco(inputPath);
  fs.writeFileSync(outputPath, buf);
  console.log('Successfully created public/logo.ico (' + buf.length + ' bytes)');
}

makeIco().catch(err => {
  console.error('Failed to create ico:', err);
  process.exit(1);
});
