import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  RemoveFormatting,
  Star,
  Maximize2,
  Minimize2,
  Link as LinkIcon,
  Unlink,
  Type,
  GitFork,
  Plus,
  Trash2,
  Check,
  X,
} from 'lucide-react';

export type FloatingFormatType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'clean'
  | 'star'
  | 'expand'
  | 'condense'
  | 'link'
  | 'unlink'
  | 'noSelection'
  | 'toggleCase'
  | 'splitBullet';

interface FloatingFormatToolbarProps {
  position: { top: number; left: number };
  visible: boolean;
  onApplyFormat: (formatType: FloatingFormatType, payload?: string) => void;
  onAddBullet?: () => void;
  onDeleteCurrent?: () => void;
}

export const FloatingFormatToolbar: React.FC<FloatingFormatToolbarProps> = ({
  position,
  visible,
  onApplyFormat,
  onAddBullet,
  onDeleteCurrent,
}) => {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [hasSelectedLink, setHasSelectedLink] = useState(false);
  const savedRangeRef = useRef<Range | null>(null);

  // Dynamically check if the user has highlighted/selected text that contains or is inside a link
  useEffect(() => {
    const updateLinkStatus = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setHasSelectedLink(false);
        return;
      }
      const selectedText = sel.toString().trim();
      // Unlink should ONLY show when text is actively selected
      if (!selectedText) {
        setHasSelectedLink(false);
        return;
      }

      let isInsideAnchor = false;
      let node: Node | null = sel.anchorNode;
      while (node && node !== document.body) {
        if (node.nodeName === 'A') {
          isInsideAnchor = true;
          break;
        }
        node = node.parentNode;
      }

      if (!isInsideAnchor) {
        try {
          const range = sel.getRangeAt(0);
          const div = document.createElement('div');
          div.appendChild(range.cloneContents());
          if (div.querySelector('a')) {
            isInsideAnchor = true;
          }
        } catch {
          // ignore
        }
      }

      setHasSelectedLink(isInsideAnchor);
    };

    document.addEventListener('selectionchange', updateLinkStatus);
    document.addEventListener('mouseup', updateLinkStatus);
    document.addEventListener('keyup', updateLinkStatus);

    updateLinkStatus();

    return () => {
      document.removeEventListener('selectionchange', updateLinkStatus);
      document.removeEventListener('mouseup', updateLinkStatus);
      document.removeEventListener('keyup', updateLinkStatus);
    };
  }, []);

  if (!visible) return null;

  const handleCommand = (cmd: 'bold' | 'italic' | 'underline' | 'removeFormat') => {
    document.execCommand(cmd, false);
    const formatType = cmd === 'removeFormat' ? 'clean' : cmd;
    onApplyFormat(formatType as FloatingFormatType);
  };

  const handleLinkButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if user has selected text
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';

    if (!selectedText) {
      onApplyFormat('noSelection');
      return;
    }

    if (hasSelectedLink) {
      onApplyFormat('unlink');
      setHasSelectedLink(false);
      return;
    }

    // Save the selection range so focus shift doesn't lose highlighted text
    if (selection && selection.rangeCount > 0) {
      savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
    setShowLinkInput(true);
  };

  const handleApplyLink = () => {
    const trimmed = linkUrl.trim();
    if (!trimmed) {
      setShowLinkInput(false);
      return;
    }
    const finalUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') 
      ? trimmed 
      : `https://${trimmed}`;

    // Restore saved highlighted selection
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }

    onApplyFormat('link', finalUrl);
    setShowLinkInput(false);
    setLinkUrl('');
    savedRangeRef.current = null;
  };

  return (
    <div
      id="floating-format-toolbar"
      onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && !target.closest('input')) {
          e.preventDefault();
        }
        e.stopPropagation();
      }}
      style={{
        top: `${Math.max(10, position.top - 50)}px`,
        left: `${Math.max(10, position.left)}px`,
      }}
      className="fixed z-50 bg-zinc-900/95 backdrop-blur-md text-white border border-zinc-700 shadow-2xl rounded-2xl p-1.5 flex items-center gap-1 animate-fadeIn text-xs select-none max-w-[95vw] flex-wrap sm:flex-nowrap"
    >
      {showLinkInput ? (
        /* Inline Link Input Mode */
        <div 
          className="flex items-center gap-1.5 px-1 py-0.5 animate-fadeIn"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <LinkIcon size={13} className="text-cyan-400 shrink-0 ml-1" />
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            placeholder="Paste URL (e.g. github.com/username/repo)"
            className="bg-zinc-800 border border-zinc-600 focus:border-cyan-400 text-white rounded-lg px-2.5 py-1 text-xs w-64 outline-none placeholder:text-zinc-500 cursor-text select-text"
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyLink();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setShowLinkInput(false);
              }
            }}
            autoFocus
          />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleApplyLink();
            }}
            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
            title="Apply Link"
          >
            <Check size={12} />
            <span>Apply</span>
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowLinkInput(false);
            }}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors shrink-0"
            title="Cancel"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        /* Standard Toolbar Buttons */
        <>
          {/* 1. Rich Text Formatting (Bold, Italic, Underline, Clear) */}
          <div className="flex items-center gap-0.5 border-r border-zinc-700 pr-1 mr-0.5">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCommand('bold');
              }}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-200 hover:text-white transition-colors"
              title="Bold (Ctrl+B)"
            >
              <Bold size={13} className="font-bold" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCommand('italic');
              }}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-200 hover:text-white transition-colors"
              title="Italic (Ctrl+I)"
            >
              <Italic size={13} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCommand('underline');
              }}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-200 hover:text-white transition-colors"
              title="Underline (Ctrl+U)"
            >
              <Underline size={13} />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCommand('removeFormat');
              }}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Clear Formatting"
            >
              <RemoveFormatting size={13} />
            </button>
          </div>

          {/* 2. Smart AI & Impact Writing Enhancers */}
          <div className="flex items-center gap-1 border-r border-zinc-700 pr-1 mr-0.5">
            {/* ⭐ STAR Method Rewriter */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onApplyFormat('star');
              }}
              className="px-2 py-1 bg-amber-950/70 hover:bg-amber-900/90 text-amber-300 border border-amber-700/50 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
              title="Rewrite in STAR (Situation → Task → Action → Result) format"
            >
              <Star size={11} className="text-amber-400 fill-current" />
              <span>STAR</span>
            </button>

            {/* ↔️ Expand */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onApplyFormat('expand');
              }}
              className="px-2 py-1 bg-zinc-800 hover:bg-cyan-950/80 text-cyan-300 border border-cyan-800/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
              title="Expand with technical architecture & scale context"
            >
              <Maximize2 size={11} className="text-cyan-400" />
              <span>Expand</span>
            </button>

            {/* ✂️ Condense */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onApplyFormat('condense');
              }}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
              title="Trim filler words & condense to fit 1 line"
            >
              <Minimize2 size={11} className="text-zinc-400" />
              <span>Condense</span>
            </button>

            {/* 🔗 Add Hyperlink OR Unlink Button (Unlink shows ONLY when selected text has a link) */}
            {hasSelectedLink ? (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onApplyFormat('unlink');
                  setHasSelectedLink(false);
                }}
                className="px-2 py-1 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/60 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                title="Remove Hyperlink from selected text"
              >
                <Unlink size={11} className="text-red-400" />
                <span>Unlink</span>
              </button>
            ) : (
              <button
                type="button"
                onMouseDown={handleLinkButtonClick}
                className="px-2 py-1 bg-blue-950/70 hover:bg-blue-900/90 text-blue-300 border border-blue-700/50 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                title="Add clickable link to selected text"
              >
                <LinkIcon size={11} className="text-blue-400" />
                <span>Link</span>
              </button>
            )}
          </div>

          {/* 3. Formatting & UX Tools */}
          <div className="flex items-center gap-1 border-r border-zinc-700 pr-1 mr-0.5">
            {/* Aa Smart Case Converter */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onApplyFormat('toggleCase');
              }}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
              title="Toggle Title Case / Sentence Case"
            >
              <Type size={11} className="text-zinc-400" />
              <span>Case</span>
            </button>

            {/* ✂️ Split Bullet */}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onApplyFormat('splitBullet');
              }}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
              title="Split run-on bullet into 2 concise bullets"
            >
              <GitFork size={11} className="text-zinc-400" />
              <span>Split</span>
            </button>
          </div>

          {/* 4. Bullet Item Controls */}
          {onAddBullet && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddBullet();
              }}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-cyan-400 transition-colors"
              title="Insert New Bullet"
            >
              <Plus size={13} />
            </button>
          )}

          {onDeleteCurrent && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDeleteCurrent();
              }}
              className="p-1.5 hover:bg-red-900/50 rounded-lg text-zinc-400 hover:text-red-400 transition-colors"
              title="Delete item"
            >
              <Trash2 size={13} />
            </button>
          )}
        </>
      )}
    </div>
  );
};
