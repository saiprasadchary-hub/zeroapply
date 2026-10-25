import React, { useEffect, useState } from 'react';
import { Database, Trash2, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { PersonaData } from '../../types';
import { QuestionMemoryBank, type MemoryEntry } from './questionMemory';

interface MemoryBankManagerProps {
  persona: PersonaData;
}

export const MemoryBankManager: React.FC<MemoryBankManagerProps> = ({ persona }) => {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const refresh = () => {
    setEntries(QuestionMemoryBank.getInstance().getAll());
  };

  useEffect(() => {
    refresh();
  }, [persona]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    QuestionMemoryBank.addOrUpdateEntry(newQuestion.trim(), newAnswer.trim(), 'custom');
    setNewQuestion('');
    setNewAnswer('');
    setIsAdding(false);
    refresh();
  };

  const handleClear = () => {
    if (confirm('Clear all cached questions & answers?')) {
      QuestionMemoryBank.getInstance().clear();
      refresh();
    }
  };

  const handleReseed = () => {
    QuestionMemoryBank.getInstance().seedFromPersona(persona);
    refresh();
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-cyan-600" />
          <h3 className="font-semibold text-zinc-900 text-sm">Question Memory Bank ({entries.length})</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReseed}
            className="text-xs text-zinc-600 hover:text-cyan-600 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
            title="Re-seed from current Persona"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Persona</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="text-xs bg-cyan-50 text-cyan-700 hover:bg-cyan-100 flex items-center gap-1 font-medium px-2 py-1 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add QA</span>
          </button>
          {entries.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-1 font-medium px-2 py-1 rounded transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 space-y-2 text-xs">
          <input
            type="text"
            placeholder="Question or Prompt (e.g. Years of Python experience?)"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded text-xs focus:ring-1 focus:ring-cyan-500 outline-none"
          />
          <input
            type="text"
            placeholder="Desired exact answer (e.g. 5)"
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded text-xs focus:ring-1 focus:ring-cyan-500 outline-none"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2.5 py-1 rounded text-zinc-600 hover:bg-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-medium shadow-sm"
            >
              Save QA
            </button>
          </div>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-xs text-zinc-400 italic">No saved questions yet. Answers will be cached here automatically.</p>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-zinc-100">
          {entries.slice(0, 30).map((entry) => (
            <div key={entry.normalizedQuestion} className="pt-1.5 flex items-start justify-between text-xs">
              <div className="truncate pr-2">
                <p className="font-medium text-zinc-800 truncate">{entry.question}</p>
                <p className="text-cyan-700 font-mono text-[11px] truncate">{entry.answer}</p>
              </div>
              <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded uppercase shrink-0">
                {entry.source}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
