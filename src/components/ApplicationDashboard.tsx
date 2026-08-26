import React, { useState, useEffect, useMemo } from 'react';
import { ApplicationLogger, type ApplicationLogRecord } from '../agent/tracker/applicationLogger';
import {
  CheckCircle2,
  Download,
  Trash2,
  Search,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  FileCode,
  ChevronDown,
  ChevronUp,
  Send,
  ListChecks,
  Clock,
  Inbox
} from 'lucide-react';

interface ApplicationDashboardProps {
  globalLogs?: any[];
}

type SortColumn = 'timestamp' | 'portal' | 'jobTitle' | 'fieldsFilled' | 'status';
type SortDirection = 'asc' | 'desc';

const getPortalMeta = (portal: string, company: string) => {
  const p = (portal || '').toLowerCase();
  if (p.includes('linkedin')) {
    return {
      bg: 'bg-blue-50 text-[#0A66C2] border border-blue-200',
      tagBg: 'bg-blue-50 text-[#0A66C2] border-blue-200',
      label: 'LinkedIn',
      short: 'in',
    };
  }
  if (p.includes('greenhouse')) {
    return {
      bg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Greenhouse',
      short: 'GH',
    };
  }
  if (p.includes('lever')) {
    return {
      bg: 'bg-zinc-100 text-zinc-800 border border-zinc-200',
      tagBg: 'bg-zinc-100 text-zinc-800 border-zinc-200',
      label: 'Lever',
      short: 'LV',
    };
  }
  if (p.includes('workday')) {
    return {
      bg: 'bg-amber-50 text-amber-800 border border-amber-200',
      tagBg: 'bg-amber-50 text-amber-800 border-amber-200',
      label: 'Workday',
      short: 'WD',
    };
  }
  if (p.includes('indeed')) {
    return {
      bg: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      tagBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      label: 'Indeed',
      short: 'ID',
    };
  }
  return {
    bg: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
    tagBg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    label: portal || 'Direct Apply',
    short: (company || 'AP').slice(0, 2).toUpperCase(),
  };
};

export const ApplicationDashboard: React.FC<ApplicationDashboardProps> = () => {
  const [logs, setLogs] = useState<ApplicationLogRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PARTIAL' | 'FAILED'>('ALL');
  const [sortColumn, setSortColumn] = useState<SortColumn>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = ApplicationLogger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsubscribe();
  }, []);

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all application history? This action cannot be undone.')) {
      ApplicationLogger.clearLogs();
    }
  };

  const handleDeleteRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this application record?')) {
      ApplicationLogger.deleteLog(id);
    }
  };

  const handleCopyUrl = (id: string, url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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

  const handleExportJson = () => {
    const json = ApplicationLogger.exportToJson();
    if (!json) return;

    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ZeroApply_Applications_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const totalApplications = logs.length;
  const successfulApplications = logs.filter((l) => l.status === 'SUCCESS').length;
  const partialApplications = logs.filter((l) => l.status === 'PARTIAL').length;
  const failedApplications = logs.filter((l) => l.status === 'FAILED').length;
  const successRate = totalApplications > 0 ? Math.round((successfulApplications / totalApplications) * 100) : 0;
  const totalFieldsFilled = logs.reduce((acc, curr) => acc + (curr.fieldsFilled || 0), 0);

  // Filter & Sort
  const filteredAndSortedLogs = useMemo(() => {
    const filtered = logs.filter((log) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (log.jobTitle || '').toLowerCase().includes(q) ||
        (log.companyName || '').toLowerCase().includes(q) ||
        (log.portal || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortColumn === 'timestamp') {
        aVal = new Date(a.timestamp).getTime();
        bVal = new Date(b.timestamp).getTime();
      } else if (sortColumn === 'fieldsFilled') {
        aVal = a.fieldsFilled || 0;
        bVal = b.fieldsFilled || 0;
      } else if (sortColumn === 'portal') {
        aVal = (a.portal || '').toLowerCase();
        bVal = (b.portal || '').toLowerCase();
      } else if (sortColumn === 'jobTitle') {
        aVal = (a.jobTitle || '').toLowerCase();
        bVal = (b.jobTitle || '').toLowerCase();
      } else if (sortColumn === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [logs, searchQuery, statusFilter, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedLogs.slice(start, start + pageSize);
  }, [filteredAndSortedLogs, currentPage, pageSize]);

  return (
    <div className="flex-1 bg-[#FAFAFA] flex flex-col h-full overflow-y-auto p-4 sm:p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto w-full space-y-5 sm:space-y-6">

        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200/80 pb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              Applications Dashboard
            </h1>
            <p className="text-xs text-zinc-500 font-medium mt-0.5">
              Live audit trail of automated job applications and form completion sessions.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleExportCsv}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              title="Export as CSV spreadsheet"
            >
              <Download size={13} className="text-zinc-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handleExportJson}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              title="Export as JSON dataset"
            >
              <FileCode size={13} className="text-zinc-600" />
              <span>JSON Backup</span>
            </button>

            <button
              onClick={handleClearHistory}
              disabled={logs.length === 0}
              className="px-3 py-1.5 bg-white border border-zinc-200 hover:border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              title="Clear all application logs"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          </div>
        </div>

        {/* Clean Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase text-zinc-500">Total Apps</span>
              <Send size={13} className="text-zinc-500" />
            </div>
            <span className="text-2xl font-black text-zinc-900 tracking-tight">{totalApplications}</span>
            <span className="text-[10px] font-medium text-zinc-400 mt-0.5">Tracked targets</span>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase text-zinc-500">Success Rate</span>
              <CheckCircle2 size={14} className="text-emerald-600" />
            </div>
            <span className="text-2xl font-black text-zinc-900 tracking-tight">{successRate}%</span>
            <span className="text-[10px] font-medium text-zinc-400 mt-0.5">{successfulApplications} verified completed</span>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase text-zinc-500">Fields Handled</span>
              <ListChecks size={14} className="text-zinc-500" />
            </div>
            <span className="text-2xl font-black text-zinc-900 tracking-tight">{totalFieldsFilled}</span>
            <span className="text-[10px] font-medium text-zinc-400 mt-0.5">Form inputs completed</span>
          </div>

          <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-400 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase text-zinc-500">Last Active</span>
              <Clock size={13} className="text-zinc-500" />
            </div>
            <span className="text-sm font-extrabold text-zinc-800 truncate block">
              {logs[0] ? new Date(logs[0].timestamp).toLocaleDateString() : 'None'}
            </span>
            <span className="text-[10px] font-medium text-zinc-400 mt-0.5">
              {logs[0] ? new Date(logs[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No session'}
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-2xs space-y-3">
          {/* Row 1: Search + Sort + Rows */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 w-full sm:w-80 focus-within:bg-white focus-within:border-zinc-400 transition-all">
              <Search size={14} className="text-zinc-400 shrink-0" />
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter by job title, company, portal..."
                className="bg-transparent text-xs text-zinc-800 outline-none w-full font-medium placeholder:text-zinc-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-zinc-400 hover:text-zinc-600 text-xs font-bold px-1"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <select
                value={`${sortColumn}-${sortDirection}`}
                onChange={(e) => {
                  const [col, dir] = e.target.value.split('-') as [SortColumn, SortDirection];
                  setSortColumn(col);
                  setSortDirection(dir);
                  setCurrentPage(1);
                }}
                className="bg-zinc-100/90 border border-zinc-200/70 text-zinc-700 text-xs font-semibold rounded-xl px-2.5 py-1.5 outline-none cursor-pointer hover:bg-zinc-50 transition"
              >
                <option value="timestamp-desc">Newest First</option>
                <option value="timestamp-asc">Oldest First</option>
                <option value="fieldsFilled-desc">Most Fields</option>
                <option value="jobTitle-asc">Job Title (A-Z)</option>
              </select>

              <div className="hidden md:flex items-center gap-1 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/70">
                {[10, 25, 50].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-1 rounded-lg font-mono text-[11px] transition-all cursor-pointer ${
                      pageSize === size
                        ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/60'
                        : 'text-zinc-500 hover:text-zinc-800 font-semibold'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Status Segmented Control */}
          <div className="flex items-center gap-1 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/70 w-fit">
            {[
              { id: 'ALL' as const, label: 'All', count: totalApplications },
              { id: 'SUCCESS' as const, label: 'Success', count: successfulApplications },
              { id: 'PARTIAL' as const, label: 'Partial', count: partialApplications },
              { id: 'FAILED' as const, label: 'Failed', count: failedApplications },
            ].map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => {
                  setStatusFilter(id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all text-xs flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  statusFilter === id
                    ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/60'
                    : 'text-zinc-500 hover:text-zinc-800 font-semibold'
                }`}
              >
                <span>{label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  statusFilter === id ? 'bg-zinc-100 text-zinc-900 font-bold' : 'bg-zinc-200/70 text-zinc-500'
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Applications Ledger List */}
        <div className="space-y-3">
          {filteredAndSortedLogs.length === 0 ? (
            <div className="bg-white border border-zinc-200 rounded-2xl p-12 text-center text-zinc-500 space-y-2 shadow-2xs">
              <Inbox size={36} className="mx-auto text-zinc-300 mb-2" />
              <p className="font-bold text-sm text-zinc-800">No application records found</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No records match your active search criteria.'
                  : 'Applications submitted through the browser will automatically populate here in real-time.'}
              </p>
            </div>
          ) : (
            <>
              {paginatedLogs.map((log) => {
                const isExpanded = expandedId === log.id;
                const isCopied = copiedId === log.id;
                const portalMeta = getPortalMeta(log.portal, log.companyName);

                return (
                  <div
                    key={log.id}
                    className="bg-white border border-zinc-200 hover:border-zinc-300 rounded-2xl overflow-hidden shadow-2xs transition-all"
                  >
                    <div
                      className="p-4 cursor-pointer flex items-center justify-between bg-white hover:bg-zinc-50/60 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Distinctive Portal / Brand Badge */}
                        <div
                          className={`w-9 h-9 rounded-xl ${portalMeta.bg} text-xs flex items-center justify-center shrink-0 shadow-2xs font-bold font-sans tracking-tight`}
                        >
                          {portalMeta.short}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-zinc-900 truncate text-sm">
                              {log.jobTitle}
                            </h3>
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-medium text-[11px] flex items-center gap-1.5 ${
                                log.status === 'SUCCESS'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : log.status === 'PARTIAL'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  log.status === 'SUCCESS'
                                    ? 'bg-emerald-500'
                                    : log.status === 'PARTIAL'
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                              />
                              <span>{log.status === 'SUCCESS' ? 'Submitted' : log.status === 'PARTIAL' ? 'Partial' : 'Failed'}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 mt-1 flex-wrap">
                            <span className="font-semibold text-zinc-800">
                              {log.companyName || 'Direct Application'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-zinc-300" />
                            <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-semibold border ${portalMeta.tagBg}`}>
                              {portalMeta.label}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-zinc-300" />
                            <span className="font-mono text-zinc-600 font-bold">
                              {log.fieldsFilled} {log.fieldsFilled === 1 ? 'field' : 'fields'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-zinc-300" />
                            <span className="font-mono text-[10.5px] text-zinc-400 flex items-center gap-1">
                              <Clock size={11} />
                              {new Date(log.timestamp).toLocaleDateString()} at{' '}
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {log.url && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => handleCopyUrl(log.id, log.url, e)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
                              title={isCopied ? 'URL Copied!' : 'Copy job listing link'}
                            >
                              {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            </button>

                            <a
                              href={log.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors inline-flex items-center gap-1 font-semibold"
                              title="Open application URL"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDeleteRow(log.id, e)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete record"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="text-zinc-400 pl-0.5">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Row Drawer */}
                    {isExpanded && (
                      <div className="border-t border-zinc-100 bg-zinc-50/70 p-4 sm:p-5 space-y-3 animate-fadeIn">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs">
                          <div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                              Record ID &amp; Exact Timestamp
                            </span>
                            <span className="font-mono text-zinc-700 text-[11px] block mt-0.5">
                              {log.id} • {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                              Portal &amp; Form Completion
                            </span>
                            <span className="font-semibold text-zinc-800 text-[11px] block mt-0.5">
                              {log.portal} ({log.fieldsFilled} dynamic inputs filled)
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                              Target Listing URL
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-zinc-600 truncate max-w-[200px]">
                                {log.url || 'No URL captured'}
                              </span>
                              {log.url && (
                                <button
                                  onClick={(e) => handleCopyUrl(log.id, log.url, e)}
                                  className="text-zinc-800 hover:underline font-bold text-[10px] cursor-pointer shrink-0"
                                >
                                  {isCopied ? 'Copied!' : 'Copy'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pagination Bar */}
              <div className="bg-white border border-zinc-200 rounded-2xl px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-zinc-600 font-medium shadow-2xs">
                <div>
                  Showing <span className="font-bold text-zinc-900 font-mono">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-bold text-zinc-900 font-mono">
                    {Math.min(currentPage * pageSize, filteredAndSortedLogs.length)}
                  </span>{' '}
                  of <span className="font-bold text-zinc-900 font-mono">{filteredAndSortedLogs.length}</span> applications
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                      .map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-7 h-7 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                            currentPage === page
                              ? 'bg-zinc-900 text-white shadow-2xs'
                              : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
