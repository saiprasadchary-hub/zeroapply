import React, { useState } from 'react';
import type { ResumeDocument } from '../types';
import { 
  FileEdit, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  Building,
  Briefcase
} from 'lucide-react';
import { queryOllama } from '../../agent/llm/ollamaClient';

interface TailoredCoverLetterGeneratorProps {
  document: ResumeDocument;
  onToast: (msg: string) => void;
}

type CoverLetterTone = 'executive' | 'technical' | 'passionate' | 'concise';

export const TailoredCoverLetterGenerator: React.FC<TailoredCoverLetterGeneratorProps> = ({
  document: doc,
  onToast,
}) => {
  const [companyName, setCompanyName] = useState<string>('');
  const [jobTitle, setJobTitle] = useState<string>(doc.contact.jobTitle || '');
  const [tone, setTone] = useState<CoverLetterTone>('executive');
  const [coverLetterText, setCoverLetterText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate tailored cover letter
  const handleGenerate = async () => {
    setIsGenerating(true);
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const targetComp = companyName.trim() || 'Hiring Team';
    const targetRole = jobTitle.trim() || 'Software Engineer';
    const topExp = doc.experience[0];
    const topSkill = doc.skills.languages.slice(0, 3).concat(doc.skills.frontend || []).slice(0, 4).join(', ');

    const prompt = `Write a high-converting, professional ATS-tailored cover letter for:
Candidate: ${doc.contact.fullName}
Role: ${targetRole}
Company: ${targetComp}
Tone: ${tone}
Key Background: ${doc.summary || ''}
Recent Experience: ${topExp ? `${topExp.role} at ${topExp.company} (${topExp.bullets.slice(0, 2).join(' ')})` : ''}
Key Skills: ${topSkill}

Write the full letter without placeholders. Keep it punchy, impactful, and under 300 words.`;

    try {
      const response = await queryOllama(prompt);
      if (response && response.trim().length > 50) {
        setCoverLetterText(response.trim());
      } else {
        // Fallback robust template
        setCoverLetterText(generateFallbackLetter(doc, targetComp, targetRole, tone, dateStr));
      }
      onToast('Generated tailored cover letter!');
    } catch {
      setCoverLetterText(generateFallbackLetter(doc, targetComp, targetRole, tone, dateStr));
      onToast('Generated tailored cover letter!');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(coverLetterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onToast('Copied cover letter to clipboard!');
  };

  const handleDownloadDoc = () => {
    const filename = `${(doc.contact.fullName || 'Candidate').replace(/\s+/g, '_')}_Cover_Letter.doc`;
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cover Letter - ${doc.contact.fullName}</title>
  <style>
    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #111; margin: 1in; }
    p { margin-bottom: 12pt; }
  </style>
</head>
<body>
  ${coverLetterText.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}
</body>
</html>`;

    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-zinc-100 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <FileEdit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              1-Click AI Tailored Cover Letter
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Application Suite
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Generates a bespoke cover letter aligned with the active resume accomplishments and target role.
            </p>
          </div>
        </div>
      </div>

      {/* Target Parameters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-zinc-400 block mb-1">Target Company</label>
          <div className="relative">
            <Building className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Google, Microsoft..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400 block mb-1">Target Job Title</label>
          <div className="relative">
            <Briefcase className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-400 block mb-1">Writing Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as CoverLetterTone)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="executive">Executive & Confident</option>
            <option value="technical">Technical & Metrics-Driven</option>
            <option value="passionate">Passionate & High Energy</option>
            <option value="concise">Concise & Direct (1 Page)</option>
          </select>
        </div>
      </div>

      {/* Generate Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generating Letter...' : coverLetterText ? 'Regenerate Cover Letter' : 'Generate Cover Letter'}
        </button>
      </div>

      {/* Output Display */}
      {coverLetterText && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-300">Generated Cover Letter:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handleDownloadDoc}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download Word (.doc)
              </button>
            </div>
          </div>

          <textarea
            value={coverLetterText}
            onChange={(e) => setCoverLetterText(e.target.value)}
            rows={12}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-200 font-serif leading-relaxed focus:outline-none focus:border-emerald-500 resize-y"
          />
        </div>
      )}
    </div>
  );
};

function generateFallbackLetter(
  doc: ResumeDocument,
  company: string,
  role: string,
  _tone: CoverLetterTone,
  dateStr: string
): string {
  const topExp = doc.experience[0];
  const bulletSample = topExp?.bullets[0] || 'Engineered scalable and robust applications.';

  return `${dateStr}

Dear Hiring Team at ${company},

I am writing to express my strong enthusiasm for the ${role} position at ${company}. With a proven track record across ${doc.skills.languages.slice(0, 3).join(', ')} and ${doc.skills.backend.slice(0, 2).concat(doc.skills.frontend.slice(0, 2)).join(', ')}, I am excited about the opportunity to contribute to your engineering organization.

Throughout my experience${topExp ? ` as a ${topExp.role} at ${topExp.company}` : ''}, I have focused on delivering measurable business impact and high-availability systems. Notably, I ${bulletSample.toLowerCase()}

${company}'s commitment to excellence and high-velocity innovation aligns directly with my technical standards. I welcome the opportunity to discuss how my technical expertise and problem-solving mindset can accelerate your team's goals.

Thank you for your time and consideration.

Sincerely,

${doc.contact.fullName || 'Candidate'}
${[doc.contact.email, doc.contact.phone, doc.contact.location].filter(Boolean).join(' | ')}`;
}
