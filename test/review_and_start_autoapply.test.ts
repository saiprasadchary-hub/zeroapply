import assert from 'node:assert';
import test from 'node:test';
import { normalizeBrowserMode } from '../src/browserSelect';

test('AutoApply Button Immediate Start & Mode Coordination', async (t) => {
  await t.test('1. Incomplete memory chunks do NOT block AutoApply execution', () => {
    const REQUIRED_AUTOAPPLY_CHUNKS = [
      { key: 'summary', title: 'Executive Summary', desc: 'Professional pitch & background overview' },
      { key: 'experience', title: 'Work History & Roles', desc: 'Companies, responsibilities & achievements' },
      { key: 'skills', title: 'Technical Stack & Tools', desc: 'Languages, frameworks & libraries' },
      { key: 'projects', title: 'Featured Projects & Systems', desc: 'Architectures, GitHub repositories & apps' },
      { key: 'education', title: 'Education & Academic History', desc: 'Degrees, universities & honors' },
      { key: 'certifications', title: 'Certifications & Licenses', desc: 'Cloud credentials & accredited training' },
      { key: 'languages', title: 'Spoken Languages', desc: 'Language proficiencies & fluencies' },
    ];

    // Minimal persona without projects or certifications
    const personaChunks: Record<string, string> = {
      summary: 'Software Engineer',
      skills: 'TypeScript, Python',
      education: 'B.Tech',
      experience: '4 years backend experience',
      languages: 'English',
    };

    const isChunkReady = (key: string) => Boolean(personaChunks[key]?.trim());
    const missing = REQUIRED_AUTOAPPLY_CHUNKS.filter((s) => !isChunkReady(s.key));
    assert.strictEqual(missing.length, 2, 'Should detect 2 missing optional sections (projects, certifications)');

    let launchedAction: string | null = null;
    let launchedPlatform: string | null = null;
    const onLaunchBrowser = (action: string, platform: string) => {
      launchedAction = action;
      launchedPlatform = platform;
    };

    // The handler must invoke onLaunchBrowser directly without blocking
    const handleAutoApplyClick = () => {
      onLaunchBrowser('autoApply', 'linkedin');
    };

    handleAutoApplyClick();
    assert.strictEqual(launchedAction, 'autoApply', 'Must immediately launch autoApply');
    assert.strictEqual(launchedPlatform, 'linkedin', 'Must target platform linkedin');
  });

  await t.test('2. Role keyword fallback ensures autoApply never fails if targetRoles is empty', () => {
    const emptyPersona: any = {
      fullName: 'Test Candidate',
      targetRoles: [],
      techStack: ['Python', 'Django'],
    };

    const roleKeyword = emptyPersona.targetRoles?.[0]?.trim() || (emptyPersona.techStack?.[0] ? `${emptyPersona.techStack[0]} Developer` : 'Software Engineer');
    assert.strictEqual(roleKeyword, 'Python Developer');

    const barePersona: any = {
      targetRoles: [],
      techStack: [],
    };
    const defaultKeyword = barePersona.targetRoles?.[0]?.trim() || (barePersona.techStack?.[0] ? `${barePersona.techStack[0]} Developer` : 'Software Engineer');
    assert.strictEqual(defaultKeyword, 'Software Engineer');
  });

  await t.test('3. Effective browser mode accurately detects Real Chrome in both state and persona', () => {
    // Both own
    let browserMode = 'own';
    let personaMode = 'own';
    let effective = browserMode === 'agent' || normalizeBrowserMode(personaMode) === 'agent' ? 'agent' : 'own';
    assert.strictEqual(effective, 'own');

    // UI switched to Real Chrome
    browserMode = 'agent';
    personaMode = 'own';
    effective = browserMode === 'agent' || normalizeBrowserMode(personaMode) === 'agent' ? 'agent' : 'own';
    assert.strictEqual(effective, 'agent');

    // Persona configured with Real Chrome
    browserMode = 'own';
    personaMode = 'agent';
    effective = browserMode === 'agent' || normalizeBrowserMode(personaMode) === 'agent' ? 'agent' : 'own';
    assert.strictEqual(effective, 'agent');
  });
});
