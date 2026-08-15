import React, { useState } from 'react';
import { UserCheck, Plus, Trash2, X, Sparkles } from 'lucide-react';
import type { PersonaProfile } from './personaManager';

interface PersonaSelectorProps {
  activeProfile: PersonaProfile;
  profiles: PersonaProfile[];
  onSelectProfile: (id: string) => void;
  onCreateProfile: (name: string) => void;
  onDeleteProfile: (id: string) => void;
}

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  activeProfile,
  profiles,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPersonaName, setNewPersonaName] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonaName.trim()) return;
    onCreateProfile(newPersonaName.trim());
    setNewPersonaName('');
    setShowCreateModal(false);
  };

  return (
    <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white p-3 rounded-2xl shadow-md border border-zinc-800 space-y-2 mb-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
            <UserCheck size={16} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-semibold text-zinc-400 block uppercase tracking-wider">
              Active Persona Profile
            </span>
            <span className="text-xs font-extrabold text-white tracking-tight">
              {activeProfile.name}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-[11px] rounded-lg flex items-center gap-1 transition-all shadow-xs"
          title="Create a new tailored persona profile"
        >
          <Plus size={13} />
          <span>New Profile</span>
        </button>
      </div>

      {/* Profiles Quick Switch Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfile.id;
          return (
            <div
              key={profile.id}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                isActive
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-zinc-700/50'
              }`}
              onClick={() => onSelectProfile(profile.id)}
            >
              <span>{profile.name}</span>
              {profiles.length > 1 && isActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete persona profile "${profile.name}"?`)) {
                      onDeleteProfile(profile.id);
                    }
                  }}
                  className="ml-1 text-zinc-400 hover:text-red-500 p-0.5"
                  title="Delete this profile"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Create Persona Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white text-zinc-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-zinc-200 relative animate-fadeIn">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 p-1"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 text-cyan-600 mb-1">
              <Sparkles size={16} />
              <h3 className="font-bold text-base text-zinc-900">Create Persona Profile</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-4">
              Tailor a persona for specific roles (e.g. "AI Engineer", "Frontend Lead").
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Profile Name</label>
                <input
                  value={newPersonaName}
                  onChange={(e) => setNewPersonaName(e.target.value)}
                  placeholder="e.g. AI / Machine Learning Engineer"
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-cyan-500"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-black hover:bg-zinc-800 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow transition-all"
              >
                <Plus size={14} className="text-cyan-400" />
                <span>Create &amp; Tailor Profile</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
