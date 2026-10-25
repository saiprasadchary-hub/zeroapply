/**
 * ZeroApply File Upload - Resume File Adapter
 * Normalizes and packages stored candidate resume files (base64, blob, or metadata)
 * for automated portal attachments.
 */

import { PersonaManager } from '../../persona/personaManager';

export interface StoredResumeMetadata {
  name: string;
  size?: string;
  type: string;
  base64Data?: string;
  lastModified?: number;
}

export const RESUME_STORAGE_KEY = 'zeroapply_saved_resume_file';

/**
 * Retrieves the currently active candidate resume from secure/local storage.
 */
export function getStoredResume(): StoredResumeMetadata | null {
  try {
    // 1. Check PersonaManager active profile
    if (typeof localStorage !== 'undefined') {
      try {
        const active = PersonaManager.getActiveProfile();
        if (active?.savedResume && active.savedResume.name) {
          const sr = active.savedResume;
          const sizeStr = typeof sr.size === 'number'
            ? `${Math.round(sr.size / 1024)} KB`
            : (sr.size || '120 KB');
          return {
            name: sr.name,
            size: sizeStr,
            type: sr.type || (sr.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
            base64Data: sr.base64 || (sr as any).base64Data || '',
            lastModified: sr.lastModified || Date.now(),
          };
        }
      } catch {}
    }

    // 2. Check standalone resume storage key
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(RESUME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.name) return null;

    const sizeStr = typeof parsed.size === 'number'
      ? `${Math.round(parsed.size / 1024)} KB`
      : (parsed.size || '120 KB');

    return {
      name: parsed.name,
      size: sizeStr,
      type: parsed.type || (parsed.name.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
      base64Data: parsed.base64 || parsed.base64Data || '',
      lastModified: parsed.lastModified || Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Generates a mock or synthetic resume object when no file was uploaded by the user.
 */
export function getFallbackResume(candidateName = 'Candidate'): StoredResumeMetadata {
  const cleanName = candidateName.replace(/\s+/g, '_');
  return {
    name: `${cleanName}_Resume.pdf`,
    size: '145 KB',
    type: 'application/pdf',
    base64Data: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp...',
    lastModified: Date.now(),
  };
}
