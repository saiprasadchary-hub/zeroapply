import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyPersona, readPersona, validateResume } from '../src/profile';

test('new Android profiles contain no sample identity', (): void => {
  const profile = emptyPersona();
  assert.equal(profile.fullName, ''); assert.equal(profile.email, '');
  assert.equal(profile.phone, ''); assert.deepEqual(profile.techStack, []);
});
test('resume import rejects unsupported, empty and oversized files', (): void => {
  for (const file of [{ name: 'file.exe', size: 100 }, { name: 'resume.pdf', size: 0 }, { name: 'resume.docx', size: 11000000 }]) {
    assert.throws((): void => validateResume(file));
  }
  assert.doesNotThrow((): void => validateResume({ name: 'resume.PDF', size: 1000 }));
});
test('restricted local storage still allows a blank profile', (): void => {
  assert.deepEqual(readPersona('unavailable'), emptyPersona());
});
