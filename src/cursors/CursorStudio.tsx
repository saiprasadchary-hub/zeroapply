import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  MousePointer2,
  Bot,
  Sparkles,
  Check,
  ChevronDown,
  Zap,
  Moon,
  Sun,
  ShieldCheck,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  CURSOR_THEMES,
  CURSOR_POINTER_OPTIONS,
  CURSOR_AVATAR_OPTIONS,
  loadStoredPointerId,
  saveStoredPointerId,
  loadStoredAvatarId,
  saveStoredAvatarId,
  loadStoredDisplayMode,
  saveStoredDisplayMode,
  getPointerOption,
  getAvatarOption,
  saveCustomCombination,
  getCustomCombinedCursorMarkup,
  type CursorDisplayMode,
  type CursorPointerId,
  type CursorAvatarId,
} from './index';

interface CursorStudioProps {
  selectedCursorId?: string;
  onCursorChange?: (cursorId: string) => void;
  onDisplayModeChange?: (mode: CursorDisplayMode) => void;
  onCombinationChange?: (pointerId: CursorPointerId, avatarId: CursorAvatarId) => void;
}

export const CursorStudio: React.FC<CursorStudioProps> = ({
  selectedCursorId,
  onCursorChange,
  onDisplayModeChange,
  onCombinationChange,
}) => {
  // Active Display Mode: 'combined' by default
  const [displayMode, setDisplayMode] = useState<CursorDisplayMode>(() => loadStoredDisplayMode());

  // 1. User's chosen Cursor Pointer ID
  const [selectedPointerId, setSelectedPointerId] = useState<CursorPointerId>(() => loadStoredPointerId());

  // 2. User's chosen Companion Avatar ID
  const [selectedAvatarId, setSelectedAvatarId] = useState<CursorAvatarId>(() => loadStoredAvatarId());

  // Dropdown open states
  const [isCursorDropdownOpen, setIsCursorDropdownOpen] = useState(false);
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);

  // Surface mode for preview canvas: 'dark' | 'light'
  const [previewSurface, setPreviewSurface] = useState<'dark' | 'light'>('dark');

  // Interactive animation mode for testing live reactions: 'default' | 'typing' | 'thinking' | 'success'
  const [previewAnimState, setPreviewAnimState] = useState<'default' | 'typing' | 'thinking' | 'success'>('default');

  const [recentlyUpdated, setRecentlyUpdated] = useState(false);

  const cursorDropdownRef = useRef<HTMLDivElement>(null);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);

  // Sync with stored custom combination on mount or when selectedCursorId updates
  useEffect(() => {
    setSelectedPointerId(loadStoredPointerId());
    setSelectedAvatarId(loadStoredAvatarId());
    setDisplayMode(loadStoredDisplayMode());
  }, [selectedCursorId]);

  // Synchronize with external cursor combination change events
  useEffect(() => {
    const handleCombination = (e: Event) => {
      const custom = e as CustomEvent<{
        pointerId?: CursorPointerId;
        avatarId?: CursorAvatarId;
        mode?: CursorDisplayMode;
      }>;
      if (custom.detail?.pointerId) setSelectedPointerId(custom.detail.pointerId);
      if (custom.detail?.avatarId) setSelectedAvatarId(custom.detail.avatarId);
      if (custom.detail?.mode) setDisplayMode(custom.detail.mode);
    };
    const handlePointer = (e: Event) => {
      const custom = e as CustomEvent<{ id?: CursorPointerId }>;
      if (custom.detail?.id) setSelectedPointerId(custom.detail.id);
    };
    const handleAvatar = (e: Event) => {
      const custom = e as CustomEvent<{ id?: CursorAvatarId }>;
      if (custom.detail?.id) setSelectedAvatarId(custom.detail.id);
    };
    const handleMode = (e: Event) => {
      const custom = e as CustomEvent<{ mode?: CursorDisplayMode }>;
      if (custom.detail?.mode) setDisplayMode(custom.detail.mode);
    };

    window.addEventListener('zeroapply_cursor_combination_changed', handleCombination);
    window.addEventListener('zeroapply_cursor_pointer_changed', handlePointer);
    window.addEventListener('zeroapply_cursor_avatar_changed', handleAvatar);
    window.addEventListener('zeroapply_cursor_display_mode_changed', handleMode);

    return () => {
      window.removeEventListener('zeroapply_cursor_combination_changed', handleCombination);
      window.removeEventListener('zeroapply_cursor_pointer_changed', handlePointer);
      window.removeEventListener('zeroapply_cursor_avatar_changed', handleAvatar);
      window.removeEventListener('zeroapply_cursor_display_mode_changed', handleMode);
    };
  }, []);

  // Click outside listener to close dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cursorDropdownRef.current && !cursorDropdownRef.current.contains(e.target as Node)) {
        setIsCursorDropdownOpen(false);
      }
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(e.target as Node)) {
        setIsAvatarDropdownOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsCursorDropdownOpen(false);
        setIsAvatarDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const currentPointerOpt = useMemo(() => getPointerOption(selectedPointerId), [selectedPointerId]);
  const currentAvatarOpt = useMemo(() => getAvatarOption(selectedAvatarId), [selectedAvatarId]);

  // Handle picking wanted cursor pointer
  const handleSelectPointer = useCallback(
    (pointerId: CursorPointerId) => {
      setSelectedPointerId(pointerId);
      setIsCursorDropdownOpen(false);
      saveCustomCombination(pointerId, selectedAvatarId, displayMode);
      setRecentlyUpdated(true);
      setTimeout(() => setRecentlyUpdated(false), 2500);

      const baseThemeId = pointerId === 'pointer_sky_aero' && selectedAvatarId === 'avatar_cloud_bot' ? 'cloud_bot' : 'obsidian_glass';
      if (onCursorChange) onCursorChange(baseThemeId);
      if (onCombinationChange) onCombinationChange(pointerId, selectedAvatarId);
    },
    [selectedAvatarId, displayMode, onCursorChange, onCombinationChange]
  );

  // Handle picking wanted companion avatar
  const handleSelectAvatar = useCallback(
    (avatarId: CursorAvatarId) => {
      setSelectedAvatarId(avatarId);
      setIsAvatarDropdownOpen(false);
      saveCustomCombination(selectedPointerId, avatarId, displayMode);
      setRecentlyUpdated(true);
      setTimeout(() => setRecentlyUpdated(false), 2500);

      const baseThemeId = selectedPointerId === 'pointer_sky_aero' && avatarId === 'avatar_cloud_bot' ? 'cloud_bot' : 'obsidian_glass';
      if (onCursorChange) onCursorChange(baseThemeId);
      if (onCombinationChange) onCombinationChange(selectedPointerId, avatarId);
    },
    [selectedPointerId, displayMode, onCursorChange, onCombinationChange]
  );

  // Handle switching display mode (combined, cursor, avatar)
  const handleDisplayModeChange = useCallback(
    (mode: CursorDisplayMode) => {
      setDisplayMode(mode);
      saveStoredDisplayMode(mode);
      setRecentlyUpdated(true);
      setTimeout(() => setRecentlyUpdated(false), 2500);

      if (onDisplayModeChange) {
        onDisplayModeChange(mode);
      }
    },
    [onDisplayModeChange]
  );

  // Mini SVGs for trigger buttons
  const triggerCursorSvg = useMemo(() => {
    return getCustomCombinedCursorMarkup(selectedPointerId, selectedAvatarId, 'trig-ptr', 'cursor');
  }, [selectedPointerId, selectedAvatarId]);

  const triggerAvatarSvg = useMemo(() => {
    return getCustomCombinedCursorMarkup(selectedPointerId, selectedAvatarId, 'trig-avt', 'avatar');
  }, [selectedPointerId, selectedAvatarId]);

  // Live SVG for the interactive stage sandbox
  const stageSvg = useMemo(() => {
    let svg = getCustomCombinedCursorMarkup(selectedPointerId, selectedAvatarId, 'stage-live', displayMode);
    if (previewAnimState === 'typing') {
      svg = svg.replace(/class="za-bot-eyes"/g, 'class="za-bot-eyes za-anim-typing"');
    } else if (previewAnimState === 'thinking') {
      svg = svg.replace(/class="za-bot-eyes"/g, 'class="za-bot-eyes za-anim-thinking"');
    } else if (previewAnimState === 'success') {
      svg = svg.replace(/class="za-bot-eyes"/g, 'class="za-bot-eyes za-anim-happy"');
    }
    return svg;
  }, [selectedPointerId, selectedAvatarId, displayMode, previewAnimState]);

  return (
    <div className="rounded-2xl border border-[#dadce0] bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(60,64,67,0.08)] space-y-6 transition-all">
      {/* 1. GOOGLE/GITHUB STYLE CLEAN HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f1f3f4] pb-5">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0 shadow-xs border border-[#d2e3fc]">
            <Sparkles size={19} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#202124]">
                Visual Agent Cursor Studio
              </h2>
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-[#e8f0fe] text-[#1967d2] border border-[#d2e3fc]">
                Google & GitHub Style
              </span>
            </div>
            <p className="text-xs text-[#5f6368] mt-0.5 leading-relaxed">
              Select your wanted cursor pointer and companion avatar below to customize your live agent cursor.
            </p>
          </div>
        </div>

        {/* Current Active Status Chip with Live Pulse */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6] text-xs font-medium shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#1e8e3e] shrink-0 animate-pulse" />
            <span className="truncate max-w-[280px]">
              Active on Agent: {currentPointerOpt.name} + {currentAvatarOpt.name}
            </span>
          </div>
          {recentlyUpdated && (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 size={12} /> Synced
            </span>
          )}
        </div>
      </div>

      {/* 2. THE TWO GOOGLE & GITHUB STYLE DROPDOWNS: SELECT CURSER & AVATAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* DROPDOWN 1: SELECT CURSER */}
        <div className="space-y-1.5 relative" ref={cursorDropdownRef}>
          <label className="text-xs font-semibold text-[#202124] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MousePointer2 size={14} className="text-[#1a73e8]" />
              <span>Select Cursor Pointer</span>
            </span>
            <span className="text-[11px] font-normal text-[#5f6368]">
              {CURSOR_POINTER_OPTIONS.length} options
            </span>
          </label>

          {/* Trigger Button */}
          <button
            type="button"
            onClick={() => {
              setIsCursorDropdownOpen((prev) => !prev);
              setIsAvatarDropdownOpen(false);
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl border bg-white transition-all cursor-pointer text-left ${
              isCursorDropdownOpen
                ? 'border-[#1a73e8] ring-2 ring-[#1a73e8]/20 shadow-xs'
                : 'border-[#dadce0] hover:border-[#bdc1c6] hover:bg-[#f8fafd] shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Mini Hardware Preview Tile */}
              <div className="w-10 h-10 rounded-lg bg-[#121417] border border-[#2a2e36] flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                <div className="transform scale-75" dangerouslySetInnerHTML={{ __html: triggerCursorSvg }} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#202124] block truncate">
                  {currentPointerOpt.name}
                </span>
                <span className="text-[11px] text-[#5f6368] block truncate">
                  {currentPointerOpt.badge} • {currentPointerOpt.tag}
                </span>
              </div>
            </div>

            <ChevronDown
              size={17}
              className={`text-[#5f6368] transition-transform duration-200 shrink-0 ml-2 ${
                isCursorDropdownOpen ? 'transform rotate-180 text-[#1a73e8]' : ''
              }`}
            />
          </button>

          {/* Floating Dropdown Menu */}
          {isCursorDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl bg-white border border-[#dadce0] shadow-[0_8px_24px_rgba(60,64,67,0.18)] py-1.5 overflow-hidden max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold text-[#80868b] uppercase tracking-wider border-b border-[#f1f3f4] mb-1">
                Choose Pointer Arrow
              </div>
              {CURSOR_POINTER_OPTIONS.map((item) => {
                const isSelected = item.id === selectedPointerId;
                const itemSvg = getCustomCombinedCursorMarkup(item.id, selectedAvatarId, `drop-ptr-${item.id}`, 'cursor');

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPointer(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-[#e8f0fe] text-[#1967d2]'
                        : 'hover:bg-[#f8f9fa] text-[#202124]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#121417] border border-[#2a2e36] flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        <div className="transform scale-70" dangerouslySetInnerHTML={{ __html: itemSvg }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate">
                            {item.name}
                          </span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-white/80 border border-[#dadce0] text-[#5f6368] font-medium">
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5f6368] truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shrink-0 ml-2 shadow-2xs">
                        <Check size={12} className="stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* DROPDOWN 2: SELECT AVATAR */}
        <div className="space-y-1.5 relative" ref={avatarDropdownRef}>
          <label className="text-xs font-semibold text-[#202124] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Bot size={14} className="text-[#c5221f]" />
              <span>Select Companion Avatar</span>
            </span>
            <span className="text-[11px] font-normal text-[#5f6368]">
              {CURSOR_AVATAR_OPTIONS.length} options
            </span>
          </label>

          {/* Trigger Button */}
          <button
            type="button"
            onClick={() => {
              setIsAvatarDropdownOpen((prev) => !prev);
              setIsCursorDropdownOpen(false);
            }}
            className={`w-full flex items-center justify-between p-3 rounded-xl border bg-white transition-all cursor-pointer text-left ${
              isAvatarDropdownOpen
                ? 'border-[#1a73e8] ring-2 ring-[#1a73e8]/20 shadow-xs'
                : 'border-[#dadce0] hover:border-[#bdc1c6] hover:bg-[#f8fafd] shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {/* Mini Hardware Preview Tile */}
              <div className="w-10 h-10 rounded-lg bg-[#121417] border border-[#2a2e36] flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                <div className="transform scale-75" dangerouslySetInnerHTML={{ __html: triggerAvatarSvg }} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#202124] block truncate">
                  {currentAvatarOpt.name}
                </span>
                <span className="text-[11px] text-[#5f6368] block truncate">
                  {currentAvatarOpt.badge} • {currentAvatarOpt.tag}
                </span>
              </div>
            </div>

            <ChevronDown
              size={17}
              className={`text-[#5f6368] transition-transform duration-200 shrink-0 ml-2 ${
                isAvatarDropdownOpen ? 'transform rotate-180 text-[#1a73e8]' : ''
              }`}
            />
          </button>

          {/* Floating Dropdown Menu */}
          {isAvatarDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl bg-white border border-[#dadce0] shadow-[0_8px_24px_rgba(60,64,67,0.18)] py-1.5 overflow-hidden max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold text-[#80868b] uppercase tracking-wider border-b border-[#f1f3f4] mb-1">
                Choose Companion Bot
              </div>
              {CURSOR_AVATAR_OPTIONS.map((item) => {
                const isSelected = item.id === selectedAvatarId;
                const itemSvg = getCustomCombinedCursorMarkup(selectedPointerId, item.id, `drop-avt-${item.id}`, 'avatar');

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectAvatar(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors cursor-pointer text-left ${
                      isSelected
                        ? 'bg-[#e8f0fe] text-[#1967d2]'
                        : 'hover:bg-[#f8f9fa] text-[#202124]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[#121417] border border-[#2a2e36] flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                        <div className="transform scale-70" dangerouslySetInnerHTML={{ __html: itemSvg }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate">
                            {item.name}
                          </span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded-full bg-white/80 border border-[#dadce0] text-[#5f6368] font-medium">
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5f6368] truncate mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#1a73e8] text-white flex items-center justify-center shrink-0 ml-2 shadow-2xs">
                        <Check size={12} className="stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. LIVE INTERACTIVE COMBINATION STAGE & MOVEMENT SANDBOX (100% PRESERVED) */}
      <div className="rounded-2xl border border-[#dadce0] bg-[#fafafa] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8eaed] pb-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-[#1a73e8]" />
            <div>
              <span className="text-xs font-semibold text-[#202124] block">
                Live Interactive Combination Stage & Movement Sandbox
              </span>
              <span className="text-[11px] text-[#5f6368]">
                Real-time preview of combined: <strong>{currentPointerOpt.name}</strong> + <strong>{currentAvatarOpt.name}</strong> ({displayMode})
              </span>
            </div>
          </div>

          {/* Surface & Animation Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Element Display Toggle (Combined vs Cursor vs Avatar) */}
            <div className="flex items-center p-0.5 rounded-full bg-white border border-[#dadce0] shadow-2xs">
              <button
                type="button"
                onClick={() => handleDisplayModeChange('combined')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  displayMode === 'combined'
                    ? 'bg-[#1a73e8] text-white shadow-2xs font-semibold'
                    : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]'
                }`}
                title="Show Combined (Cursor + Avatar)"
              >
                <Layers size={12} />
                <span>Combined</span>
              </button>
              <button
                type="button"
                onClick={() => handleDisplayModeChange('cursor')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  displayMode === 'cursor'
                    ? 'bg-[#1a73e8] text-white shadow-2xs font-semibold'
                    : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]'
                }`}
                title="Show Cursor Pointer Only"
              >
                <MousePointer2 size={12} />
                <span>Cursor</span>
              </button>
              <button
                type="button"
                onClick={() => handleDisplayModeChange('avatar')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  displayMode === 'avatar'
                    ? 'bg-[#1a73e8] text-white shadow-2xs font-semibold'
                    : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]'
                }`}
                title="Show Companion Avatar Only"
              >
                <Bot size={12} />
                <span>Avatar</span>
              </button>
            </div>

            {/* Surface Toggle (Dark OLED vs Light Paper) */}
            <div className="flex items-center p-0.5 rounded-full bg-white border border-[#dadce0] shadow-2xs">
              <button
                type="button"
                onClick={() => setPreviewSurface('dark')}
                className={`p-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  previewSurface === 'dark' ? 'bg-[#202124] text-white shadow-2xs' : 'text-[#5f6368] hover:text-[#202124]'
                }`}
                title="Dark OLED Background"
              >
                <Moon size={13} />
              </button>
              <button
                type="button"
                onClick={() => setPreviewSurface('light')}
                className={`p-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  previewSurface === 'light' ? 'bg-[#e8f0fe] text-[#1a73e8] shadow-2xs' : 'text-[#5f6368] hover:text-[#202124]'
                }`}
                title="Light Paper Background"
              >
                <Sun size={13} />
              </button>
            </div>

            {/* Test Mood / Reaction Buttons */}
            <div className="flex items-center gap-1">
              {(['default', 'typing', 'thinking', 'success'] as const).map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setPreviewAnimState(mood)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium capitalize transition-all cursor-pointer ${
                    previewAnimState === mood
                      ? 'bg-[#1a73e8] text-white shadow-2xs'
                      : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]'
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* The Viewport Stage */}
        <div
          className={`h-40 w-full rounded-xl flex items-center justify-center relative overflow-hidden transition-all duration-300 border ${
            previewSurface === 'dark'
              ? 'bg-[#090b10] border-[#1e2330]'
              : 'bg-[#f8f9fa] border-[#dadce0]'
          }`}
        >
          {/* Background Grid Pattern */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: previewSurface === 'dark'
                ? 'radial-gradient(#ffffff 1px, transparent 1px)'
                : 'radial-gradient(#000000 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Ambient Accent Radial Glow */}
          <div
            className="absolute w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none"
            style={{ backgroundColor: currentPointerOpt.accentColor }}
          />

          {/* The Interactive Scaled Vector Graphic */}
          <div
            className="relative transform scale-125 transition-transform duration-200 drop-shadow-md"
            dangerouslySetInnerHTML={{ __html: stageSvg }}
          />

          {/* Stage HUD Overlay */}
          <div className="absolute bottom-2.5 left-3 text-[10px] font-mono text-[#80868b] flex items-center gap-2">
            <span>Apex: &#123;16, 8&#125;</span>
            <span>•</span>
            <span>Mode: {displayMode}</span>
            <span>•</span>
            <span className="capitalize">Mood: {previewAnimState}</span>
          </div>

          <div className="absolute top-2.5 right-3">
            <span className="flex items-center gap-1 text-[10px] font-medium text-[#137333] bg-[#e6f4ea] px-2 py-0.5 rounded-full border border-[#ceead6]">
              <ShieldCheck size={11} />
              <span>18s Living Animation • 360° Gaze</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
