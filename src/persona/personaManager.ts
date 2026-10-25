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
  fullName: 'Sai Prasad Chary',
  location: 'Hyderabad, Telangana, India',
  city: 'Hyderabad',
  state: 'Telangana',
  country: 'India',
  postalCode: '500081',
  email: 'saiprasad.chary@gmail.com',
  phone: '+91 83743 70572',
  linkedIn: 'https://linkedin.com/in/saiprasad-chary',
  gitHub: 'https://github.com/saiprasadchary-hub',
  portfolio: '',
  experienceYears: 4,
  minSalary: 18,
  workPreference: 'Remote',
  tone: 'Confident',
  techStack: ['TypeScript', 'React', 'Node.js', 'Python', 'TailwindCSS', 'PostgreSQL', 'Docker', 'AWS', 'Next.js', 'GraphQL'],
  targetRoles: ['Full Stack Engineer', 'Software Engineer', 'Frontend Developer', 'AI/ML Engineer'],
  employmentStatus: 'currently_working',
  currentCompany: 'TechKareer Solutions',
  currentCtcLpa: 8,
  noticePeriodDays: 0,
  applyMode: 'easy',
  browserMode: 'agent',
  applicationLimit: 10,
  verified: true,
  resumeChunks: {
    summary: 'High-impact Software Engineer with 4+ years of hands-on experience building scalable distributed web applications, modern React/TypeScript user interfaces, and automated AI agents.',
    skills: 'TypeScript, JavaScript, React, Next.js, Node.js, Python, PostgreSQL, Redis, Docker, Kubernetes, AWS',
    education: 'Bachelor of Technology (B.Tech) in Computer Science & Engineering',
    experience: 'Full Stack Engineer: Architected high-performance web applications, implemented automated workflows, and reduced API response latencies by 35%.',
    languages: 'English (Professional), Hindi, Telugu',
  },
};

const DEFAULT_INITIAL_PROFILES: PersonaProfile[] = [
  {
    id: 'default-profile-1',
    name: 'Full Stack Engineer',
    data: {
      ...DEFAULT_PERSONA_DATA,
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
            if (p.data) {
              if (!p.data.fullName) p.data.fullName = DEFAULT_PERSONA_DATA.fullName;
              if (!p.data.email) p.data.email = DEFAULT_PERSONA_DATA.email;
              if (!p.data.phone) p.data.phone = DEFAULT_PERSONA_DATA.phone;
              if (!p.data.linkedIn) p.data.linkedIn = DEFAULT_PERSONA_DATA.linkedIn;
              if (!p.data.gitHub) p.data.gitHub = DEFAULT_PERSONA_DATA.gitHub;
              if (p.data.portfolio === 'https://saiprasadchary.dev') p.data.portfolio = '';
              if (!p.data.portfolio) p.data.portfolio = '';
              if (!p.data.techStack || p.data.techStack.length === 0) p.data.techStack = [...DEFAULT_PERSONA_DATA.techStack];
              if (!p.data.targetRoles || p.data.targetRoles.length === 0) p.data.targetRoles = [...DEFAULT_PERSONA_DATA.targetRoles];
              if (p.data.experienceYears === undefined || p.data.experienceYears === null) p.data.experienceYears = DEFAULT_PERSONA_DATA.experienceYears;
              if (!p.data.resumeChunks) p.data.resumeChunks = { ...DEFAULT_PERSONA_DATA.resumeChunks };
              if (p.data.applicationLimit === undefined) {
                p.data.applicationLimit = 10;
              }
              if (p.data.minSalary === undefined) {
                p.data.minSalary = 18;
              }
              if (!p.data.employmentStatus) {
                p.data.employmentStatus = (p.data.experienceYears && p.data.experienceYears > 0) ? 'currently_working' : 'fresher';
              }
              if (p.data.currentCtcLpa === undefined) {
                p.data.currentCtcLpa = p.data.employmentStatus === 'fresher' ? 0 : 8;
              }
              if (p.data.noticePeriodDays === undefined) {
                p.data.noticePeriodDays = 0;
              }
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

  public static updateActiveProfileData(data: Partial<PersonaData> | PersonaData, resumeFile?: SavedResumeFile | null): PersonaProfile {
    const profiles = this.getProfiles();
    const activeId = this.getActiveProfileId();
    const index = profiles.findIndex(p => p.id === activeId);

    if (index !== -1) {
      profiles[index].data = { ...profiles[index].data, ...data } as PersonaData;
      if (resumeFile !== undefined) {
        profiles[index].savedResume = resumeFile;
      }
      this.saveProfiles(profiles);
      return profiles[index];
    }

    const newProfile: PersonaProfile = {
      id: activeId,
      name: 'Primary Persona',
      data: { ...DEFAULT_PERSONA_DATA, ...data } as PersonaData,
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
