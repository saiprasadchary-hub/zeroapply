import React, { useState, useMemo } from 'react';
import type { ResumeDocument } from '../types';
import { resumeToPlainText } from '../exportUtils';
import { 
  Target, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  TrendingUp,
  FileSearch,
  Copy,
  Check
} from 'lucide-react';

interface JobDescriptionMatcherProps {
  document: ResumeDocument;
  onUpdateDocument: React.Dispatch<React.SetStateAction<ResumeDocument>>;
  onToast: (msg: string) => void;
}

interface ExtractedKeyword {
  word: string;
  category: 'hard_skill' | 'soft_skill' | 'qualification' | 'domain';
  frequency: number;
  matched: boolean;
}

// Common technical and soft skills dictionary for high-precision extraction
const TECH_SKILLS_KEYWORDS = [
  'react', 'typescript', 'javascript', 'python', 'java', 'node', 'nodejs', 'express',
  'aws', 'docker', 'kubernetes', 'k8s', 'ci/cd', 'github actions', 'sql', 'postgresql',
  'mongodb', 'redis', 'graphql', 'rest api', 'tailwind', 'nextjs', 'next.js', 'vue',
  'microservices', 'gcp', 'azure', 'terraform', 'git', 'system design', 'agile', 'scrum',
  'tdd', 'jest', 'cypress', 'kafka', 'elasticsearch', 'fastapi', 'flask', 'django',
  'c++', 'c#', '.net', 'rust', 'go', 'golang', 'linux', 'oauth', 'jwt', 'security',
  'pandas', 'numpy', 'scikit-learn', 'pytorch', 'tensorflow', 'prompt engineering', 'llm'
];

const SOFT_SKILLS_KEYWORDS = [
  'leadership', 'mentorship', 'cross-functional', 'communication', 'collaboration',
  'problem solving', 'stakeholder management', 'architecture', 'scalability', 'performance',
  'optimization', 'code review', 'analytical', 'ownership', 'critical thinking'
];

export const JobDescriptionMatcher: React.FC<JobDescriptionMatcherProps> = ({
  document: doc,
  onUpdateDocument: setDoc,
  onToast,
}) => {
  const [jobDescription, setJobDescription] = useState<string>('');
  const [targetCompany, setTargetCompany] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'missing' | 'matched'>('all');
  const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

  const resumeTextLower = useMemo(() => {
    return resumeToPlainText(doc).toLowerCase();
  }, [doc]);

  // Extract keywords from JD and evaluate match status against active resume
  const analysis = useMemo(() => {
    if (!jobDescription.trim()) return null;

    const jdText = jobDescription.toLowerCase();
    const words = jdText.replace(/[^a-z0-9+#./\s-]/gi, ' ').split(/\s+/).filter(w => w.length > 1);
    const wordFreq: Record<string, number> = {};
    words.forEach(w => {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    });

    const extractedList: ExtractedKeyword[] = [];
    const seen = new Set<string>();

    // Match known tech skills
    TECH_SKILLS_KEYWORDS.forEach((skill) => {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(jobDescription)) {
        if (!seen.has(skill.toLowerCase())) {
          seen.add(skill.toLowerCase());
          extractedList.push({
            word: skill,
            category: 'hard_skill',
            frequency: (jdText.match(regex) || []).length || 1,
            matched: resumeTextLower.includes(skill.toLowerCase()),
          });
        }
      }
    });

    // Match soft skills
    SOFT_SKILLS_KEYWORDS.forEach((skill) => {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(jobDescription)) {
        if (!seen.has(skill.toLowerCase())) {
          seen.add(skill.toLowerCase());
          extractedList.push({
            word: skill,
            category: 'soft_skill',
            frequency: (jdText.match(regex) || []).length || 1,
            matched: resumeTextLower.includes(skill.toLowerCase()),
          });
        }
      }
    });

    // Match capitalized keywords or phrases in the JD
    const rawMatches = jobDescription.match(/\b[A-Z][a-zA-Z0-9+#]{2,}\b/g) || [];
    rawMatches.forEach((raw) => {
      const clean = raw.trim();
      const lower = clean.toLowerCase();
      if (!seen.has(lower) && !['the', 'and', 'with', 'for', 'you', 'will', 'our', 'team', 'role', 'work', 'job', 'year', 'years', 'experience'].includes(lower)) {
        seen.add(lower);
        extractedList.push({
          word: clean,
          category: 'domain',
          frequency: (jdText.match(new RegExp(`\\b${lower}\\b`, 'g')) || []).length,
          matched: resumeTextLower.includes(lower),
        });
      }
    });

    // Sort by frequency
    extractedList.sort((a, b) => b.frequency - a.frequency);

    const total = extractedList.length;
    const matchedCount = extractedList.filter(k => k.matched).length;
    const matchPercentage = total > 0 ? Math.round((matchedCount / total) * 100) : 0;

    return {
      keywords: extractedList,
      total,
      matchedCount,
      missingCount: total - matchedCount,
      matchPercentage,
    };
  }, [jobDescription, resumeTextLower]);

  // 1-Click insert missing keyword into Skills category
  const handleInsertKeywordToSkills = (keyword: string) => {
    const capitalized = keyword.charAt(0).toUpperCase() + keyword.slice(1);
    setDoc((prev) => {
      // Avoid duplicate
      const allCurrent = [
        ...prev.skills.languages,
        ...prev.skills.frontend,
        ...prev.skills.backend,
        ...prev.skills.databases,
        ...prev.skills.cloudDevops,
        ...prev.skills.tools,
        ...prev.skills.custom,
      ];
      if (allCurrent.some(s => s.toLowerCase() === keyword.toLowerCase())) {
        return prev;
      }
      return {
        ...prev,
        updatedAt: Date.now(),
        skills: {
          ...prev.skills,
          custom: [...prev.skills.custom, capitalized],
        },
      };
    });
    onToast(`Added "${capitalized}" to Skills (Core Competencies)!`);
  };

  const handleCopyKeyword = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyword(text);
    setTimeout(() => setCopiedKeyword(null), 1500);
  };

  const filteredKeywords = useMemo(() => {
    if (!analysis) return [];
    if (filter === 'matched') return analysis.keywords.filter(k => k.matched);
    if (filter === 'missing') return analysis.keywords.filter(k => !k.matched);
    return analysis.keywords;
  }, [analysis, filter]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-100 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Live Job Description Matcher
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                ATS Gap Analysis
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Paste target job posting to scan missing hard skills, ATS keywords, and benchmark your match score.
            </p>
          </div>
        </div>

        {analysis && (
          <div className="flex items-center gap-3 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800">
            <div className="text-right">
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">JD Match Score</div>
              <div className="text-lg font-extrabold text-white flex items-center gap-1 justify-end">
                <span className={analysis.matchPercentage >= 80 ? 'text-emerald-400' : analysis.matchPercentage >= 60 ? 'text-amber-400' : 'text-rose-400'}>
                  {analysis.matchPercentage}%
                </span>
                <span className="text-xs text-zinc-500 font-normal">({analysis.matchedCount}/{analysis.total})</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-zinc-800 bg-zinc-900">
              <TrendingUp className={`w-5 h-5 ${analysis.matchPercentage >= 80 ? 'text-emerald-400' : analysis.matchPercentage >= 60 ? 'text-amber-400' : 'text-rose-400'}`} />
            </div>
          </div>
        )}
      </div>

      {/* Target Company & Role (Optional Context) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-zinc-400 block mb-1">Target Company (Optional)</label>
          <input
            type="text"
            value={targetCompany}
            onChange={(e) => setTargetCompany(e.target.value)}
            placeholder="e.g. Google, Stripe, Meta, Amazon..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500 placeholder-zinc-600"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-400 block mb-1">Target Role</label>
          <input
            type="text"
            value={doc.contact.jobTitle}
            onChange={(e) => setDoc(prev => ({ ...prev, contact: { ...prev.contact, jobTitle: e.target.value } }))}
            placeholder="e.g. Senior Full-Stack Engineer"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500 placeholder-zinc-600"
          />
        </div>
      </div>

      {/* Paste Job Description */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <FileSearch className="w-4 h-4 text-cyan-400" />
            Paste Job Description / Requirements
          </label>
          {jobDescription && (
            <button
              onClick={() => setJobDescription('')}
              className="text-[11px] text-zinc-400 hover:text-rose-400 transition"
            >
              Clear JD
            </button>
          )}
        </div>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={5}
          placeholder="Paste full job description, requirements, qualification bullets, and responsibilities here to analyze keyword density..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed placeholder-zinc-600 resize-y"
        />
      </div>

      {/* Analysis Results & Badges */}
      {analysis ? (
        <div className="space-y-4">
          {/* Progress Bar & Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-950/80 p-3 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-400">Filter Keywords:</span>
              <button
                onClick={() => setFilter('all')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                  filter === 'all'
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All ({analysis.total})
              </button>
              <button
                onClick={() => setFilter('missing')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                  filter === 'missing'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                Missing ({analysis.missingCount})
              </button>
              <button
                onClick={() => setFilter('matched')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                  filter === 'matched'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                Matched ({analysis.matchedCount})
              </button>
            </div>

            <div className="text-[11px] text-zinc-400">
              {analysis.missingCount > 0 ? (
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {analysis.missingCount} recommended keywords missing
                </span>
              ) : (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  100% Keywords Matched!
                </span>
              )}
            </div>
          </div>

          {/* Keywords Grid */}
          <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-1 pr-2">
            {filteredKeywords.map((k) => (
              <div
                key={k.word}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border transition ${
                  k.matched
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                }`}
              >
                {k.matched ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                
                <span className="font-semibold">{k.word}</span>

                {k.frequency > 1 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                    x{k.frequency}
                  </span>
                )}

                <div className="flex items-center gap-1 ml-1 border-l border-zinc-700/50 pl-1.5">
                  <button
                    onClick={() => handleCopyKeyword(k.word)}
                    title="Copy Keyword"
                    className="p-1 text-zinc-400 hover:text-zinc-100 transition rounded"
                  >
                    {copiedKeyword === k.word ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>

                  {!k.matched && (
                    <button
                      onClick={() => handleInsertKeywordToSkills(k.word)}
                      title="1-Click Add to Resume Skills"
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 text-[10px] font-medium transition"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      Add to Skills
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
          Paste a job description above to see instant keyword density, missing technical skills, and match scoring.
        </div>
      )}
    </div>
  );
};
