// Build-only adapters keep the existing desktop source and mobile layout intact.
const BLANK_PERSONA = `{
  fullName: '', location: '', email: '', phone: '', linkedIn: '', gitHub: '', portfolio: '',
  experienceYears: 0, minSalary: 0, workPreference: 'Remote', tone: 'Confident',
  techStack: [], targetRoles: [], applyMode: 'easy', browserMode: 'agent',
  applicationLimit: 5, verified: false, resumeChunks: {}
}`;

export function adaptAndroidSource(source, id) {
  const path = id.split('?')[0].replaceAll('\\', '/');
  if (path.endsWith('/src/App.tsx') || path.endsWith('/src/persona/personaManager.ts')) {
    const name = path.endsWith('/src/App.tsx') ? 'DEFAULT_PERSONA' : 'DEFAULT_PERSONA_DATA';
    const pattern = new RegExp(`const ${name}: PersonaData = \\{[\\s\\S]*?\\n\\};`);
    if (!pattern.test(source)) throw new Error(`Android build cannot safely replace ${name}. Review the adapter.`);
    return source.replace(pattern, `const ${name}: PersonaData = ${BLANK_PERSONA};`);
  }
  if (path.endsWith('/src/components/PersonaForm.tsx')) {
    const handler = /const handleAutoApplyClick = \(\) => \{[\s\S]*?\n  \};/;
    if (!handler.test(source)) throw new Error('Android AutoApply guard needs review.');
    return source.replace(handler, `const handleAutoApplyClick = (): void => {\n    onSaveToast('AutoApply and built-in AI are available in the desktop app. Android support is not ready yet.');\n  };`);
  }
  return null;
}
