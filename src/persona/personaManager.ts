import type { PersonaData } from '../types';
import type { SavedResumeFile } from '../agent/autofill/resumeInjector';
import { FirebaseCloudSync } from '../services/firebase/cloudSyncService';
import { getSecureItem, setSecureItem } from '../services/secureStorage';

export interface PersonaProfile {
  id: string;
  name: string;
  data: PersonaData;
  savedResume?: SavedResumeFile | null;
  createdAt: string;
}

const PROFILES_STORAGE_KEY = 'zeroapply_persona_profiles_list';
const ACTIVE_PROFILE_ID_KEY = 'zeroapply_active_profile_id';

const DEFAULT_PERSONA_DATA: PersonaData = {
  fullName: '',
  location: '',
  email: '',
  phone: '',
  linkedIn: '',
  gitHub: '',
  portfolio: '',
  experienceYears: 0,
  minSalary: 12,
  workPreference: 'Remote',
  tone: 'Confident',
  techStack: [],
  targetRoles: [],
  applyMode: 'easy',
  applicationLimit: 5,
  verified: false,
};

const DEFAULT_INITIAL_PROFILES: PersonaProfile[] = [
  {
    id: 'default-profile-1',
    name: 'Full Stack Engineer',
    data: {
      ...DEFAULT_PERSONA_DATA,
      targetRoles: ['Full Stack Engineer', 'Software Engineer'],
    },
    createdAt: new Date().toISOString(),
  },
];

export class PersonaManager {
  private static inMemoryProfiles: PersonaProfile[] | null = null;
  private static cloudSaveTimer: ReturnType<typeof setTimeout> | null = null;

  public static getProfiles(): PersonaProfile[] {
    if (this.inMemoryProfiles && this.inMemoryProfiles.length > 0) {
      return this.inMemoryProfiles;
    }
    try {
      const raw = getSecureItem(PROFILES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const techRegex = /\b(?:python|javascript|typescript|c\+\+|java\b|c#|sql|mongodb|firebase|html5?|css3?|react|node|flask|opencv|dsa|system design|pandas|numpy|matplotlib|scikit-learn|databases|frameworks|oop|beautifulsoup|scrapy)\b/i;
          parsed.forEach((p: any) => {
            if (p.data && (p.data.applicationLimit === 50 || p.data.applicationLimit === undefined)) {
              p.data.applicationLimit = 5;
            }
            if (p.data && (p.data.minSalary === 50 || p.data.minSalary === undefined || p.data.minSalary === 150)) {
              p.data.minSalary = 12;
            }
            if (p.data?.resumeChunks?.languages && techRegex.test(p.data.resumeChunks.languages)) {
              const techContent = p.data.resumeChunks.languages;
              if (!p.data.resumeChunks.skills || !p.data.resumeChunks.skills.includes('Python')) {
                p.data.resumeChunks.skills = p.data.resumeChunks.skills
                  ? `${p.data.resumeChunks.skills}\n\n${techContent}`
                  : techContent;
              }
              p.data.resumeChunks.languages = 'English (Professional), Hindi, Telugu';
            }
          });
          this.inMemoryProfiles = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load persona profiles:', e);
    }
    this.saveProfiles(DEFAULT_INITIAL_PROFILES);
    return DEFAULT_INITIAL_PROFILES;
  }

  public static saveProfiles(profiles: PersonaProfile[]): void {
    this.inMemoryProfiles = profiles;
    try {
      setSecureItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.warn('LocalStorage quota limit reached when saving profiles; falling back to memory cache:', e);
      // Attempt saving with stripped large binary payloads if quota is exceeded
      try {
        const leanProfiles = profiles.map(p => ({
          ...p,
          savedResume: p.savedResume ? { name: p.savedResume.name, type: p.savedResume.type, base64Data: '' } : null
        }));
        setSecureItem(PROFILES_STORAGE_KEY, JSON.stringify(leanProfiles));
      } catch (fallbackError) {
        console.warn('Could not save reduced persona profiles:', fallbackError);
      }
    }

    if (this.cloudSaveTimer) clearTimeout(this.cloudSaveTimer);
    this.cloudSaveTimer = setTimeout(() => {
      const leanProfiles = profiles.map(({ savedResume: _savedResume, ...profile }) => profile);
      void FirebaseCloudSync.savePersonaProfiles(leanProfiles, this.getActiveProfileId());
    }, 800);
  }

  public static restoreCloudProfiles(
    cloudProfiles: Omit<PersonaProfile, 'savedResume'>[],
    activeProfileId: string,
  ): PersonaProfile[] {
    if (cloudProfiles.length === 0) return this.getProfiles();

    const localResumeById = new Map(
      this.getProfiles().map((profile) => [profile.id, profile.savedResume]),
    );
    const restored = cloudProfiles.slice(0, 50).map((profile) => ({
      ...profile,
      savedResume: localResumeById.get(profile.id) ?? null,
    }));
    this.inMemoryProfiles = restored;
    setSecureItem(PROFILES_STORAGE_KEY, JSON.stringify(restored));
    const validActiveId = restored.some((profile) => profile.id === activeProfileId)
      ? activeProfileId
      : restored[0].id;
    setSecureItem(ACTIVE_PROFILE_ID_KEY, validActiveId);
    return restored;
  }

  public static getActiveProfileId(): string {
    const profiles = this.getProfiles();
    const activeId = getSecureItem(ACTIVE_PROFILE_ID_KEY);
    const exists = profiles.some(p => p.id === activeId);
    if (exists && activeId) return activeId;
    return profiles[0]?.id || 'default-profile-1';
  }

  public static setActiveProfileId(id: string): void {
    setSecureItem(ACTIVE_PROFILE_ID_KEY, id);
  }

  public static getActiveProfile(): PersonaProfile {
    const profiles = this.getProfiles();
    const activeId = this.getActiveProfileId();
    const active = profiles.find(p => p.id === activeId);
    return active || profiles[0];
  }

  public static updateActiveProfileData(data: PersonaData, resumeFile?: SavedResumeFile | null): PersonaProfile {
    const profiles = this.getProfiles();
    const activeId = this.getActiveProfileId();
    const index = profiles.findIndex(p => p.id === activeId);

    if (index !== -1) {
      profiles[index].data = data;
      if (resumeFile !== undefined) {
        profiles[index].savedResume = resumeFile;
      }
      this.saveProfiles(profiles);
      return profiles[index];
    }

    const newProfile: PersonaProfile = {
      id: activeId,
      name: 'Primary Persona',
      data,
      savedResume: resumeFile,
      createdAt: new Date().toISOString(),
    };
    profiles.push(newProfile);
    this.saveProfiles(profiles);
    return newProfile;
  }

  public static createProfile(name: string, initialData?: PersonaData): PersonaProfile {
    const profiles = this.getProfiles();
    const activeProfile = this.getActiveProfile();

    const newProfile: PersonaProfile = {
      id: 'profile_' + Math.random().toString(36).substr(2, 9),
      name: name.trim() || 'New Persona',
      data: initialData ? { ...initialData } : { ...activeProfile.data },
      savedResume: activeProfile.savedResume || null,
      createdAt: new Date().toISOString(),
    };

    profiles.push(newProfile);
    this.saveProfiles(profiles);
    this.setActiveProfileId(newProfile.id);
    return newProfile;
  }

  public static deleteProfile(id: string): PersonaProfile[] {
    let profiles = this.getProfiles();
    if (profiles.length <= 1) return profiles; // Always keep at least 1 profile

    profiles = profiles.filter(p => p.id !== id);
    this.saveProfiles(profiles);

    if (this.getActiveProfileId() === id) {
      this.setActiveProfileId(profiles[0].id);
    }
    return profiles;
  }
}
