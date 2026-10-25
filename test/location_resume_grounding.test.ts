import { describe, it, expect, beforeEach } from 'vitest';
import { extractLocationFromResume, resolveGeographicDetailsSync } from '../src/agent/location/geoIntelligence';
import { classifyFields } from '../src/agent/domScanner/fieldClassifier';
import { resolveQuestion } from '../src/agent/localLlm/questionResolver';
import { questionMemory } from '../src/agent/memory/questionMemory';
import type { PersonaData } from '../src/types';

describe('Location Resume Grounding & Hyderabad Resolution', () => {
  const candidatePersona: PersonaData = {
    fullName: 'Sai Prasad Chary',
    location: 'Hyderabad, Telangana, India',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    postalCode: '500081',
    email: 'kspchary077@gmail.com',
    phone: '+91 83743 70572',
    linkedIn: 'https://linkedin.com/in/saiprasad-chary',
    gitHub: 'https://github.com/saiprasadchary-hub',
    portfolio: 'https://saiprasadchary.dev',
    experienceYears: 4,
    minSalary: 18,
    workPreference: 'Remote',
    tone: 'Confident',
    techStack: ['Python', 'TypeScript', 'React', 'AI Agents'],
    targetRoles: ['Software Engineer', 'AI Engineer'],
    applyMode: 'easy',
    verified: true,
    resumeText: `
Sai Prasad Chary
Hyderabad, Telangana, India | +91 83743 70572 | kspchary077@gmail.com
Software Engineer & AI Automation Developer
Experienced with Python, AI Agents, and React web apps.
    `.trim(),
    resumeChunks: {
      summary: 'Software Engineer based in Hyderabad, Telangana with expertise in AI automation and Python.',
    },
  };

  beforeEach(() => {
    questionMemory.clear();
  });

  it('extractLocationFromResume detects Hyderabad from resume header and chunks', () => {
    const loc = extractLocationFromResume(candidatePersona);
    expect(loc).toBeDefined();
    expect(loc?.city).toBe('Hyderabad');
    expect(loc?.state).toBe('Telangana');
    expect(loc?.country).toBe('India');
    expect(loc?.postalCode).toBe('500081');
    expect(loc?.formattedAddress).toBe('Hyderabad, Telangana, India');
  });

  it('resolveGeographicDetailsSync prioritizes Hyderabad from resume even if persona had stale Bengaluru default', () => {
    const stalePersona: PersonaData = {
      ...candidatePersona,
      city: 'Bengaluru',
      location: 'Bengaluru, Karnataka, India',
      state: 'Karnataka',
    };

    const resolved = resolveGeographicDetailsSync(undefined, stalePersona);
    expect(resolved.city).toBe('Hyderabad');
    expect(resolved.state).toBe('Telangana');
    expect(resolved.formattedAddress).toBe('Hyderabad, Telangana, India');
  });

  it('classifyFields maps "Location (city)" field to Hyderabad address based on candidate resume', () => {
    const scannedFields = [
      {
        id: 'city-input',
        selector: '#city-input',
        tagName: 'input',
        inputType: 'text',
        label: 'Location (city)',
        placeholder: 'e.g. Hyderabad, India',
        name: 'city',
        required: true,
        currentValue: '',
      },
    ];

    const classified = classifyFields(scannedFields, candidatePersona);
    expect(classified.length).toBe(1);
    expect(classified[0].fieldType).toBe('city');
    expect(classified[0].mappedValue).toContain('Hyderabad');
  });

  it('questionResolver evicts stale "Bengaluru" memory cache when asked about Location (city)', async () => {
    // Seed question memory with an old poisoned answer (Bengaluru)
    questionMemory.set('Location (city)', 'Bengaluru, Karnataka, India', 'custom');
    expect(questionMemory.lookup('Location (city)').answer).toBe('Bengaluru, Karnataka, India');

    // Run questionResolver with the Hyderabad candidate
    const resolved = await resolveQuestion(
      {
        label: 'Location (city)',
        inputType: 'text',
      },
      candidatePersona
    );

    expect(resolved.answer).toContain('Hyderabad');
    expect(resolved.answer).not.toContain('Bengaluru');
  });

  it('classifyFields maps "Summary" field to candidate professional summary', () => {
    const summaryField = [
      {
        id: 'summary-textarea',
        selector: 'textarea#summary',
        tagName: 'textarea',
        inputType: 'textarea',
        label: 'Summary',
        name: 'summary',
        required: true,
        currentValue: '',
      },
    ];

    const classified = classifyFields(summaryField, candidatePersona);
    expect(classified.length).toBe(1);
    expect(classified[0].fieldType).toBe('summary');
    expect(classified[0].standardKey).toBe('professional_summary');

    // For textarea, mappedValue is left open for dynamic LLM synthesis
    expect(classified[0].mappedValue).toBeUndefined();

    // Verify non-textarea field gets direct persona mapped value
    const textSummaryField = [{ ...summaryField[0], inputType: 'text' }];
    const textClassified = classifyFields(textSummaryField, candidatePersona);
    expect(textClassified[0].mappedValue).toContain('Software Engineer based in Hyderabad');
  });

  it('questionResolver resolves "Summary" field to candidate professional summary without mid-word cutoffs', async () => {
    const resolved = await resolveQuestion(
      {
        label: 'Summary',
        inputType: 'textarea',
      },
      candidatePersona
    );

    expect(resolved.answer).toBeTruthy();
    expect(resolved.answer).toContain('Hyderabad');
    expect(resolved.answer).not.toMatch(/not\.\.\.$/);
  });
});

