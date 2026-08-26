const LINKEDIN_SAFETY_PATH = /^\/safety\/go\/?$/i;

export function isLinkedInSafetyUrl(value) {
  try {
    const parsed = new URL(value);
    return (parsed.hostname === 'linkedin.com' || parsed.hostname.endsWith('.linkedin.com'))
      && LINKEDIN_SAFETY_PATH.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function isLinkedInTrackerUrl(value) {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return (host === 'linkedin.com' || host.endsWith('.linkedin.com'))
      && parsed.pathname.toLowerCase().replace(/\/+$/, '') === '/jobs-tracker';
  } catch {
    return false;
  }
}

export function isBrowserDestination(url) {
  return Boolean(url && ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password);
}

export function isDeferredPopupUrl(value) {
  if (typeof value !== 'string') return false;
  if (!value.trim()) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'about:' && parsed.pathname.toLowerCase() === 'blank';
  } catch {
    return false;
  }
}

export function resolvePopupDestination(value) {
  try {
    const parsed = new URL(value);
    const isLinkedInSafetyRedirect = isLinkedInSafetyUrl(parsed.toString());
    if (!isLinkedInSafetyRedirect) return parsed;

    for (const key of ['url', 'target', 'destination', 'redirect']) {
      const nestedValue = parsed.searchParams.get(key);
      if (!nestedValue) continue;
      try {
        const nested = new URL(nestedValue);
        if (isBrowserDestination(nested)) return nested;
      } catch {
        // Try the next known redirect parameter.
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function normalizeGestureCandidates(rawCandidates, baseUrl) {
  if (!Array.isArray(rawCandidates)) return [];
  const normalized = [];
  for (const candidate of rawCandidates) {
    if (typeof candidate !== 'string' || candidate.length > 8_192) continue;
    try {
      const parsed = new URL(candidate, baseUrl);
      if (isBrowserDestination(parsed)) normalized.push(parsed.toString());
    } catch {
      // Ignore malformed DOM attributes sent by the isolated webview preload.
    }
    if (normalized.length === 6) break;
  }
  return [...new Set(normalized)];
}

export function resolveGestureDestination(gesture) {
  for (const candidate of gesture?.candidates || []) {
    const parsed = resolvePopupDestination(candidate);
    if (isBrowserDestination(parsed)) return parsed;
  }
  return null;
}
