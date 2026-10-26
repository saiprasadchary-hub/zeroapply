import fs from 'node:fs';

export function readStoreFile(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Saved storage has an invalid format.');
    return data;
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw new Error('Saved storage could not be read. Existing data has not been replaced.');
  }
}

export function assertReadableStoredValue(store, key, decrypt) {
  if (!Object.hasOwn(store, key)) return;
  if (typeof store[key] !== 'string') throw new Error('Existing saved data is invalid; replacement was blocked.');
  try { decrypt(store[key]); }
  catch { throw new Error('Existing saved data could not be decrypted; replacement was blocked. Restart using the original storage configuration.'); }
}
