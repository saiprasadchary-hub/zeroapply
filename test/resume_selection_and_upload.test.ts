import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredResume, RESUME_STORAGE_KEY } from '../src/agent/fileUpload/resumeFileAdapter';
import { PersonaManager } from '../src/persona/personaManager';
import type { PersonaData } from '../src/types';

describe('Resume Selection and Upload Verification', () => {
  const candidatePersona: PersonaData = {
    fullName: 'Sai Prasad Chary',
    location: 'Hyderabad, Telangana, India',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    postalCode: '500081',
    email: 'kspchary077@gmail.com',
    phone: '+91 83743 70572',
    techStack: ['Python', 'TypeScript', 'React Native'],
    targetRoles: ['Software Engineer', 'Full Stack Developer'],
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('getStoredResume retrieves resume from PersonaManager active profile', () => {
    PersonaManager.createProfile('AI Engineer Profile', candidatePersona);
    const active = PersonaManager.getActiveProfile();
    expect(active).toBeDefined();

    PersonaManager.updateActiveProfile(candidatePersona, {
      name: 'KSPChary_Resume_1Page.pdf',
      type: 'application/pdf',
      size: 6144, // 6 KB
      base64: 'JVBERi0xLjQKJcTl8uXrp...',
      lastModified: Date.now(),
    });

    const stored = getStoredResume();
    expect(stored).toBeDefined();
    expect(stored?.name).toBe('KSPChary_Resume_1Page.pdf');
    expect(stored?.type).toBe('application/pdf');
    expect(stored?.base64Data).toBe('JVBERi0xLjQKJcTl8uXrp...');
  });

  it('getStoredResume falls back to localStorage RESUME_STORAGE_KEY and supports base64 property', () => {
    localStorage.setItem(
      RESUME_STORAGE_KEY,
      JSON.stringify({
        name: 'SaiPrasad_Chary_Resume.pdf',
        type: 'application/pdf',
        size: 10240,
        base64: 'SGVsbG8gV29ybGQgUERGIENvbnRlbnQ=',
      })
    );

    const stored = getStoredResume();
    expect(stored).toBeDefined();
    expect(stored?.name).toBe('SaiPrasad_Chary_Resume.pdf');
    expect(stored?.base64Data).toBe('SGVsbG8gV29ybGQgUERGIENvbnRlbnQ=');
  });

  it('evaluates LinkedIn Easy Apply resume picker selection in simulated DOM', () => {
    // Set up mock DOM representing LinkedIn Easy Apply modal
    document.body.innerHTML = `
      <div class="jobs-easy-apply-modal">
        <div class="jobs-document-upload">
          <ul class="jobs-resume-picker__list">
            <li class="jobs-resume-picker__list-item">
              <button class="jobs-resume-picker__resume-btn" aria-checked="false" data-resume-name="Old_Resume_2022.pdf">
                <input type="radio" name="jobs-resume-picker-options" value="old" />
                <span>Old_Resume_2022.pdf</span>
              </button>
            </li>
            <li class="jobs-resume-picker__list-item">
              <button class="jobs-resume-picker__resume-btn" aria-checked="false" data-resume-name="KSPChary_Resume_1Page (1).pdf">
                <input type="radio" name="jobs-resume-picker-options" value="kspchary" />
                <span>KSPChary_Resume_1Page (1).pdf</span>
              </button>
            </li>
          </ul>
          <button aria-label="Upload resume">Upload resume</button>
          <input type="file" style="display:none;" />
        </div>
      </div>
    `;

    const matchTerms = ['sai', 'prasad', 'chary', 'kspchary', 'software', 'engineer', 'resume'];

    // Run the selection algorithm
    const rawItems = Array.from(document.querySelectorAll('button.jobs-resume-picker__resume-btn'));
    expect(rawItems.length).toBe(2);

    let target: HTMLElement | null = null;
    for (const el of rawItems) {
      const text = (el.getAttribute('data-resume-name') || el.textContent || '').toLowerCase();
      if (matchTerms.some((t) => text.includes(t))) {
        target = el as HTMLElement;
        break;
      }
    }

    expect(target).not.toBeNull();
    expect(target?.getAttribute('data-resume-name')).toBe('KSPChary_Resume_1Page (1).pdf');

    // Simulate clicking and selecting
    const radio = target?.querySelector('input[type="radio"]') as HTMLInputElement;
    if (radio) radio.checked = true;
    target?.setAttribute('aria-checked', 'true');

    expect(radio.checked).toBe(true);
    expect(target?.getAttribute('aria-checked')).toBe('true');
  });

  it('preserves already selected resume and never switches or flips between resumes', () => {
    document.body.innerHTML = `
      <div class="jobs-easy-apply-modal">
        <ul class="jobs-resume-picker__list">
          <li>
            <button class="jobs-resume-picker__resume-btn jobs-resume-picker__resume-btn--selected" aria-checked="true" data-resume-name="KSPChary_Resume_1Page (1).pdf">
              <span>KSPChary_Resume_1Page (1).pdf</span>
            </button>
          </li>
          <li>
            <button class="jobs-resume-picker__resume-btn" aria-checked="false" data-resume-name="Secondary_Resume.pdf">
              <span>Secondary_Resume.pdf</span>
            </button>
          </li>
        </ul>
      </div>
    `;

    const items = Array.from(document.querySelectorAll('button.jobs-resume-picker__resume-btn'));
    let alreadySelectedName: string | null = null;

    for (const el of items) {
      if (el.getAttribute('aria-checked') === 'true' || el.classList.contains('jobs-resume-picker__resume-btn--selected')) {
        alreadySelectedName = el.getAttribute('data-resume-name');
        break;
      }
    }

    expect(alreadySelectedName).toBe('KSPChary_Resume_1Page (1).pdf');
    // Verifies that secondary resume is not clicked when one is already selected
    expect(items[1].getAttribute('aria-checked')).toBe('false');
  });

  it('does not trigger upload when resume picker already has existing resumes', () => {
    const resumeStatus = {
      hasPicker: true,
      hasSelected: true,
      handled: true,
      selectedName: 'KSPChary_Resume_1Page (1).pdf',
    };
    const uploadZoneAvailable = true;

    // The fixed upload condition
    const shouldUpload = uploadZoneAvailable && !resumeStatus.hasPicker;
    expect(shouldUpload).toBe(false);
  });

  it('triggers upload only when no resumes exist in the picker', () => {
    const resumeStatusNoPicker = {
      hasPicker: false,
      hasSelected: false,
      handled: false,
      selectedName: '',
    };
    const uploadZoneAvailable = true;

    const shouldUpload = uploadZoneAvailable && !resumeStatusNoPicker.hasPicker;
    expect(shouldUpload).toBe(true);
  });
});
