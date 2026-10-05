import React, { useState, useEffect } from 'react';
import { QALogger, type QALogRecord } from '../agent/tracker/qaLogger';
import { 
  communityNotificationStore, 
  type CommunityNotification 
} from '../agent/tracker/communityNotificationStore';
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Trash2, 
  FileSpreadsheet, 
  FileCode, 
  Copy, 
  Check, 
  Clock, 
  Send, 
  ListChecks, 
  Workflow, 
  User, 
  CheckCircle2, 
  Inbox,
  Bot,
  FileText,
  Database,
  AlertCircle,
  Bell,
  Plus,
  ExternalLink,
  Sparkles,
  Filter,
  CheckCheck,
  Users,
  Radio,
  ArrowUpRight,
  Share2,
  X
} from 'lucide-react';

// Brand SVGs for authentic representation
const WhatsAppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.004c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
  </svg>
);

const TelegramIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.94z"/>
  </svg>
);

const isAiSource = (source?: string): boolean =>
  /^(ollama|llm|qwen|ai|local-llm)$/i.test(source || '');

const getPortalInfo = (portal: string, company: string) => {
  const p = (portal || '').toLowerCase();
  if (p.includes('linkedin')) {
    return {
      bg: 'bg-white text-blue-600 border border-blue-300',
      tagBg: 'bg-blue-50 text-blue-700 border-blue-200',
      label: 'LinkedIn',
      short: 'in',
    };
  }
  if (p.includes('greenhouse')) {
    return {
      bg: 'bg-emerald-600 text-white border-emerald-600',
      tagBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      label: 'Greenhouse',
      short: 'GH',
    };
  }
  if (p.includes('lever')) {
    return {
      bg: 'bg-zinc-900 text-white border-zinc-900',
      tagBg: 'bg-zinc-100 text-zinc-800 border-zinc-200',
      label: 'Lever',
      short: 'LV',
    };
  }
  if (p.includes('workday')) {
    return {
      bg: 'bg-amber-600 text-white border-amber-600',
      tagBg: 'bg-amber-50 text-amber-800 border-amber-200',
      label: 'Workday',
      short: 'WD',
    };
  }
  if (p.includes('indeed')) {
    return {
      bg: 'bg-indigo-600 text-white border-indigo-600',
      tagBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      label: 'Indeed',
      short: 'ID',
    };
  }
  return {
    bg: 'bg-zinc-800 text-white border-zinc-700',
    tagBg: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    label: portal || 'Direct Apply',
    short: (company || 'AP').slice(0, 2).toUpperCase(),
  };
};

export const SubmissionCheck: React.FC = () => {
  // Top-level View Switcher: 'notifications' | 'submission_check'
  const [activeSection, setActiveSection] = useState<'notifications' | 'submission_check'>('notifications');

  // Community Notification state
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);
  const [communitySearch, setCommunitySearch] = useState('');
  const [communityFilter, setCommunityFilter] = useState<'ALL' | 'whatsapp' | 'telegram' | 'detected' | 'user'>('ALL');
  const [copiedLinkUrl, setCopiedLinkUrl] = useState<string | null>(null);

  // New Link Submission Form Modal/Card
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlatform, setNewPlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('Job Alerts & Placements');
  const [newDescription, setNewDescription] = useState('');
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // QA Logs State
  const [logs, setLogs] = useState<QALogRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'IN_PROGRESS' | 'FAILED'>('ALL');
  const [portalFilter, setPortalFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Subscribe to QALogger and CommunityNotificationStore
  useEffect(() => {
    const unsubQA = QALogger.subscribe((updatedLogs) => {
      setLogs(updatedLogs);
    });

    const unsubComm = communityNotificationStore.subscribe((updatedNotifs) => {
      setNotifications(updatedNotifs);
    });

    return () => {
      unsubQA();
      unsubComm();
    };
  }, []);

  // --- QA Handlers ---
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

  // --- Community Notification Handlers ---
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkUrl(url);
    setTimeout(() => setCopiedLinkUrl(null), 2000);
  };

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteCommunityLink = (id: string) => {
    communityNotificationStore.deleteNotification(id);
  };

  const handleClearAllCommunity = () => {
    if (confirm('Are you sure you want to clear all notifications and community links?')) {
      communityNotificationStore.clearAll();
    }
  };

  const handleMarkAllRead = () => {
    communityNotificationStore.markAllAsRead();
  };

  const handleAddCommunityLink = (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    const cleanUrl = newUrl.trim();
    if (!cleanUrl) {
      setFormFeedback({ type: 'error', message: 'Please enter a valid join link URL.' });
      return;
    }

    if (newPlatform === 'whatsapp' && !cleanUrl.includes('whatsapp') && !cleanUrl.includes('wa.me')) {
      setFormFeedback({ type: 'error', message: 'URL should be a valid WhatsApp invite link (e.g. chat.whatsapp.com/...).' });
      return;
    }

    if (newPlatform === 'telegram' && !cleanUrl.includes('t.me') && !cleanUrl.includes('telegram')) {
      setFormFeedback({ type: 'error', message: 'URL should be a valid Telegram channel or group link (e.g. t.me/...).' });
      return;
    }

    try {
      communityNotificationStore.addNotification({
        platform: newPlatform,
        title: newTitle.trim() || (newPlatform === 'whatsapp' ? 'WhatsApp Community Group' : 'Telegram Channel'),
        url: cleanUrl,
        category: newCategory,
        description: newDescription.trim() || `Join this ${newPlatform === 'whatsapp' ? 'WhatsApp group' : 'Telegram channel'} for jobs and networking.`,
        source: 'user',
        membersCount: 'Active Community'
      });

      setFormFeedback({ type: 'success', message: 'Community link published successfully!' });
      setTimeout(() => {
        setNewTitle('');
        setNewUrl('');
        setNewDescription('');
        setShowAddModal(false);
        setFormFeedback(null);
      }, 1000);
    } catch (err: any) {
      setFormFeedback({ type: 'error', message: err?.message || 'Failed to add community link.' });
    }
  };

  // Filtered QA Logs
  const portals = Array.from(new Set(logs.map((l) => l.portal).filter(Boolean)));
  const filteredLogs = logs.filter((log) => {
    const query = searchQuery.toLowerCase().trim();
    const companyText = (log.companyName || log.company || '').toLowerCase();
    const matchesSearch = 
      !query ||
      log.jobTitle.toLowerCase().includes(query) ||
      companyText.includes(query) ||
      log.portal.toLowerCase().includes(query) ||
      log.qaPairs.some(
        (qa) => qa.question.toLowerCase().includes(query) || qa.answer.toLowerCase().includes(query)
      );

    const matchesStatus = statusFilter === 'ALL' || (log.status || 'SUBMITTED') === statusFilter;
    const matchesPortal = portalFilter === 'ALL' || log.portal === portalFilter;

    return matchesSearch && matchesStatus && matchesPortal;
  });

  // Filtered Community Notifications
  const filteredNotifications = notifications.filter((item) => {
    const query = communitySearch.toLowerCase().trim();
    const matchesQuery = 
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      (item.category || '').toLowerCase().includes(query) ||
      (item.companyName || '').toLowerCase().includes(query) ||
      item.url.toLowerCase().includes(query);

    const matchesFilter = 
      communityFilter === 'ALL' ||
      (communityFilter === 'whatsapp' && item.platform === 'whatsapp') ||
      (communityFilter === 'telegram' && item.platform === 'telegram') ||
      (communityFilter === 'detected' && item.source === 'detected') ||
      (communityFilter === 'user' && item.source === 'user');

    return matchesQuery && matchesFilter;
  });

  // Calculate QA stats
  const totalQuestions = logs.reduce((sum, l) => sum + (l.qaPairs?.length || 0), 0);
  const contextualSolved = logs.reduce(
    (sum, l) => sum + (l.qaPairs?.filter((qa) => isAiSource(qa.source)).length || 0),
    0
  );
  const personaInjected = logs.reduce(
    (sum, l) => sum + (l.qaPairs?.filter((qa) => !isAiSource(qa.source)).length || 0),
    0
  );

  // Calculate Community stats
  const unreadCount = notifications.filter((n) => n.unread).length;
  const whatsappCount = notifications.filter((n) => n.platform === 'whatsapp').length;
  const telegramCount = notifications.filter((n) => n.platform === 'telegram').length;
  const detectedCount = notifications.filter((n) => n.source === 'detected').length;

  return (
    <div className="flex-1 bg-[#FAFAFA] flex flex-col h-full overflow-y-auto p-3.5 sm:p-6 md:p-8 font-sans pb-16 sm:pb-8">
      <div className="max-w-4xl mx-auto w-full space-y-4 sm:space-y-6">
        
        {/* Top View Selector: Divided into 2 Types: Notification & Submission Check */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3.5">
          <div className="flex items-center gap-1.5 bg-zinc-200/60 p-1 rounded-2xl border border-zinc-300/50 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveSection('notifications')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSection === 'notifications'
                  ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80 font-black'
                  : 'text-zinc-600 hover:text-zinc-900 font-semibold'
              }`}
            >
              <Bell size={13} className={activeSection === 'notifications' ? 'text-emerald-600' : 'text-zinc-400'} />
              <span>Notifications</span>
              {unreadCount > 0 ? (
                <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {unreadCount}
                </span>
              ) : (
                <span className="bg-zinc-200/80 text-zinc-600 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {notifications.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('submission_check')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSection === 'submission_check'
                  ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/80 font-black'
                  : 'text-zinc-600 hover:text-zinc-900 font-semibold'
              }`}
            >
              <CheckCircle2 size={13} className={activeSection === 'submission_check' ? 'text-zinc-900' : 'text-zinc-400'} />
              <span>Submission Check</span>
              <span className="bg-zinc-200/80 text-zinc-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {logs.length}
              </span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-time Active Hub</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: NOTIFICATIONS (WhatsApp & Telegram Community Links Hub)        */}
        {/* ========================================================================= */}
        {activeSection === 'notifications' && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* Header Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-zinc-200/80 pb-4 sm:pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                    WhatsApp &amp; Telegram Hub
                  </h1>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Direct Community Links
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-medium mt-1">
                  Connect instantly to verified WhatsApp groups and Telegram channels for instant job drops, referrals, and application updates.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="px-2.5 sm:px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                    title="Mark all notifications as read"
                  >
                    <CheckCheck size={13} className="text-emerald-600" />
                    <span>Mark Read</span>
                  </button>
                )}

                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAllCommunity}
                    className="px-2.5 sm:px-3 py-1.5 bg-white border border-zinc-200 hover:border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                    title="Clear all community links"
                  >
                    <Trash2 size={13} />
                    <span>Clear All</span>
                  </button>
                )}

                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  title="Send or share a new WhatsApp or Telegram link"
                >
                  <Plus size={14} className="text-white" />
                  <span>Send Link</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span className="text-[11px] font-mono font-bold uppercase text-zinc-500">Total Links</span>
                  <Users size={14} className="text-zinc-500" />
                </div>
                <span className="text-2xl font-black text-zinc-900 tracking-tight">{notifications.length}</span>
                <span className="text-[10px] font-medium text-zinc-400 mt-0.5">Verified channels</span>
              </div>

              <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-emerald-600 mb-1">
                  <span className="text-[11px] font-mono font-bold uppercase text-emerald-700">WhatsApp</span>
                  <WhatsAppIcon size={14} className="text-emerald-600" />
                </div>
                <span className="text-2xl font-black text-emerald-700 tracking-tight">{whatsappCount}</span>
                <span className="text-[10px] font-medium text-emerald-600/70 mt-0.5">Groups &amp; communities</span>
              </div>

              <div className="bg-white border border-sky-100 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-sky-600 mb-1">
                  <span className="text-[11px] font-mono font-bold uppercase text-sky-700">Telegram</span>
                  <TelegramIcon size={14} className="text-sky-500" />
                </div>
                <span className="text-2xl font-black text-sky-700 tracking-tight">{telegramCount}</span>
                <span className="text-[10px] font-medium text-sky-600/70 mt-0.5">Instant drop channels</span>
              </div>

              <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-amber-600 mb-1">
                  <span className="text-[11px] font-mono font-bold uppercase text-amber-700">Job Detected</span>
                  <Radio size={14} className="text-amber-500" />
                </div>
                <span className="text-2xl font-black text-amber-700 tracking-tight">{detectedCount}</span>
                <span className="text-[10px] font-medium text-amber-600/70 mt-0.5">Intercepted in forms</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 w-full sm:w-80">
                <Search size={14} className="text-zinc-400 shrink-0" />
                <input
                  value={communitySearch}
                  onChange={(e) => setCommunitySearch(e.target.value)}
                  placeholder="Search groups, topics, channels..."
                  className="bg-transparent text-xs text-zinc-800 outline-none w-full font-medium placeholder:text-zinc-400"
                />
              </div>

              {/* Platform Filter Buttons */}
              <div className="flex items-center gap-1 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/70 overflow-x-auto w-full sm:w-auto text-xs">
                {(
                  [
                    { id: 'ALL', label: 'All Channels' },
                    { id: 'whatsapp', label: 'WhatsApp' },
                    { id: 'telegram', label: 'Telegram' },
                    { id: 'detected', label: 'Job Detected' },
                    { id: 'user', label: 'User Added' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCommunityFilter(tab.id)}
                    className={`px-3 py-1 rounded-lg transition-all text-xs font-semibold cursor-pointer shrink-0 ${
                      communityFilter === tab.id
                        ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/60'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Communities Cards Grid */}
            <div className="space-y-3">
              {filteredNotifications.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-2xl p-8 sm:p-12 text-center shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                    <Bell size={22} />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900">No community links yet</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    {communitySearch
                      ? `No results matching "${communitySearch}". Try changing your search query or filter.`
                      : 'Send a WhatsApp group or Telegram channel link to connect with others, or let the agent capture links automatically during job applications.'}
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 px-3.5 py-1.5 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition cursor-pointer"
                  >
                    + Send Community Link
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {filteredNotifications.map((item) => {
                    const isWhatsApp = item.platform === 'whatsapp';
                    const isDetected = item.source === 'detected';
                    const isCopied = copiedLinkUrl === item.url;

                    return (
                      <div
                        key={item.id}
                        className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs relative ${
                          isWhatsApp ? 'border-zinc-200 hover:border-emerald-300' : 'border-zinc-200 hover:border-sky-300'
                        }`}
                      >
                        {item.unread && (
                          <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                        )}

                        <div>
                          {/* Card Top Badges */}
                          <div className="flex items-center gap-2 flex-wrap mb-2.5">
                            {isWhatsApp ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <WhatsAppIcon size={12} className="text-emerald-600" />
                                <span>WhatsApp</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                                <TelegramIcon size={12} className="text-sky-500" />
                                <span>Telegram</span>
                              </span>
                            )}

                            {isDetected ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                Job Form Detected
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                                User Shared
                              </span>
                            )}

                            {item.category && (
                              <span className="text-[10px] font-medium text-zinc-500 bg-zinc-50 border border-zinc-200/60 px-2 py-0.5 rounded-full">
                                {item.category}
                              </span>
                            )}
                          </div>

                          {/* Title & Description */}
                          <h3 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight leading-snug">
                            {item.title}
                          </h3>

                          {item.companyName && (
                            <p className="text-[11px] font-semibold text-zinc-600 mt-0.5">
                              Found during apply at <span className="text-zinc-900 font-bold">{item.companyName}</span>
                            </p>
                          )}

                          <p className="text-xs text-zinc-500 font-normal mt-1.5 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>

                          {/* Member count & url preview */}
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium mt-3 pt-2.5 border-t border-zinc-100">
                            <span>{item.membersCount || 'Open Community'}</span>
                            <span className="font-mono text-[10px] text-zinc-400 truncate max-w-[180px]">
                              {item.url.replace(/^https?:\/\//i, '')}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: Join on WhatsApp / Telegram & Copy Link */}
                        <div className="flex items-center gap-2 mt-4 pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenLink(item.url)}
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                              isWhatsApp
                                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                                : 'bg-sky-500 hover:bg-sky-600 active:bg-sky-700'
                            }`}
                          >
                            {isWhatsApp ? (
                              <>
                                <WhatsAppIcon size={14} />
                                <span>Join WhatsApp Group</span>
                              </>
                            ) : (
                              <>
                                <TelegramIcon size={14} />
                                <span>Join Telegram Channel</span>
                              </>
                            )}
                            <ArrowUpRight size={13} className="shrink-0" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyLink(item.url)}
                            className="p-2 border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-semibold flex items-center justify-center transition shadow-2xs cursor-pointer shrink-0"
                            title="Copy community invite link"
                          >
                            {isCopied ? (
                              <Check size={14} className="text-emerald-600" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCommunityLink(item.id)}
                            className="p-2 border border-zinc-200 hover:border-red-200 bg-white hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-xl text-xs font-semibold flex items-center justify-center transition shadow-2xs cursor-pointer shrink-0"
                            title="Delete link"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal / Card to Send / Share Community Link */}
            {showAddModal && (
              <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl border border-zinc-200 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-zinc-100 rounded-xl text-zinc-800">
                        <Share2 size={16} />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-zinc-900 tracking-tight">
                          Send Community Join Link
                        </h2>
                        <p className="text-[11px] text-zinc-500 font-medium">
                          Share a WhatsApp group or Telegram channel for other job seekers to join.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        setFormFeedback(null);
                      }}
                      className="text-zinc-400 hover:text-zinc-700 p-1.5 rounded-lg hover:bg-zinc-100 transition cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleAddCommunityLink} className="space-y-3.5">
                    {/* Platform Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                        Platform
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setNewPlatform('whatsapp')}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                            newPlatform === 'whatsapp'
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-2xs'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          <WhatsAppIcon size={15} className="text-emerald-600" />
                          <span>WhatsApp Group</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setNewPlatform('telegram')}
                          className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                            newPlatform === 'telegram'
                              ? 'bg-sky-50 border-sky-400 text-sky-800 shadow-2xs'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          <TelegramIcon size={15} className="text-sky-500" />
                          <span>Telegram Channel</span>
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Group or Channel Title
                      </label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder={
                          newPlatform === 'whatsapp'
                            ? 'e.g., SDE Fresher Hiring & Referral Circle'
                            : 'e.g., Instant Tech Job Drops'
                        }
                        className="w-full text-xs bg-zinc-50 border border-zinc-200 focus:border-zinc-900 rounded-xl px-3 py-2 outline-none font-medium transition"
                      />
                    </div>

                    {/* Join Link URL */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Join Link URL
                      </label>
                      <input
                        type="url"
                        required
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder={
                          newPlatform === 'whatsapp'
                            ? 'https://chat.whatsapp.com/...'
                            : 'https://t.me/...'
                        }
                        className="w-full text-xs bg-zinc-50 border border-zinc-200 focus:border-zinc-900 rounded-xl px-3 py-2 outline-none font-medium transition"
                      />
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Must be a public or invite link accessible to users.
                      </p>
                    </div>

                    {/* Category Selector */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Category
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full text-xs bg-zinc-50 border border-zinc-200 focus:border-zinc-900 rounded-xl px-3 py-2 outline-none font-semibold text-zinc-800 transition cursor-pointer"
                      >
                        <option value="Job Alerts & Placements">Job Alerts &amp; Placements</option>
                        <option value="Daily Job Drops">Daily Job Drops</option>
                        <option value="Off-Campus Hiring">Off-Campus &amp; Fresher Hiring</option>
                        <option value="Tech Community">Tech Community &amp; Developers</option>
                        <option value="Company Specific">Company Specific Referral Group</option>
                        <option value="Interview Prep">Interview Prep &amp; ATS Resume Tips</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Description / Notes (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                        placeholder="Brief summary of what members get by joining..."
                        className="w-full text-xs bg-zinc-50 border border-zinc-200 focus:border-zinc-900 rounded-xl px-3 py-2 outline-none font-medium transition resize-none"
                      />
                    </div>

                    {/* Feedback Message */}
                    {formFeedback && (
                      <div
                        className={`text-xs p-2.5 rounded-xl border font-semibold flex items-center gap-1.5 ${
                          formFeedback.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-red-50 border-red-200 text-red-800'
                        }`}
                      >
                        {formFeedback.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                        <span>{formFeedback.message}</span>
                      </div>
                    )}

                    {/* Form Submit Footer */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false);
                          setFormFeedback(null);
                        }}
                        className="px-3 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send size={13} />
                        <span>Send &amp; Publish Link</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: SUBMISSION CHECK (Full QA Audit & ATS Check History)           */}
        {/* ========================================================================= */}
        {activeSection === 'submission_check' && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* Header Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-zinc-200/80 pb-4 sm:pb-5">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                  QA &amp; Submission Audit
                </h1>
                <p className="text-xs text-zinc-500 font-medium mt-0.5">
                  Real-time verified record of screening questions, candidate values, and ATS submission checks.
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExportCsv}
                  disabled={logs.length === 0}
                  className="px-2.5 sm:px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-40 cursor-pointer"
                  title="Export as CSV spreadsheet"
                >
                  <FileSpreadsheet size={13} className="text-zinc-600" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={handleExportJson}
                  disabled={logs.length === 0}
                  className="px-2.5 sm:px-3 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-40 cursor-pointer"
                  title="Export as JSON dataset"
                >
                  <FileCode size={13} className="text-zinc-600" />
                  <span>JSON Backup</span>
                </button>

                <button
                  onClick={handleClearHistory}
                  disabled={logs.length === 0}
                  className="px-2.5 sm:px-3 py-1.5 bg-white border border-zinc-200 hover:border-red-300 text-red-600 hover:bg-red-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-40 cursor-pointer"
                  title="Clear QA history"
                >
                  <Trash2 size={13} />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Clean Stat Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span className="text-[11px] font-mono font-bold uppercase text-zinc-500">Applications</span>
                  <Send size={13} className="text-zinc-500" />
                </div>
                <span className="text-2xl font-black text-zinc-900 tracking-tight">{logs.length}</span>
                <span className="text-[10px] font-medium text-zinc-400 mt-0.5">Tracked submissions</span>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span className="text-[11px] font-mono font-bold uppercase text-zinc-500">Fields Handled</span>
                  <ListChecks size={14} className="text-zinc-500" />
                </div>
                <span className="text-2xl font-black text-zinc-900 tracking-tight">{totalQuestions}</span>
                <span className="text-[10px] font-medium text-zinc-400 mt-0.5">Form inputs verified</span>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span className="text-[11px] font-mono font-bold uppercase text-zinc-500">Local AI Screening</span>
                  <Bot size={14} className="text-purple-600" />
                </div>
                <span className="text-2xl font-black text-purple-700 tracking-tight">{contextualSolved}</span>
                <span className="text-[10px] font-medium text-zinc-400 mt-0.5">Resolved via Qwen 2.5</span>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-1">
                  <span className="text-[11px] font-mono font-bold uppercase text-zinc-500">Candidate Profile</span>
                  <User size={13} className="text-zinc-500" />
                </div>
                <span className="text-2xl font-black text-zinc-900 tracking-tight">{personaInjected}</span>
                <span className="text-[10px] font-medium text-zinc-400 mt-0.5">Verified credentials</span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 w-full sm:w-80">
                <Search size={14} className="text-zinc-400 shrink-0" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by question, company, or portal..."
                  className="bg-transparent text-xs text-zinc-800 outline-none w-full font-medium placeholder:text-zinc-400"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs">
                {/* Status Segmented Control */}
                <div className="flex items-center gap-1 bg-zinc-100/90 p-1 rounded-xl border border-zinc-200/70">
                  {(['ALL', 'SUBMITTED', 'IN_PROGRESS', 'FAILED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1 rounded-lg transition-all text-xs font-semibold cursor-pointer ${
                        statusFilter === st
                          ? 'bg-white text-zinc-900 shadow-2xs font-bold border border-zinc-200/60'
                          : 'text-zinc-500 hover:text-zinc-800'
                      }`}
                    >
                      {st === 'ALL' ? 'All' : st === 'SUBMITTED' ? 'Submitted' : st === 'IN_PROGRESS' ? 'In Progress' : 'Halted'}
                    </button>
                  ))}
                </div>

                {/* Portal Dropdown */}
                {portals.length > 0 && (
                  <select
                    value={portalFilter}
                    onChange={(e) => setPortalFilter(e.target.value)}
                    className="bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:bg-zinc-50 transition"
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

            {/* QA Log Records List */}
            <div className="space-y-3">
              {filteredLogs.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-2xl p-8 sm:p-12 text-center shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                    <Inbox size={22} />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900">No submission checks recorded</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    {searchQuery
                      ? `No records found matching "${searchQuery}". Try a different filter.`
                      : 'Run the Agent Browser or automated apply to see real-time QA question resolutions and ATS audit logs here.'}
                  </p>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const companyName = log.companyName || log.company || 'Unknown Company';
                  const portalInfo = getPortalInfo(log.portal, companyName);
                  const isSubmitted = (log.status || 'SUBMITTED') === 'SUBMITTED';
                  const isFailed = log.status === 'FAILED';

                  const aiCount = log.qaPairs.filter((qa) => isAiSource(qa.source)).length;
                  const personaCount = log.qaPairs.length - aiCount;

                  return (
                    <div
                      key={log.id}
                      className="bg-white border border-zinc-200 rounded-2xl shadow-2xs overflow-hidden transition-all hover:border-zinc-300"
                    >
                      {/* Log Card Header */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none gap-3"
                      >
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          {/* Portal Brand Box */}
                          <div
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 shadow-2xs ${portalInfo.bg}`}
                          >
                            {portalInfo.short}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm sm:text-base font-bold text-zinc-900 truncate">
                                {companyName}
                              </h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${portalInfo.tagBg}`}>
                                {portalInfo.label}
                              </span>

                              {isSubmitted ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 size={10} />
                                  <span>Submitted</span>
                                </span>
                              ) : isFailed ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                  <AlertCircle size={10} />
                                  <span>Halted</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock size={10} />
                                  <span>In Progress</span>
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">
                              {log.jobTitle || 'Application Form'}
                            </p>
                          </div>
                        </div>

                        {/* Right Summary Badges & Expand Arrow */}
                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                          <div className="hidden sm:flex items-center gap-2 text-xs">
                            <span className="bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold px-2.5 py-1 rounded-lg">
                              {log.qaPairs.length} fields
                            </span>

                            {aiCount > 0 && (
                              <span className="bg-purple-50 border border-purple-200 text-purple-700 font-semibold px-2 py-1 rounded-lg flex items-center gap-1">
                                <Bot size={11} />
                                <span>{aiCount} AI</span>
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-zinc-400 font-mono hidden md:block">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => copyLogAnswers(e, log)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition"
                              title="Copy all QA responses"
                            >
                              {copiedId === log.id ? (
                                <Check size={14} className="text-emerald-600" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>

                            <button
                              onClick={(e) => handleDeleteEntry(e, log.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                              title="Delete record"
                            >
                              <Trash2 size={14} />
                            </button>

                            <div className="p-1 text-zinc-400">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Log Card Expanded Accordion: Full QA Pairs */}
                      {isExpanded && (
                        <div className="border-t border-zinc-100 bg-zinc-50/50 p-4 sm:p-5 space-y-3">
                          {/* Submission Metadata bar */}
                          <div className="bg-white border border-zinc-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-zinc-500 font-medium">Logged:</span>
                              <span className="font-mono text-zinc-800 font-semibold">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                              {log.atsScore !== undefined && (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  ATS Match: {log.atsScore}%
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500 font-medium">Resolved via:</span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-lg">
                                <Bot size={11} />
                                {aiCount} Local AI
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-700 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-lg">
                                <User size={11} />
                                {personaCount} Persona
                              </span>
                            </div>
                          </div>

                          {/* QA Pairs Accordion Table */}
                          {log.qaPairs.length === 0 ? (
                            <div className="text-center py-6 text-xs text-zinc-400 font-medium">
                              No discrete screening questions recorded for this step.
                            </div>
                          ) : (
                            log.qaPairs.map((qa, index) => {
                              const isAi = isAiSource(qa.source);
                              const isYesNo = qa.answer.toLowerCase() === 'yes' || qa.answer.toLowerCase() === 'no';
                              const isNumeric = /^\d+(\.\d+)?$/.test(qa.answer.trim());

                              return (
                                <div
                                  key={index}
                                  className="bg-white border border-zinc-200 rounded-xl p-3.5 shadow-2xs hover:border-zinc-300 transition-all flex flex-col sm:flex-row sm:items-start gap-2.5 sm:gap-4"
                                >
                                  {/* Question Index Badge */}
                                  <div className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                    {index + 1}
                                  </div>

                                  {/* Question & Answer Content */}
                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-xs sm:text-sm font-bold text-zinc-900 leading-snug">
                                        {qa.question}
                                      </p>
                                      
                                      {/* Source Tag Badge */}
                                      <div className="shrink-0 flex items-center gap-1.5">
                                        {isAi ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                            <Bot size={10} />
                                            <span>Local AI (Qwen)</span>
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                                            <User size={10} />
                                            <span>Candidate Persona</span>
                                          </span>
                                        )}

                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(qa.answer);
                                          }}
                                          className="text-zinc-400 hover:text-zinc-700 p-1 rounded-md hover:bg-zinc-100 transition"
                                          title="Copy answer"
                                        >
                                          <Copy size={11} />
                                        </button>
                                      </div>
                                    </div>

                                    {/* Answer Pill */}
                                    <div
                                      className={`text-xs sm:text-sm font-medium rounded-lg p-2.5 border transition-all ${
                                        isYesNo
                                          ? qa.answer.toLowerCase() === 'yes'
                                            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 font-bold'
                                            : 'bg-zinc-100 border-zinc-200 text-zinc-800 font-bold'
                                          : isNumeric
                                          ? 'bg-zinc-50 border-zinc-200 text-zinc-900 font-mono font-bold'
                                          : 'bg-zinc-50 border-zinc-200 text-zinc-800 leading-relaxed font-sans'
                                      }`}
                                    >
                                      {qa.answer}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
