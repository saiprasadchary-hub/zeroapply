import React from 'react';

/**
 * Parses lightweight ATS markdown (**bold**, *italic*, __underline__, [text](url)) and HTML tags into formatted React elements
 */
export function renderFormattedText(text: string): React.ReactNode {
  if (!text) return text;

  // Split by markdown bold (**text**), italic (*text*), underline (__text__), markdown link ([text](url)), or HTML anchor (<a href="...">...</a>)
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|\[([^\]]+)\]\(([^)]+)\)|<a\s+[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>)/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Plain text before match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-zinc-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('__') && token.endsWith('__')) {
      parts.push(
        <u key={match.index} className="underline">
          {token.slice(2, -2)}
        </u>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={match.index} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (match[2] && match[3]) {
      // Markdown link [text](url)
      const linkText = match[2];
      const linkUrl = match[3];
      parts.push(
        <a
          key={match.index}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer transition-colors"
        >
          {linkText}
        </a>
      );
    } else if (match[4] && match[5]) {
      // HTML <a> link
      const linkUrl = match[4];
      const linkText = match[5].replace(/<\/?[^>]+(>|$)/g, ''); // strip nested tags if any
      parts.push(
        <a
          key={match.index}
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer transition-colors"
        >
          {linkText}
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
