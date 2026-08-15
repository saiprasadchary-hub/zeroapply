import React, { useState, useEffect } from 'react';
import { QuestionMemoryBank, type QuestionMemoryEntry } from './questionMemory';
import { Brain, Plus, Trash2, ChevronDown, ChevronUp, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { generateQAMatrix, STANDARD_SCREENING_QUESTIONS } from './qaGenerator';
import type { PersonaData } from '../../types';

interface MemoryBankManagerProps {
  persona: PersonaData;
}

export const MemoryBankManager: React.FC<MemoryBankManagerProps> = ({ persona }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [entries, setEntries] = useState<QuestionMemoryEntry[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0, question: '' });

  const refreshEntries = () => {
    setEntries(QuestionMemoryBank.getEntries());
  };

  useEffect(() => {
    refreshEntries();
  }, []);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || !answerInput.trim()) return;
    QuestionMemoryBank.addOrUpdateEntry(questionInput, answerInput);
    setQuestionInput('');
    setAnswerInput('');
    refreshEntries();
  };

  const handleDelete = (id: string) => {
    QuestionMemoryBank.deleteEntry(id);
    refreshEntries();
  };

  const handleGenerateMatrix = async () => {
    if (!persona.resumeChunks && (!persona.techStack || persona.techStack.length === 0)) {
      alert("Please upload a resume or fill out your tech stack first so the AI has context.");
      return;
    }
    
    setIsGenerating(true);
    try {
      await generateQAMatrix(persona, (current, total, currentQuestion) => {
        setGenProgress({ current, total, question: currentQuestion });
        refreshEntries(); // Refresh as they come in
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
      setGenProgress({ current: 0, total: 0, question: '' });
      refreshEntries();
    }
  };

  return (
    <div className="border border-zinc-200 bg-white rounded-2xl overflow-hidden shadow-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-zinc-50 hover:bg-zinc-100/80 flex items-center justify-between transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Brain size={14} />
          </div>
          <div>
            <span className="font-bold text-xs text-zinc-900 block">Question Memory Bank</span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {entries.length} saved custom answers for behavioral questions
            </span>
          </div>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 text-xs border-t border-zinc-200">
          
          {/* AI Generator Panel */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-indigo-900 flex items-center gap-1.5 mb-1">
                  <Wand2 size={14} className="text-indigo-600" />
                  Auto-Generate Q&A Matrix
                </h4>
                <p className="text-indigo-700/80 text-[11px] leading-relaxed max-w-sm">
                  Let the local AI instantly pre-answer the {STANDARD_SCREENING_QUESTIONS.length} most common job application questions based on your resume. This allows for 0ms answers during auto-apply.
                </p>
              </div>
              <button
                onClick={handleGenerateMatrix}
                disabled={isGenerating}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>Generate Matrix</>
                )}
              </button>
            </div>
            
            {isGenerating && (
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-[10px] text-indigo-800 font-bold font-mono">
                  <span>Processing: {genProgress.question}</span>
                  <span>{genProgress.current} / {genProgress.total}</span>
                </div>
                <div className="w-full bg-indigo-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${(genProgress.current / Math.max(1, genProgress.total)) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Add New Memory Entry Form */}
          <form onSubmit={handleAddSubmit} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-zinc-800 font-bold">
              <Sparkles size={13} className="text-indigo-600" />
              <span>Save Preferred Answer</span>
            </div>

            <div>
              <input
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="Question (e.g., Why do you want to work here?)"
                className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 outline-none font-medium text-zinc-800 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <textarea
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder="Your custom answer..."
                rows={2}
                className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 outline-none font-medium text-zinc-800 focus:border-indigo-500"
                required
              />
            </div>

            <button
              type="submit"
              className="px-3 py-1.5 bg-zinc-900 hover:bg-black text-white font-bold rounded-lg flex items-center gap-1 transition-all"
            >
              <Plus size={13} className="text-cyan-400" />
              <span>Save to Memory</span>
            </button>
          </form>

          {/* List of Memory Entries */}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {entries.map((entry) => (
              <div 
                key={entry.id} 
                className="bg-white border border-zinc-200/90 rounded-xl p-3.5 relative hover:border-zinc-300 transition-all shadow-2xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2 pr-6">
                  <div>
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-mono font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/70 inline-block mb-1">
                      Question :
                    </span>
                    <span className="font-bold text-zinc-900 block text-xs leading-snug">
                      {entry.questionPattern}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="text-zinc-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors shrink-0"
                    title="Remove from Memory Bank"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div>
                  <span className="px-2 py-0.5 rounded-md text-[9.5px] font-mono font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/70 inline-block mb-1">
                    Answer :
                  </span>
                  <p className="text-zinc-800 font-medium text-xs leading-relaxed bg-zinc-50/80 p-2.5 rounded-lg border border-zinc-200/60 font-sans">
                    {entry.answerText}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
