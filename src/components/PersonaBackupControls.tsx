import { parseProfileBackup } from '../persona/profileBackup';
import { setSecureItemDurable } from '../services/secureStorage';
import React, { useRef, useState } from 'react';
import type { PersonaData } from '../types';
import { PersonaManager } from '../persona/personaManager';


export function PersonaBackupControls({ persona, setPersona, onSaveToast }: { persona: PersonaData; setPersona: React.Dispatch<React.SetStateAction<PersonaData>>; onSaveToast: (message: string) => void }): React.JSX.Element {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const restore = async (file?: File): Promise<void> => {
    if (!file) return;
    setError('');
    try {
      if (file.size > 8_000_000) throw new Error('Profile backups must be smaller than 8 MB.');
      const backup = parseProfileBackup(JSON.parse(await file.text()));
      const activeId = PersonaManager.getActiveProfileId();
      const profiles = PersonaManager.getProfiles().map(profile => profile.id === activeId ? { ...profile, name: backup.name || profile.name, data: backup.data, savedResume: backup.savedResume ?? profile.savedResume } : profile);
      if (!profiles.some(profile => profile.id === activeId)) throw new Error('The active profile no longer exists.');
      await setSecureItemDurable('zeroapply_persona_profiles_list', JSON.stringify(profiles));
      PersonaManager.saveProfiles(profiles);
      setPersona(backup.data);
      onSaveToast('Profile backup restored, including its saved resume.');
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'The profile backup could not be restored.'); }
    finally { if (input.current) input.current.value = ''; }
  };
  const download = (): void => {
    const active = PersonaManager.getActiveProfile();
    const blob = new Blob([JSON.stringify({ ...active, data: persona }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'zeroapply-profile-backup.json'; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section aria-label="Profile backup" className="rounded-xl border border-zinc-200 bg-white p-3 text-xs space-y-2">
    <p className="font-semibold">Profile backup &amp; restore</p>
    <p>Backups include your saved profile and resume. Keep them private.</p>
    <div className="flex gap-2"><button type="button" onClick={download} className="rounded border px-3 py-2">Export profile backup</button><button type="button" onClick={() => input.current?.click()} className="rounded border px-3 py-2">Restore profile backup</button></div>
    <input ref={input} type="file" accept="application/json,.json" aria-label="Choose profile backup" className="hidden" onChange={event => { void restore(event.target.files?.[0]); }} />
    {error && <p role="alert" className="text-rose-700">{error}</p>}
  </section>;
}
