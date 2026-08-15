import type { PersonaData } from '../types';
import type { SavedResumeFile } from '../agent/autofill/resumeInjector';

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
  minSalary: 50,
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
  public static getProfiles(): PersonaProfile[] {
    try {
      const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((p: any) => {
            if (p.data && (p.data.applicationLimit === 50 || p.data.applicationLimit === undefined)) {
              p.data.applicationLimit = 5;
            }
          });
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
    try {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.error('Failed to save persona profiles:', e);
    }
  }

  public static getActiveProfileId(): string {
    const profiles = this.getProfiles();
    const activeId = localStorage.getItem(ACTIVE_PROFILE_ID_KEY);
    const exists = profiles.some(p => p.id === activeId);
    if (exists && activeId) return activeId;
    return profiles[0]?.id || 'default-profile-1';
  }

  public static setActiveProfileId(id: string): void {
    localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id);
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
