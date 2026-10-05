import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { adaptAndroidSource } from '../adapt-source.mjs';

test('Android removes seeded personal information from both profile defaults', () => {
  for (const file of ['src/App.tsx', 'src/persona/personaManager.ts']) {
    const output = adaptAndroidSource(readFileSync(file, 'utf8'), `/${file}`);
    assert.ok(output);
    assert.doesNotMatch(output, /saiprasad\.chary@gmail\.com|83743 70572|fullName: 'Sai Prasad Chary'/);
    assert.match(output, /fullName: ''/);
  }
});
test('Android blocks desktop startup before model initialization and browser dispatch', () => {
  const output = adaptAndroidSource(readFileSync('src/components/PersonaForm.tsx', 'utf8'), '/src/components/PersonaForm.tsx');
  const handler = output.match(/const handleAutoApplyClick = [\s\S]*?\n  \};/)[0];
  assert.match(handler, /onSaveToast/);
  assert.doesNotMatch(handler, /initWebLlmEngine|onLaunchBrowser/);
});
test('Unsupported source changes fail the build instead of leaking seeded data', () => {
  assert.throws(() => adaptAndroidSource('changed', '/src/App.tsx'));
  assert.equal(adaptAndroidSource('unchanged', '/src/components/Header.tsx'), null);
});

test('Android begins with the candidate resume instead of loading a demo automatically', () => {
  const source = readFileSync('src/resume/ResumeStudio.tsx', 'utf8');
  const output = adaptAndroidSource(source, '/src/resume/ResumeStudio.tsx');
  assert.match(output, /return personaToResume\(persona\);/);
  assert.doesNotMatch(output, /return DEFAULT_RESUME_DOCUMENT;/);
  assert.match(output, /setDocument\(\{ \.\.\.DEFAULT_RESUME_DOCUMENT/);
});
