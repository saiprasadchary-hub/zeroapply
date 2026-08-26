import type { ResumeDocument } from './types';
import { FirebaseCloudSync } from '../services/firebase/cloudSyncService';
import { getSecureItem, setSecureItem } from '../services/secureStorage';

const VERSIONS_STORAGE_KEY = 'zeroapply_resume_studio_saved_versions';
const MAX_SAVED_VERSIONS = 10;

export interface SavedResumeVersion {
  id: string;
  name: string;
  updatedAt: number;
  document: ResumeDocument;
}

export function getSavedResumeVersions(): SavedResumeVersion[] {
  try {
    const raw = getSecureItem(VERSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.warn('Could not read saved resume versions:', error);
  }
  return [];
}

export function replaceSavedResumeVersions(versions: SavedResumeVersion[]): SavedResumeVersion[] {
  const bounded = [...versions]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, MAX_SAVED_VERSIONS);
  setSecureItem(VERSIONS_STORAGE_KEY, JSON.stringify(bounded));
  return bounded;
}

export function saveResumeVersion(name: string, doc: ResumeDocument): SavedResumeVersion[] {
  const versions = getSavedResumeVersions();
  const newVersion: SavedResumeVersion = {
    id: `ver_${Date.now()}`,
    name: name.trim() || `Resume Version ${versions.length + 1}`,
    updatedAt: Date.now(),
    document: JSON.parse(JSON.stringify(doc)),
  };

  const updated = [newVersion, ...versions].slice(0, MAX_SAVED_VERSIONS);
  try {
    setSecureItem(VERSIONS_STORAGE_KEY, JSON.stringify(updated));
    void FirebaseCloudSync.saveResumeVersion(newVersion);
    for (const removed of versions.slice(MAX_SAVED_VERSIONS - 1)) void FirebaseCloudSync.deleteResumeVersion(removed.id);
  } catch (error) {
    console.warn('Could not save resume version:', error);
  }
  return updated;
}

export function deleteResumeVersion(id: string): SavedResumeVersion[] {
  const versions = getSavedResumeVersions();
  const updated = versions.filter((v) => v.id !== id);
  try {
    setSecureItem(VERSIONS_STORAGE_KEY, JSON.stringify(updated));
    void FirebaseCloudSync.deleteResumeVersion(id);
  } catch (error) {
    console.warn('Could not delete resume version:', error);
  }
  return updated;
}
