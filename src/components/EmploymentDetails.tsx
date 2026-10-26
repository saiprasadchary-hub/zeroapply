import React from 'react';
import type { PersonaData } from '../types';

export function EmploymentDetails({ persona, onChange }: { persona: PersonaData; onChange: (patch: Partial<PersonaData>) => void }): React.JSX.Element {
  return <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-3">
    <legend className="px-1 text-xs font-semibold">Notice status &amp; joining dates</legend>
    <p className="text-xs text-zinc-500">Joining availability and serving notice are different facts. Leave unknown dates blank.</p>
    {persona.employmentStatus !== 'fresher' && <label className="block text-xs">Notice status
      <select aria-label="Notice status" value={persona.noticeStatus || ''} onChange={event => onChange({ noticeStatus: (event.target.value || undefined) as PersonaData['noticeStatus'] })} className="mt-1 w-full rounded-lg border p-2">
        <option value="">Not provided</option><option value="not_serving">Not currently serving notice</option><option value="serving">Currently serving notice</option><option value="relieved">Already relieved from my last company</option>
      </select>
    </label>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="text-xs">Earliest joining date<input aria-label="Earliest joining date" type="date" value={persona.joiningDate || ''} onChange={event => onChange({ joiningDate: event.target.value || undefined })} className="mt-1 w-full rounded-lg border p-2" /></label>
      {persona.employmentStatus !== 'fresher' && <label className="text-xs">Last working date<input aria-label="Last working date" type="date" value={persona.lastWorkingDate || ''} onChange={event => onChange({ lastWorkingDate: event.target.value || undefined })} className="mt-1 w-full rounded-lg border p-2" /></label>}
    </div>
  </fieldset>;
}
