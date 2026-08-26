import React from 'react';
import type { PersonaData } from '../../types';
import type { ResumeDocument } from '../types';
import { resumeToPersona, personaToResume } from '../exportUtils';
import { PersonaManager } from '../../persona';
import { 
  ArrowLeftRight, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  User, 
  FileText
} from 'lucide-react';

interface PersonaSyncModalProps {
  document: ResumeDocument;
  persona: PersonaData;
  onUpdateDocument: React.Dispatch<React.SetStateAction<ResumeDocument>>;
  onUpdatePersona?: (p: PersonaData) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const PersonaSyncModal: React.FC<PersonaSyncModalProps> = ({
  document: doc,
  persona,
  onUpdateDocument: setDoc,
  onUpdatePersona,
  onClose,
  onToast,
}) => {
  // Push resume changes to persona
  const handlePushResumeToPersona = () => {
    const personaUpdates = resumeToPersona(doc);
    const updatedPersona = {
      ...persona,
      ...personaUpdates,
      updatedAt: Date.now(),
    } as PersonaData;

    PersonaManager.updateActiveProfileData(updatedPersona);
    if (onUpdatePersona) {
      onUpdatePersona(updatedPersona);
    }
    onToast('Synced Resume data to Candidate Persona Profile!');
    onClose();
  };

  // Pull persona data to resume
  const handlePullPersonaToResume = () => {
    const updatedDoc = personaToResume(persona, doc);
    setDoc(updatedDoc);
    onToast('Loaded Persona profile attributes into Resume Studio!');
    onClose();
  };

  const allResumeSkills = [
    ...doc.skills.languages,
    ...doc.skills.frontend,
    ...doc.skills.backend,
    ...doc.skills.databases,
    ...doc.skills.cloudDevops,
    ...doc.skills.tools,
    ...doc.skills.custom,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                2-Way Candidate Persona Sync
              </h2>
              <p className="text-xs text-zinc-400">
                Compare and synchronize attributes between your Candidate Persona & ATS Resume.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Side by side diff preview */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Header Row */}
          <div className="grid grid-cols-2 gap-4 pb-2 border-b border-zinc-800 text-xs font-bold uppercase tracking-wider">
            <div className="text-teal-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Candidate Persona Profile
            </div>
            <div className="text-cyan-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Active Resume Document
            </div>
          </div>

          {/* Full Name */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
            <div>
              <div className="text-[10px] text-zinc-500 font-semibold mb-0.5">Name</div>
              <div className="font-semibold text-zinc-200">{persona.fullName || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 font-semibold mb-0.5">Name</div>
              <div className="font-semibold text-zinc-200">{doc.contact.fullName || '—'}</div>
            </div>
          </div>

          {/* Target Title */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
            <div>
              <div className="text-[10px] text-zinc-500 font-semibold mb-0.5">Target Role</div>
              <div className="text-zinc-300">{persona.targetRoles?.[0] || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 font-semibold mb-0.5">Target Role</div>
              <div className="text-zinc-300">{doc.contact.jobTitle || '—'}</div>
            </div>
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
            <div>
              <div className="text-[10px] text-zinc-500 font-semibold mb-0.5">Contact</div>
              <div className="text-zinc-300">{persona.email} | {persona.phone}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 font-semibold mb-0.5">Contact</div>
              <div className="text-zinc-300">{doc.contact.email} | {doc.contact.phone}</div>
            </div>
          </div>

          {/* Skills Count */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
            <div>
              <div className="text-[10px] text-zinc-500 font-semibold mb-0.5">Tech Stack ({persona.techStack?.length || 0})</div>
              <div className="text-zinc-300 line-clamp-2">{persona.techStack?.join(', ') || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 font-semibold mb-0.5">Resume Skills ({allResumeSkills.length})</div>
              <div className="text-zinc-300 line-clamp-2">{allResumeSkills.join(', ') || '—'}</div>
            </div>
          </div>

          {/* Experience entries count */}
          <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
            <div>
              <div className="text-[10px] text-zinc-500 font-semibold mb-0.5">Work History</div>
              <div className="text-zinc-300">Autofill Profile Data</div>
            </div>
            <div>
              <div className="text-[10px] text-zinc-500 font-semibold mb-0.5">Work History</div>
              <div className="text-zinc-300">{doc.experience.length} detailed role entries</div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePullPersonaToResume}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-semibold transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Pull Persona → Resume
            </button>
            <button
              onClick={handlePushResumeToPersona}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg transition"
            >
              Push Resume → Persona
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
