// Build-only adapters keep the existing desktop source and mobile layout intact.
const BLANK_PERSONA = `{
  fullName: '', location: '', email: '', phone: '', linkedIn: '', gitHub: '', portfolio: '',
  experienceYears: 0, minSalary: 0, workPreference: 'Remote', tone: 'Confident',
  techStack: [], targetRoles: [], applyMode: 'easy', browserMode: 'agent',
  applicationLimit: 5, verified: false, employmentStatus: 'fresher', currentCtcLpa: 0, noticePeriodDays: 0, resumeChunks: {}
}`;

export function adaptAndroidSource(source, id) {
  const path = id.split('?')[0].replaceAll('\\', '/');
  if (path.endsWith('/src/App.tsx') || path.endsWith('/src/persona/personaManager.ts')) {
    const name = path.endsWith('/src/App.tsx') ? 'DEFAULT_PERSONA' : 'DEFAULT_PERSONA_DATA';
    const pattern = new RegExp(`const ${name}: PersonaData = \\{[\\s\\S]*?\\n\\};`);
    if (!pattern.test(source)) throw new Error(`Android build cannot safely replace ${name}. Review the adapter.`);
    return source.replace(pattern, `const ${name}: PersonaData = ${BLANK_PERSONA};`)
      .replace(/<AgentBrowser\s+persona=\{persona\}/, "<AgentBrowser isActive={activeTab === 'browser'} persona={persona}");
  }
  if (path.endsWith('/src/components/PersonaForm.tsx')) {
    const handler = /const handleAutoApplyClick = \(\) => \{[\s\S]*?\n  \};/;
    if (!handler.test(source)) throw new Error('Android AutoApply guard needs review.');
    return source.replace(handler, `const handleAutoApplyClick = (): void => {\n    if (!persona.fullName.trim() || !persona.email.trim()) { onSaveToast('Add your name and email before starting LinkedIn AutoApply.'); return; }\n    if (persona.browserMode !== 'agent') void initWebLlmEngine('review-start').catch((error: unknown): void => onSaveToast(error instanceof Error ? error.message : 'Phone AI could not start.'));\n    onLaunchBrowser?.('autoApply', 'linkedin');\n  };`);
  }
  if (path.endsWith('/src/resume/ResumeStudio.tsx')) {
    if (!source.includes('return DEFAULT_RESUME_DOCUMENT;')) throw new Error('Android blank resume initialization needs review.');
    return source.replace('return DEFAULT_RESUME_DOCUMENT;', 'return personaToResume(persona);');
  }
  if (path.endsWith('/src/auth/authService.ts')) {
    return source.replace(
      "if (!bridge?.isDesktop || !bridge.loginWithGoogleInChrome) return signInWithPopup(auth, googleProvider);",
      "if (window.location.origin === 'https://localhost' && bridge?.loginWithGoogleInChrome) { const result = await bridge.loginWithGoogleInChrome(); if (!result.ok) throw new Error(result.error); return signInWithCredential(auth, GoogleAuthProvider.credential(result.idToken)); }\n      if (!bridge?.isDesktop || !bridge.loginWithGoogleInChrome) return signInWithPopup(auth, googleProvider);"
    );
  }
  if (path.endsWith('/src/browserSelect/BrowserSelector.tsx')) {
    return source.replace('Opens installed Google Chrome with a dedicated ZeroApply Chrome profile and saved logins.', 'Opens Google Chrome on your phone with its saved logins. Fill and submit applications in Chrome yourself.')
      .replace('Chrome opens in its own window. Its saved logins are separate from the in-app browser and your personal Chrome profile.', 'Chrome uses your phone’s browser session. Automatic form filling is available in the in-app browser.');
  }
  return null;
}
