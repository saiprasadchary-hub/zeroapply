import React, { useState, useMemo } from 'react';
import type { ResumeDocument } from '../types';
import { Target, Check, Plus, X } from 'lucide-react';
import { resumeToPlainText } from '../exportUtils';

interface AtsKeywordHeatmapProps {
  document: ResumeDocument;
  onUpdateDocument: React.Dispatch<React.SetStateAction<ResumeDocument>>;
  onToast?: (msg: string) => void;
}

const COMMON_TECH_KEYWORDS = [
  'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Go', 'Rust', 'Java', 'C++',
  'PostgreSQL', 'MongoDB', 'Redis', 'SQL', 'GraphQL', 'REST APIs', 'FastAPI', 'Express',
  'AWS', 'Docker', 'Kubernetes', 'CI/CD', 'GitHub Actions', 'Terraform', 'Microservices',
  'Kafka', 'RabbitMQ', 'WebSockets', 'Jest', 'Playwright', 'Next.js', 'TailwindCSS',
  'Distributed Systems', 'System Design', 'Agile', 'Performance Optimization', 'OAuth2'
];

export const AtsKeywordHeatmap: React.FC<AtsKeywordHeatmapProps> = ({
  document: doc,
  onUpdateDocument: setDoc,
  onToast,
}) => {
  const [targetJobText, setTargetJobText] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const fullResumeText = useMemo(() => resumeToPlainText(doc).toLowerCase(), [doc]);

  // Extract keywords from pasted job description or use common tech keywords
  const evaluatedKeywords = useMemo(() => {
    let list = COMMON_TECH_KEYWORDS;
    if (targetJobText.trim()) {
      const words = targetJobText.split(/[\s,;|\n]+/).map(w => w.replace(/[^a-zA-Z0-9.+#]/g, '').trim()).filter(w => w.length > 2);
      const uniqueWords = Array.from(new Set(words));
      const filtered = COMMON_TECH_KEYWORDS.filter(k => 
        uniqueWords.some(w => w.toLowerCase() === k.toLowerCase())
      );
      list = filtered.length >= 4 ? filtered : COMMON_TECH_KEYWORDS;
    }

    const matched: string[] = [];
    const missing: string[] = [];

    list.forEach((kw) => {
      if (fullResumeText.includes(kw.toLowerCase())) {
        matched.push(kw);
      } else {
        missing.push(kw);
      }
    });

    const matchRate = Math.round((matched.length / Math.max(1, list.length)) * 100);

    return { matched, missing, matchRate, total: list.length };
  }, [fullResumeText, targetJobText]);

  // Add missing keyword directly to technical skills
  const handleAddKeywordToSkills = (keyword: string) => {
    let category: keyof ResumeDocument['skills'] = 'tools';

    const kwLower = keyword.toLowerCase();
    if (['typescript', 'javascript', 'python', 'go', 'java', 'c++', 'rust', 'sql'].some(k => kwLower.includes(k))) {
      category = 'languages';
    } else if (['react', 'next', 'tailwind', 'vue', 'angular', 'redux', 'vite'].some(k => kwLower.includes(k))) {
      category = 'frontend';
    } else if (['node', 'express', 'fastapi', 'rest', 'graphql', 'microservices'].some(k => kwLower.includes(k))) {
      category = 'backend';
    } else if (['postgres', 'mongo', 'redis', 'sql', 'mysql', 'dynamo'].some(k => kwLower.includes(k))) {
      category = 'databases';
    } else if (['aws', 'docker', 'k8s', 'kubernetes', 'ci/cd', 'terraform', 'linux'].some(k => kwLower.includes(k))) {
      category = 'cloudDevops';
    }

    setDoc((prev) => {
      const skills = { ...prev.skills };
      const currentList = skills[category] || [];
      if (!currentList.includes(keyword)) {
        skills[category] = [...currentList, keyword];
      }

      return {
        ...prev,
        skills,
        updatedAt: Date.now(),
      };
    });

    if (onToast) onToast(`Added "${keyword}" to ${category} skills matrix!`);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
        title="Open ATS Keyword Match & Target JD Analyzer"
      >
        <Target size={12} className="text-emerald-200" />
        <span>Match Job Description ({evaluatedKeywords.matchRate}%)</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-zinc-300 rounded-2xl p-4 shadow-xl space-y-3 animate-slideDown max-w-xl w-full text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
            <Target size={14} />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-zinc-900 flex items-center gap-2">
              <span>Target Job Keyword Match Radar</span>
              <span className="text-[11px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                {evaluatedKeywords.matchRate}% Match
              </span>
            </h4>
            <p className="text-[11px] text-zinc-500 font-medium">
              Paste a target job description to pinpoint missing skills &amp; keywords in real time.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg"
        >
          <X size={14} />
        </button>
      </div>

      {/* Target Job Description Paste Area */}
      <div>
        <textarea
          value={targetJobText}
          onChange={(e) => setTargetJobText(e.target.value)}
          rows={2}
          placeholder="Paste Job Description (e.g. from LinkedIn or Greenhouse) to match required keywords..."
          className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-zinc-800 outline-none focus:border-emerald-500 leading-relaxed font-medium resize-none"
        />
      </div>

      {/* Matched Keywords */}
      <div className="space-y-1">
        <span className="font-bold text-emerald-900 block text-[11px] flex items-center gap-1">
          <Check size={12} className="text-emerald-600" />
          <span>Present on Resume ({evaluatedKeywords.matched.length}):</span>
        </span>
        <div className="flex flex-wrap gap-1">
          {evaluatedKeywords.matched.map((kw) => (
            <span
              key={kw}
              className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-semibold px-2 py-0.5 rounded-md"
            >
              ✓ {kw}
            </span>
          ))}
        </div>
      </div>

      {/* Missing Keywords with 1-Click Injection */}
      {evaluatedKeywords.missing.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-zinc-100">
          <span className="font-bold text-amber-900 block text-[11px]">
            ⚠️ Missing from Resume (Click to inject into skills):
          </span>
          <div className="flex flex-wrap gap-1">
            {evaluatedKeywords.missing.slice(0, 15).map((kw) => (
              <button
                key={kw}
                type="button"
                onClick={() => handleAddKeywordToSkills(kw)}
                className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                title={`Add ${kw} to resume skills`}
              >
                <Plus size={10} />
                <span>{kw}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
