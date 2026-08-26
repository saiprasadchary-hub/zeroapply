const WEB_PROTOCOLS = new Set(['http:', 'https:']);
const EXTERNAL_PROTOCOLS = new Set(['mailto:', 'tel:']);

export function parseWebDestination(value) {
  try {
    const parsed = new URL(value);
    if (!WEB_PROTOCOLS.has(parsed.protocol) || parsed.username || parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isExternalProtocol(value) {
  try {
    const parsed = new URL(value);
    return EXTERNAL_PROTOCOLS.has(parsed.protocol) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

export function browserCommandForInput(input = {}) {
  if (input.type && input.type !== 'keyDown') return null;
  const key = String(input.key || '').toLowerCase();
  const primary = Boolean(input.control || input.meta);
  const shift = Boolean(input.shift);

  if (primary && key === 'l') return 'focus-address';
  if (primary && key === 't') return shift ? 'reopen-tab' : 'new-tab';
  if (primary && key === 'w') return 'close-tab';
  if (primary && key === 'r') return shift ? 'hard-reload' : 'reload';
  if (primary && key === 'f') return 'find';
  if (primary && key === 'p') return 'print';
  if (primary && key === 's') return 'save-page';
  if (primary && (key === '+' || key === '=')) return 'zoom-in';
  if (primary && key === '-') return 'zoom-out';
  if (primary && key === '0') return 'zoom-reset';
  if (primary && key === 'tab') return shift ? 'previous-tab' : 'next-tab';
  if (input.alt && key === 'left') return 'back';
  if (input.alt && key === 'right') return 'forward';
  if (input.alt && key === 'home') return 'home';
  if (key === 'f5') return shift ? 'hard-reload' : 'reload';
  return null;
}

export function sanitizedPageFilename(title) {
  const clean = Array.from(String(title || 'webpage'), (character) => {
    const codePoint = character.codePointAt(0) || 0;
    return codePoint < 32 || '<>:"/\\|?*'.includes(character) ? '_' : character;
  }).join('').replace(/[ .]+$/g, '').trim().slice(0, 120) || 'webpage';
  return `${clean}.html`;
}
