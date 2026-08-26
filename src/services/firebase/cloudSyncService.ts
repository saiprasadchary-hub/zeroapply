import { collection, deleteDoc, doc, getDoc, onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import type { PersonaData } from '../../types';
import type { ResumeDocument } from '../../resume/types';

export interface CloudRemoteConfig {
  activeModelName?: string;
  maxDailyApplications?: number;
  autoApplyIntervalSeconds?: number;
  globalPromptPrefix?: string;
  customHeuristicRules?: Record<string, string>;
  maintenanceNotice?: string;
}

export type CloudPersonaProfile = { id: string; name: string; data: PersonaData; createdAt: string };
export type CloudResumeVersion = { id: string; name: string; updatedAt: number; document: ResumeDocument };
export type CloudApplication = {
  id?: string; jobId?: string; title: string; company: string; platform: string; url?: string;
  status: 'applied' | 'failed' | 'skipped' | 'interview' | 'offer';
  matchScore?: number; notes?: string; timestamp?: number;
};

function getEffectiveUid(requestedUid?: string): string | null {
  const authenticatedUid = auth.currentUser?.uid;
  if (!authenticatedUid || (requestedUid && requestedUid !== authenticatedUid)) return null;
  return authenticatedUid;
}

const noSubscription: Unsubscribe = () => undefined;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isPersonaData(value: unknown): value is PersonaData {
  return isRecord(value)
    && typeof value.fullName === 'string'
    && typeof value.email === 'string'
    && Array.isArray(value.techStack)
    && Array.isArray(value.targetRoles)
    && typeof value.applicationLimit === 'number';
}

function isCloudPersonaProfile(value: unknown): value is CloudPersonaProfile {
  return isRecord(value)
    && typeof value.id === 'string'
    && /^[a-z0-9_-]{1,96}$/i.test(value.id)
    && typeof value.name === 'string'
    && value.name.length <= 120
    && typeof value.createdAt === 'string'
    && isPersonaData(value.data);
}

function isResumeDocument(value: unknown): value is ResumeDocument {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.updatedAt === 'number'
    && isRecord(value.contact)
    && typeof value.contact.fullName === 'string'
    && Array.isArray(value.experience)
    && Array.isArray(value.education)
    && Array.isArray(value.projects)
    && Array.isArray(value.certifications)
    && isRecord(value.skills)
    && isRecord(value.settings);
}

function isCloudResumeVersion(value: unknown): value is CloudResumeVersion {
  return isRecord(value)
    && typeof value.id === 'string'
    && /^ver_[a-z0-9_-]+$/i.test(value.id)
    && typeof value.name === 'string'
    && typeof value.updatedAt === 'number'
    && isResumeDocument(value.document);
}

export class FirebaseCloudSync {
  public static async savePersona(persona: PersonaData, uid?: string): Promise<boolean> {
    try {
      const userKey = getEffectiveUid(uid);
      if (!userKey) return false;
      await setDoc(doc(db, 'users', userKey, 'data', 'persona'), { ...persona, updatedAt: serverTimestamp() }, { merge: true });
      return true;
    } catch (error) {
      console.warn('[Firebase Cloud] Could not save persona:', error);
      return false;
    }
  }

  public static async getPersona(uid?: string): Promise<PersonaData | null> {
    try {
      const userKey = getEffectiveUid(uid);
      if (!userKey) return null;
      const snapshot = await getDoc(doc(db, 'users', userKey, 'data', 'persona'));
      return snapshot.exists() ? snapshot.data() as PersonaData : null;
    } catch (error) {
      console.warn('[Firebase Cloud] Could not load persona:', error);
      return null;
    }
  }

  public static subscribeToPersona(uid: string | undefined, onUpdate: (persona: PersonaData) => void): Unsubscribe {
    const userKey = getEffectiveUid(uid);
    if (!userKey) return noSubscription;
    return onSnapshot(doc(db, 'users', userKey, 'data', 'persona'), (snapshot) => {
      if (snapshot.exists()) onUpdate(snapshot.data() as PersonaData);
    }, (error) => console.warn('[Firebase Cloud] Persona subscription failed:', error));
  }

  public static async savePersonaProfiles(profiles: CloudPersonaProfile[], activeProfileId: string, uid?: string): Promise<boolean> {
    try {
      const userKey = getEffectiveUid(uid);
      if (!userKey) return false;
      const safeProfiles = profiles
        .filter((profile) => /^[a-z0-9_-]{1,96}$/i.test(profile.id))
        .slice(0, 50);
      const metadataRef = doc(db, 'users', userKey, 'data', 'persona_profiles');
      const previous = await getDoc(metadataRef);
      const previousIds = Array.isArray(previous.data()?.profileIds) ? previous.data()?.profileIds as string[] : [];
      const currentIds = safeProfiles.map((profile) => profile.id);

      await Promise.all([
        ...safeProfiles.map((profile) => setDoc(doc(db, 'users', userKey, 'persona_profiles', profile.id), {
          ...profile,
          updatedAt: serverTimestamp(),
        })),
        ...previousIds.filter((id) => !currentIds.includes(id)).map((id) => deleteDoc(doc(db, 'users', userKey, 'persona_profiles', id))),
      ]);
      await setDoc(metadataRef, { profileIds: currentIds, activeProfileId, updatedAt: serverTimestamp() });
      return true;
    } catch (error) {
      console.warn('[Firebase Cloud] Could not save persona profiles:', error);
      return false;
    }
  }

  public static subscribeToPersonaProfiles(uid: string | undefined, onUpdate: (data: { profiles: CloudPersonaProfile[]; activeProfileId: string }) => void): Unsubscribe {
    const userKey = getEffectiveUid(uid);
    if (!userKey) return noSubscription;
    return onSnapshot(doc(db, 'users', userKey, 'data', 'persona_profiles'), (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate({ profiles: [], activeProfileId: '' });
        return;
      }
      const metadata = snapshot.data();
      const legacyProfiles = Array.isArray(metadata.profiles) ? metadata.profiles.filter(isCloudPersonaProfile) : null;
      if (legacyProfiles) {
        onUpdate({ profiles: legacyProfiles, activeProfileId: String(metadata.activeProfileId || '') });
        return;
      }
      const profileIds = Array.isArray(metadata.profileIds) ? metadata.profileIds.slice(0, 50) as string[] : [];
      void Promise.all(profileIds.map((id) => getDoc(doc(db, 'users', userKey, 'persona_profiles', id))))
        .then((entries) => onUpdate({
          profiles: entries.filter((entry) => entry.exists()).map((entry) => entry.data()).filter(isCloudPersonaProfile),
          activeProfileId: String(metadata.activeProfileId || ''),
        }))
        .catch((error) => console.warn('[Firebase Cloud] Could not load persona profile documents:', error));
    }, (error) => console.warn('[Firebase Cloud] Persona profiles subscription failed:', error));
  }

  public static async saveResumeDocument(resumeDocument: ResumeDocument, uid?: string): Promise<boolean> {
    try {
      const userKey = getEffectiveUid(uid);
      if (!userKey) return false;
      await setDoc(doc(db, 'users', userKey, 'data', 'active_resume'), { document: resumeDocument, updatedAt: serverTimestamp() }, { merge: true });
      return true;
    } catch (error) {
      console.warn('[Firebase Cloud] Could not save resume document:', error);
      return false;
    }
  }

  public static subscribeToResumeDocument(uid: string | undefined, onUpdate: (value: ResumeDocument | null) => void): Unsubscribe {
    const userKey = getEffectiveUid(uid);
    if (!userKey) return noSubscription;
    return onSnapshot(doc(db, 'users', userKey, 'data', 'active_resume'), (snapshot) => {
      const resumeDocument = snapshot.data()?.document;
      onUpdate(isResumeDocument(resumeDocument) ? resumeDocument : null);
    }, (error) => console.warn('[Firebase Cloud] Resume subscription failed:', error));
  }

  public static async saveResumeVersion(version: CloudResumeVersion, uid?: string): Promise<boolean> {
    try {
      const userKey = getEffectiveUid(uid);
      if (!userKey) return false;
      await setDoc(doc(db, 'users', userKey, 'resume_versions', version.id), { ...version, cloudUpdatedAt: serverTimestamp() });
      return true;
    } catch (error) {
      console.warn('[Firebase Cloud] Could not save resume version:', error);
      return false;
    }
  }

  public static async deleteResumeVersion(id: string, uid?: string): Promise<boolean> {
    try {
      const userKey = getEffectiveUid(uid);
      if (!userKey || !/^ver_[a-z0-9_-]+$/i.test(id)) return false;
      await deleteDoc(doc(db, 'users', userKey, 'resume_versions', id));
      return true;
    } catch (error) {
      console.warn('[Firebase Cloud] Could not delete resume version:', error);
      return false;
    }
  }

  public static subscribeToResumeVersions(uid: string | undefined, onUpdate: (versions: CloudResumeVersion[]) => void): Unsubscribe {
    const userKey = getEffectiveUid(uid);
    if (!userKey) return noSubscription;
    return onSnapshot(collection(db, 'users', userKey, 'resume_versions'), (snapshot) => {
      onUpdate(snapshot.docs.map((entry) => entry.data()).filter(isCloudResumeVersion).sort((left, right) => right.updatedAt - left.updatedAt));
    }, (error) => console.warn('[Firebase Cloud] Resume versions subscription failed:', error));
  }

  public static async logAppliedJob(job: CloudApplication, uid?: string): Promise<boolean> {
    try {
      const userKey = getEffectiveUid(uid);
      if (!userKey) return false;
      const id = job.id || job.jobId || `${job.platform}_${Date.now()}`;
      await setDoc(doc(db, 'users', userKey, 'applications', id), { ...job, id, appliedAt: serverTimestamp() }, { merge: true });
      return true;
    } catch (error) {
      console.warn('[Firebase Cloud] Could not log applied job:', error);
      return false;
    }
  }

  public static subscribeToApplications(uid: string | undefined, onUpdate: (jobs: CloudApplication[]) => void): Unsubscribe {
    const userKey = getEffectiveUid(uid);
    if (!userKey) return noSubscription;
    return onSnapshot(collection(db, 'users', userKey, 'applications'), (snapshot) => {
      onUpdate(snapshot.docs.map((entry) => entry.data() as CloudApplication));
    }, (error) => console.warn('[Firebase Cloud] Applications subscription failed:', error));
  }

  public static async saveQuestionMemory(question: string, answer: string, uid?: string): Promise<boolean> {
    try {
      const userKey = getEffectiveUid(uid);
      if (!userKey) return false;
      const cleanKey = question.toLowerCase().trim().replace(/[^a-z0-9]/g, '_').slice(0, 80);
      if (!cleanKey) return false;
      await setDoc(doc(db, 'users', userKey, 'question_memory', cleanKey), { question, answer, updatedAt: serverTimestamp() }, { merge: true });
      return true;
    } catch (error) {
      console.warn('[Firebase Cloud] Could not sync question memory:', error);
      return false;
    }
  }

  public static subscribeToRemoteConfig(onConfigChange: (config: CloudRemoteConfig) => void): Unsubscribe {
    if (!auth.currentUser) return noSubscription;
    return onSnapshot(doc(db, 'remote_config', 'global_settings'), (snapshot) => {
      if (snapshot.exists()) onConfigChange(snapshot.data() as CloudRemoteConfig);
    }, (error) => console.warn('[Firebase Cloud] Remote configuration subscription failed:', error));
  }
}
