import React, { useRef, useEffect } from 'react';

interface EditableFieldProps {
  value: string;
  onChange: (val: string) => void;
  isEditMode: boolean;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  tag?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div' | 'li';
  onFocus?: (e: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
  style?: React.CSSProperties;
}

const ALLOWED_TAGS = new Set(['A', 'B', 'BR', 'DIV', 'EM', 'I', 'P', 'SPAN', 'STRONG', 'U']);

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] || character);
}

function safeLink(value: string): string | null {
  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function sanitizeRichText(value: string): string {
  if (!value) return '';
  const parser = new DOMParser();
  const parsed = parser.parseFromString(`<body>${value}</body>`, 'text/html');

  for (const blocked of parsed.body.querySelectorAll('script,style,iframe,object,embed,svg,math')) blocked.remove();
  for (const element of Array.from(parsed.body.querySelectorAll('*')).reverse()) {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    const href = element.tagName === 'A' ? safeLink(element.getAttribute('href') || '') : null;
    for (const attribute of Array.from(element.attributes)) element.removeAttribute(attribute.name);
    if (element.tagName === 'A' && href) {
      element.setAttribute('href', href);
      element.setAttribute('target', '_blank');
      element.setAttribute('rel', 'noopener noreferrer');
      element.setAttribute('class', 'text-blue-600 underline font-medium hover:text-blue-800 cursor-pointer');
    } else if (element.tagName === 'A') {
      element.replaceWith(...Array.from(element.childNodes));
    }
  }
  return parsed.body.innerHTML;
}

// Convert legacy markdown (**bold**, *italic*, __underline__, [text](url)) to sanitized HTML.
function markdownToHtml(str: string): string {
  if (!str) return '';
  if (/<[a-z][\s\S]*>/i.test(str)) return sanitizeRichText(str);
  return escapeHtml(str)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/__([^_]+)__/g, '<u>$1</u>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_match, label: string, rawUrl: string) => {
        const href = safeLink(rawUrl);
        return href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-medium hover:text-blue-800 cursor-pointer">${label}</a>` : label;
      },
    );
}

export const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onChange,
  isEditMode,
  placeholder = 'Click to edit...',
  className = '',
  multiline = false,
  tag: Tag = 'span',
  onFocus,
  onBlur,
  onKeyDown,
  style,
}) => {
  const elementRef = useRef<HTMLElement>(null);

  // Synchronize DOM innerHTML with value when not actively typing
  useEffect(() => {
    if (elementRef.current) {
      const activeEl = document.activeElement;
      if (activeEl !== elementRef.current) {
        const formattedHtml = markdownToHtml(value || '');
        if (elementRef.current.innerHTML !== formattedHtml) {
          elementRef.current.innerHTML = formattedHtml;
        }
      }
    }
  }, [value, isEditMode]);

  // Handle native typing and formatting updates
  const handleInput = (e: React.FormEvent<HTMLElement>) => {
    const target = e.currentTarget;
    const html = sanitizeRichText(target.innerHTML);
    if (target.innerHTML !== html) target.innerHTML = html;
    // If empty or only a break tag, clear it
    if (html === '<br>' || html === '<div><br></div>' || !target.innerText.trim()) {
      onChange('');
    } else {
      onChange(html);
    }
  };

  // Keyboard navigation and single-line Enter handling
  const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  // Handle link clicking inside the field
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor && anchor.href) {
      // If clicking on a link, allow navigating to it in new tab
      if (!isEditMode || e.ctrlKey || e.metaKey || target.tagName === 'A') {
        const href = safeLink(anchor.href);
        if (href) window.open(href, '_blank', 'noopener,noreferrer');
      }
    }
  };

  if (!isEditMode) {
    const formattedHtml = markdownToHtml(value || '');
    if (!formattedHtml && !placeholder) return null;
    return (
      <Tag
        className={className}
        style={style}
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: formattedHtml || '' }}
      />
    );
  }

  return (
    <Tag
      ref={elementRef as any}
      contentEditable={isEditMode}
      suppressContentEditableWarning
      onInput={handleInput}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDownInternal}
      data-placeholder={placeholder}
      className={`outline-none transition-all ${
        isEditMode
          ? 'hover:bg-cyan-50/50 focus:bg-cyan-50/80 focus:ring-1 focus:ring-cyan-500 rounded px-1 py-0.5 -mx-1 -my-0.5 cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 empty:before:italic empty:before:pointer-events-none'
          : ''
      } ${className}`}
      style={style}
    />
  );
};
