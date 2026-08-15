import React, { useState, useEffect } from 'react';
import { ApplicationLogger, type ApplicationLogRecord } from '../agent/tracker/applicationLogger';
import type { ProcessLogEntry } from './ProcessLog';
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  Search,
  ExternalLink,
  Layers,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface ApplicationDashboardProps {
  globalLogs?: ProcessLogEntry[];
}

export const ApplicationDashboard: React.FC<ApplicationDashboardProps> = ({ globalLogs: _globalLogs }) => {
  const [logs, setLogs] = useState<ApplicationLogRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PARTIAL' | 'FAILED'>('ALL');

  useEffect(() => {
    const unsubscribe = ApplicationLogger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, []);

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear your application history?')) {
      ApplicationLogger.clearLogs();
    }
  };

  const handleExportCsv = () => {
    const csv = ApplicationLogger.exportToCsv();
    if (!csv) return;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ZeroApply_Applications_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.portal.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalApplications = logs.length;
  const successfulApplications = logs.filter((l) => l.status === 'SUCCESS').length;
  const successRate = totalApplications > 0 ? Math.round((successfulApplications / totalApplications) * 100) : 0;
  const totalFieldsFilled = logs.reduce((acc, curr) => acc + curr.fieldsFilled, 0);

  return (
    <div className="flex-1 bg-[#F8FAFC] flex flex-col h-full overflow-y-auto p-3 sm:p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto w-full space-y-4 sm:space-y-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-cyan-600 font-bold text-xs font-mono tracking-wide uppercase">
              <Sparkles size={14} />
              <span>Application Telemetry</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">Applications Dashboard</h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleExportCsv}
              disabled={logs.length === 0}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-40"
            >
              <Download size={14} className="text-cyan-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleClearHistory}
              disabled={logs.length === 0}
              className="px-3 py-2 bg-white border border-zinc-200 hover:border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40"
              title="Clear log history"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* Responsive Metrics Cards (2 Columns on Mobile, 4 on Desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 sm:p-5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
              <Briefcase size={18} className="sm:size-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-semibold text-zinc-500 block truncate">Total Apps</span>
              <span className="text-lg sm:text-2xl font-black text-zinc-900">{totalApplications}</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 sm:p-5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={18} className="sm:size-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-semibold text-zinc-500 block truncate">Success Rate</span>
              <span className="text-lg sm:text-2xl font-black text-zinc-900">{successRate}%</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 sm:p-5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Layers size={18} className="sm:size-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-semibold text-zinc-500 block truncate">Auto-Filled</span>
              <span className="text-lg sm:text-2xl font-black text-zinc-900">{totalFieldsFilled}</span>
            </div>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-3.5 sm:p-5 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Calendar size={18} className="sm:size-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs font-semibold text-zinc-500 block truncate">Last Active</span>
              <span className="text-xs sm:text-sm font-bold text-zinc-800 truncate block">
                {logs[0] ? new Date(logs[0].timestamp).toLocaleDateString() : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 w-full sm:max-w-md">
            <Search size={15} className="text-zinc-400 shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, company, or portal..."
              className="bg-transparent text-xs text-zinc-800 outline-none w-full font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-xs font-semibold text-zinc-500 shrink-0">Filter:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-zinc-800 outline-none cursor-pointer flex-1 sm:flex-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="PARTIAL">Partial</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </div>

        {/* Records Container: Desktop Table + Mobile Card Stack */}
        <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-xs">
          {filteredLogs.length === 0 ? (
            <div className="p-10 sm:p-12 text-center text-zinc-500 space-y-2">
              <Briefcase size={36} className="mx-auto text-zinc-300 mb-2" />
              <p className="font-semibold text-sm text-zinc-700">No application records found</p>
              <p className="text-xs text-zinc-400">Applications completed using the Agent will appear here automatically.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider font-mono text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Portal</th>
                      <th className="py-3 px-4">Job Title</th>
                      <th className="py-3 px-4">Fields Filled</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-zinc-600">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-zinc-800">
                          {log.portal}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-zinc-900">
                          {log.jobTitle}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-zinc-700">
                          {log.fieldsFilled} fields
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : log.status === 'PARTIAL'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {log.status === 'SUCCESS' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                            <span>{log.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <a
                            href={log.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-800 font-semibold text-[11px]"
                          >
                            <span>Open</span>
                            <ExternalLink size={12} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Stack View */}
              <div className="md:hidden divide-y divide-zinc-100">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-3.5 space-y-2 hover:bg-zinc-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-zinc-900 leading-snug">{log.jobTitle}</h4>
                        <span className="text-[11px] text-zinc-500 font-semibold">{log.portal}</span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] shrink-0 ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.status === 'PARTIAL'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {log.status === 'SUCCESS' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                        <span>{log.status}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="font-mono text-zinc-400 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.fieldsFilled} filled
                      </span>
                      {log.url && (
                        <a
                          href={log.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-600 font-bold hover:underline"
                        >
                          <span>Listing</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
