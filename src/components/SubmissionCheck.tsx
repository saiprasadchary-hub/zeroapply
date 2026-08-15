import React, { useState, useEffect } from 'react';
import { QALogger, type QALogRecord } from '../agent/tracker/qaLogger';
import { 
  ClipboardCheck, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Trash2, 
  Building2, 
  Briefcase, 
  FileSpreadsheet, 
  FileCode, 
  BrainCircuit, 
  UserCheck, 
  Copy, 
  Check, 
  Layers
} from 'lucide-react';

export const SubmissionCheck: React.FC = () => {
  const [logs, setLogs] = useState<QALogRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'IN_PROGRESS'>('ALL');
  const [portalFilter, setPortalFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = QALogger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, []);

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all QA submission history?')) {
      QALogger.clearLogs();
      setExpandedId(null);
    }
  };

  const handleDeleteEntry = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    QALogger.deleteLog(id);
    if (expandedId === id) setExpandedId(null);
  };

  const handleExportCsv = () => {
    const csvContent = QALogger.exportAsCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zeroapply_qa_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const jsonContent = QALogger.exportAsJson();
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zeroapply_qa_export_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyLogAnswers = (e: React.MouseEvent, log: QALogRecord) => {
    e.stopPropagation();
    const text = log.qaPairs
      .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}\n[Source: ${qa.source || 'persona'}]`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Extract unique portals for filtering
  const portals = Array.from(new Set(logs.map((l) => l.portal).filter(Boolean)));

  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !query ||
      log.jobTitle.toLowerCase().includes(query) ||
      log.companyName.toLowerCase().includes(query) ||
      log.portal.toLowerCase().includes(query) ||
      log.qaPairs.some(
        (qa) => qa.question.toLowerCase().includes(query) || qa.answer.toLowerCase().includes(query)
      );

    const matchesStatus = statusFilter === 'ALL' || (log.status || 'SUBMITTED') === statusFilter;
    const matchesPortal = portalFilter === 'ALL' || log.portal === portalFilter;

    return matchesSearch && matchesStatus && matchesPortal;
  });

  // Calculate live stats
  const totalQuestions = logs.reduce((sum, l) => sum + (l.qaPairs?.length || 0), 0);
  const llmSolved = logs.reduce(
    (sum, l) => sum + (l.qaPairs?.filter((qa) => qa.source === 'ollama').length || 0),
    0
  );
  const personaInjected = logs.reduce(
    (sum, l) => sum + (l.qaPairs?.filter((qa) => qa.source !== 'ollama').length || 0),
    0
  );

  return (
    <div className="flex-1 bg-[#F8FAFC] flex flex-col h-full overflow-y-auto p-3 sm:p-6 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto w-full space-y-4 sm:space-y-6">
        
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs font-mono tracking-wide uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>100% Real-Time QA Telemetry</span>
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight mt-1">Submission Check</h1>
            <p className="text-xs font-semibold text-zinc-500 mt-0.5">
              Live audit trail of exact questions, screening prompts, and responses filled by the agent.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportCsv}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-40"
              title="Export as CSV spreadsheet"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-40"
              title="Export as JSON dataset"
            >
              <FileCode size={13} className="text-cyan-600" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleClearHistory}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-40"
              title="Clear QA history"
            >
              <Trash2 size={13} />
              <span>Clear Data</span>
            </button>
          </div>
        </div>

        {/* Real-time Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase">Applications</span>
              <Briefcase size={14} className="text-cyan-600" />
            </div>
            <span className="text-xl font-extrabold text-zinc-900">{logs.length}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Recorded targets</span>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase">Total Q&A</span>
              <Layers size={14} className="text-emerald-600" />
            </div>
            <span className="text-xl font-extrabold text-zinc-900">{totalQuestions}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Inputs answered</span>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase">Qwen 2.5 Local</span>
              <BrainCircuit size={14} className="text-cyan-600" />
            </div>
            <span className="text-xl font-extrabold text-cyan-700">{llmSolved}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Screening answers</span>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 shadow-2xs flex flex-col">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase">Persona Data</span>
              <UserCheck size={14} className="text-fuchsia-600" />
            </div>
            <span className="text-xl font-extrabold text-zinc-900">{personaInjected}</span>
            <span className="text-[10px] text-zinc-400 mt-0.5">Credentials mapped</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 w-full sm:w-80">
            <Search size={14} className="text-zinc-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions, answers, jobs..."
              className="bg-transparent text-xs text-zinc-800 outline-none w-full font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs font-mono">
            {/* Status Selector */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
              {(['ALL', 'SUBMITTED', 'IN_PROGRESS'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-bold ${
                    statusFilter === st
                      ? 'bg-white text-zinc-900 shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'SUBMITTED' ? 'Submitted' : 'In-Progress'}
                </button>
              ))}
            </div>

            {/* Portal Selector */}
            {portals.length > 0 && (
              <select
                value={portalFilter}
                onChange={(e) => setPortalFilter(e.target.value)}
                className="bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
              >
                <option value="ALL">All Portals</option>
                {portals.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Submissions List */}
        <div className="space-y-3.5">
          {filteredLogs.length === 0 ? (
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center text-zinc-500 space-y-2 shadow-2xs">
              <ClipboardCheck size={36} className="mx-auto text-zinc-300 mb-2" />
              <p className="font-semibold text-sm text-zinc-700">No QA records matching criteria</p>
              <p className="text-xs text-zinc-400">
                Form questions and auto-filled answers populate live as the agent operates.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedId === log.id;
              const isInProgress = log.status === 'IN_PROGRESS';
              
              return (
                <div 
                  key={log.id} 
                  className={`bg-white border rounded-2xl overflow-hidden shadow-2xs transition-all ${
                    isInProgress ? 'border-cyan-300 ring-2 ring-cyan-50' : 'border-zinc-200/80 hover:border-zinc-300'
                  }`}
                >
                  <div 
                    className="p-4 cursor-pointer flex items-center justify-between bg-white hover:bg-zinc-50/70 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isInProgress ? 'bg-cyan-50 text-cyan-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        <Briefcase size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-zinc-900 truncate text-sm">{log.jobTitle}</h3>
                          {isInProgress ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800 border border-cyan-200 animate-pulse">
                              LIVE DRAFT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              SUBMITTED
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 text-xs font-semibold text-zinc-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Building2 size={12} />
                            {log.companyName}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-zinc-300" />
                          <span>{log.portal}</span>
                          <span className="w-1 h-1 rounded-full bg-zinc-300" />
                          <span className="font-mono text-[10.5px] text-zinc-400">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-mono">
                        {log.qaPairs.length} inputs
                      </span>

                      <button
                        onClick={(e) => copyLogAnswers(e, log)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-700 hover:bg-cyan-50 transition-colors"
                        title="Copy all Q&A pairs for this job"
                      >
                        {copiedId === log.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>

                      <button
                        onClick={(e) => handleDeleteEntry(e, log.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete this record"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div className="text-zinc-400 pl-1">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="border-t border-zinc-100 bg-zinc-50/60 p-4 space-y-2.5 animate-fadeIn">
                      {log.qaPairs.length === 0 ? (
                        <p className="text-xs font-medium text-zinc-500 italic px-2">
                          No fields auto-filled for this application yet.
                        </p>
                      ) : (
                        log.qaPairs.map((qa, index) => (
                          <div 
                            key={index} 
                            className="bg-white border border-zinc-200/90 rounded-xl p-3.5 shadow-2xs flex flex-col gap-2 transition-all hover:border-zinc-300"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-xs font-bold text-zinc-800 font-mono bg-zinc-100/90 px-2.5 py-1 rounded-md border border-zinc-200/70">
                                Q: {qa.question}
                              </span>

                              {/* Source Badge */}
                              <div className="flex items-center gap-1 text-[10px] font-mono font-bold">
                                {qa.source === 'ollama' ? (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">
                                    <BrainCircuit size={10} className="text-cyan-600" />
                                    <span>Qwen 2.5 Local {qa.confidence ? `(${Math.round(qa.confidence * 100)}%)` : ''}</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200">
                                    <UserCheck size={10} className="text-zinc-500" />
                                    <span>Persona: {qa.category || 'Standard'}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-xs font-semibold text-cyan-900 pl-3 py-1 border-l-2 border-cyan-500 bg-cyan-50/30 rounded-r-md font-sans">
                              {qa.answer}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
