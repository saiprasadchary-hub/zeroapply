import React, { useState } from 'react';
import { X, Search, MapPin, Layers, Sparkles, Play } from 'lucide-react';
import { buildSearchUrl, type BatchSearchQuery } from '../orchestrator/batchApplyEngine';

interface BatchApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchBatch: (searchUrl: string, query: BatchSearchQuery) => void;
}

export const BatchApplyModal: React.FC<BatchApplyModalProps> = ({
  isOpen,
  onClose,
  onLaunchBatch,
}) => {
  const [roleKeyword, setRoleKeyword] = useState('Frontend Developer');
  const [location, setLocation] = useState('Remote');
  const [platform, setPlatform] = useState<BatchSearchQuery['platform']>('linkedin');
  const [maxApplications, setMaxApplications] = useState(5);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query: BatchSearchQuery = {
      roleKeyword,
      location,
      platform,
      maxApplications,
    };
    const searchUrl = buildSearchUrl(query);
    onLaunchBatch(searchUrl, query);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 p-1 rounded-lg"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 text-cyan-600 mb-1">
          <Sparkles size={18} />
          <h2 className="font-bold text-lg text-zinc-900 tracking-tight">Batch Auto-Apply</h2>
        </div>
        <p className="text-xs text-zinc-500 mb-5">
          Configure search parameters to search for roles and auto-apply in batch.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-zinc-700 block mb-1">Target Job Title / Skill</label>
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2">
              <Search size={14} className="text-zinc-400 shrink-0" />
              <input
                value={roleKeyword}
                onChange={(e) => setRoleKeyword(e.target.value)}
                placeholder="e.g. Full Stack Developer"
                className="bg-transparent w-full outline-none text-zinc-800 font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-zinc-700 block mb-1">Location Preference</label>
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2">
              <MapPin size={14} className="text-zinc-400 shrink-0" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Remote, New York, San Francisco"
                className="bg-transparent w-full outline-none text-zinc-800 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Job Portal</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full bg-zinc-50 border border-zinc-300 rounded-lg px-2.5 py-2 font-medium text-zinc-800 outline-none"
              >
                <option value="linkedin">LinkedIn (Easy Apply)</option>
                <option value="unstop">Unstop</option>
                <option value="indeed">Indeed</option>
                <option value="naukri">Naukri</option>
                <option value="glassdoor">Glassdoor</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Max Applications</label>
              <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2">
                <Layers size={14} className="text-zinc-400 shrink-0" />
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={maxApplications}
                  onChange={(e) => setMaxApplications(Number(e.target.value))}
                  className="bg-transparent w-full outline-none text-zinc-800 font-medium"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-2.5 bg-black hover:bg-zinc-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Play size={14} className="text-cyan-400" />
            <span>Search & Launch Auto-Apply</span>
          </button>
        </form>
      </div>
    </div>
  );
};
