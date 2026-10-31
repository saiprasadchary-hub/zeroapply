import {fileURLToPath} from 'node:url';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
for(const file of ['index.html','style.css','kernel.js','mark.js','app.js','agent-demo.js','agent-avatar.png','agent-cursor.png','vendor/gsap.min.js','firebase-config.js','desktop-agents.js','agent-routing.js','desktop-agents.css','roaming-black.png','roaming-white.png','releases.json']){if(!existsSync(new URL(`dist/${file}`,import.meta.url)))throw Error(`Missing ${file}`);}
for(const file of ['kernel.js','mark.js','app.js','agent-demo.js','firebase-config.js','desktop-agents.js','agent-routing.js'])execFileSync(process.execPath,['--check',fileURLToPath(new URL(`dist/${file}`,import.meta.url))]);
JSON.parse(readFileSync(new URL('dist/releases.json',import.meta.url)));
console.log('Static site assets, JavaScript syntax, and release configuration verified.');
