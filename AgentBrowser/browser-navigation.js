const LINKEDIN_SAFETY_PATH = /^\/safety\/go\/?$/i;

const IDENTITY_HOSTS = [
  'accounts.google.com', 'accounts.googleusercontent.com', 'appleid.apple.com',
  'login.microsoftonline.com', 'login.live.com', 'github.com',
  'zero-apply.firebaseapp.com', 'zero-apply.web.app',
];

export function isAuthenticationUrl(value, baseUrl) {
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    return IDENTITY_HOSTS.some((domain) => host === domain || host.endsWith(`.${domain}`))
      || /\/(?:oauth2?|authorize|authorization|saml2?|sso|signin|sign-in|login|auth)(?:\/|$)/i.test(url.pathname);
  } catch {
    return false;
  }
}

export function shouldKeepAuthenticationPopup(value, authenticatedPopup) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password
      && (authenticatedPopup || isAuthenticationUrl(value));
  } catch {
    return false;
  }
}

export function isLinkedInSafetyUrl(value, baseUrl) {
  try {
    const parsed = new URL(value, baseUrl || 'https://www.linkedin.com');
    return (parsed.hostname === 'linkedin.com' || parsed.hostname.endsWith('.linkedin.com'))
      && LINKEDIN_SAFETY_PATH.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function isLinkedInTrackerUrl(value, baseUrl) {
  try {
    const parsed = new URL(value, baseUrl || 'https://www.linkedin.com');
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

export function resolvePopupDestination(value, baseUrl) {
  try {
    if (typeof value !== 'string' || !value.trim()) return null;
    let parsed;
    if (baseUrl) {
      parsed = new URL(value, baseUrl);
    } else {
      try {
        parsed = new URL(value);
      } catch {
        return null;
      }
    }
    const isLinkedInSafetyRedirect = isLinkedInSafetyUrl(parsed.toString(), baseUrl);
    if (!isLinkedInSafetyRedirect) return parsed;

    const redirectKeys = ['url', 'target', 'destination', 'redirect', 'dest', 'redirectUrl', 'redirect_url', 'u', 'href', 'next', 'r', 'link', 'out', 'external_url'];
    for (const key of redirectKeys) {
      let nestedValue = parsed.searchParams.get(key);
      if (!nestedValue) continue;
      try {
        if (nestedValue.includes('%')) {
          try { nestedValue = decodeURIComponent(nestedValue); } catch {}
        }
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

export function matchesStartupDestination(currentUrl, requestedUrl) {
  try {
    if (!currentUrl || !requestedUrl) return false;
    const current = new URL(currentUrl);
    const requested = new URL(requestedUrl);

    // Protocol must match
    if (current.protocol !== requested.protocol) return false;

    // Helper to get registered root domain (e.g. "www.linkedin.com" -> "linkedin.com", "in.linkedin.com" -> "linkedin.com")
    const getRootDomain = (hostname) => {
      const parts = (hostname || '').toLowerCase().split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }
      return hostname.toLowerCase();
    };

    const currentHost = current.hostname.toLowerCase();
    const requestedHost = requested.hostname.toLowerCase();

    // Check host match: exact match OR same registered root domain (e.g. *.linkedin.com)
    // Ensures attacker domains like "www.linkedin.com.attacker.example" return false
    const currentRoot = getRootDomain(currentHost);
    const requestedRoot = getRootDomain(requestedHost);
    const isDomainMatch = (currentHost === requestedHost) ||
      (currentRoot === requestedRoot && (currentHost === currentRoot || currentHost.endsWith('.' + currentRoot)) && (requestedHost === requestedRoot || requestedHost.endsWith('.' + requestedRoot)));

    if (!isDomainMatch) return false;

    // Disallow login, auth, checkpoint pages
    const isAuthPath = /\/(?:login|signin|sign-in|authwall|checkpoint|uas\/login)(?:[/?#]|$)/i.test(current.pathname);
    if (isAuthPath) return false;

    // Pathname normalization
    const normPath = (p) => p.toLowerCase().replace(/\/+$/, '') || '/';
    const currentPath = normPath(current.pathname);
    const requestedPath = normPath(requested.pathname);

    // LinkedIn may redirect /jobs/search to /jobs/search-results, but a job detail
    // is never a substitute for a newly requested search.
    const linkedInSearch = (p) => /^\/jobs\/(?:search|search-results)$/.test(p);
    const isPathMatch = currentPath === requestedPath ||
      (currentRoot === 'linkedin.com' && linkedInSearch(currentPath) && linkedInSearch(requestedPath));

    if (!isPathMatch) return false;

    // Primary search query parameters to check (case-insensitive)
    const PRIMARY_QUERY_KEYS = ['keywords', 'q', 'sc.keyword', 'search'];
    for (const key of PRIMARY_QUERY_KEYS) {
      if (requested.searchParams.has(key)) {
        const reqVal = (requested.searchParams.get(key) || '').trim().toLowerCase();
        if (reqVal) {
          if (!current.searchParams.has(key)) return false;
          if (current.searchParams.has(key)) {
            const currVal = (current.searchParams.get(key) || '').trim().toLowerCase();
            if (currVal !== reqVal) return false;
          }
        }
      }
    }

    // Check filter parameters present in both
    for (const [key, value] of requested.searchParams.entries()) {
      if (PRIMARY_QUERY_KEYS.includes(key)) continue;
      // If the parameter is present in current URL, verify value matches (case-insensitive)
      if (current.searchParams.has(key)) {
        const allCurrent = current.searchParams.getAll(key).map(v => v.trim().toLowerCase());
        const reqVal = value.trim().toLowerCase();
        if (!allCurrent.includes(reqVal)) return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

