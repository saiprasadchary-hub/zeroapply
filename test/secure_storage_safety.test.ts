import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readStoreFile, assertReadableStoredValue } from '../desktop/secure-store-policy.mjs';
import { getSecureItem, setSecureItem, setSecureItemDurable, removeSecureItem, hasSecureStorageFailure, subscribeSecureStorageFailure } from '../src/services/secureStorage';
import { parseProfileBackup } from '../src/persona/profileBackup';
import { ensureEmbeddedModelReady } from '../src/agent/llm/webLlmEngine';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zeroapply-storage-test-'));
try {
  const file = path.join(dir, 'store.json');
  assert.deepEqual(readStoreFile(file), {}, 'Only a missing file is an empty store');
  fs.writeFileSync(file, '{broken');
  assert.throws(() => readStoreFile(file), /could not be read/);
  assert.equal(fs.readFileSync(file, 'utf8'), '{broken', 'Malformed storage stays untouched');
  fs.writeFileSync(file, '[]');
  assert.throws(() => readStoreFile(file), /could not be read/);
  const ciphertext = { profile: 'original-ciphertext' };
  assert.throws(() => assertReadableStoredValue(ciphertext, 'profile', () => { throw new Error('Wrong key'); }), /replacement was blocked/);
  assert.equal(ciphertext.profile, 'original-ciphertext');
  assert.doesNotThrow(() => assertReadableStoredValue(ciphertext, 'profile', () => 'decrypted-profile'));
  assert.doesNotThrow(() => assertReadableStoredValue(ciphertext, 'new-key', () => { throw new Error('Not used'); }));

  const data = { fullName: 'Fixture', email: 'fixture@example.test', location: 'City', phone: '', linkedIn: '', gitHub: '', portfolio: '', techStack: [], targetRoles: [], experienceYears: 0, minSalary: 0, expectedSalaryLpa: 7, employmentStatus: 'fresher' };
  for (const resume of [{ base64Data: 'cGRm' }, { base64: 'cGRm' }]) {
    const backup = parseProfileBackup([{ data, savedResume: { name: 'resume.pdf', type: 'application/pdf', ...resume } }]);
    assert.equal(backup.data.expectedSalaryLpa, 7);
    assert.equal(backup.data.employmentStatus, 'fresher');
    assert.ok(backup.savedResume);
  }
  assert.throws(() => parseProfileBackup({ data, savedResume: { name: 'resume.exe', type: 'application/pdf', base64Data: 'cGRm' } }), /invalid resume/);
  assert.throws(() => parseProfileBackup({ data: { ...data, experienceYears: '4' } }), /invalid profile/);

  const local = new Map<string, string>([['migration', 'original-legacy-value']]);
  let writes = 0;
  let notices = 0;
  Object.assign(globalThis, {
    localStorage: { getItem: (key: string) => local.get(key) ?? null, removeItem: (key: string) => local.delete(key) },
    window: { zeroApply: { isDesktop: true, secureGet: () => null, secureSet: async () => { writes++; return false; } } },
  });
  const unsubscribe = subscribeSecureStorageFailure(() => notices++);
  assert.equal(getSecureItem('migration'), 'original-legacy-value');
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  assert.equal(local.get('migration'), 'original-legacy-value', 'Failed migration retains the only legacy copy');
  assert.equal(hasSecureStorageFailure(), true);
  assert.equal(notices, 1);
  assert.throws(() => setSecureItem('profile', 'defaults'), /disabled/);
  await assert.rejects(setSecureItemDurable('profile', 'defaults'), /disabled/);
  assert.throws(() => removeSecureItem('profile'), /disabled/);
  await assert.rejects(ensureEmbeddedModelReady(), /disabled/);
  assert.equal(writes, 1, 'After failure no replacement write is attempted');
  unsubscribe();
  console.log('Secure-storage protection and profile backup regression tests passed.');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
