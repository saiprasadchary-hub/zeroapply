/**
 * ZeroApply Standard Forms - Site Adapters
 * Safe URL validation and portal adapter specifications.
 */

export interface StandardSiteAdapter {
  id: string;
  name: string;
  hostPatterns: string[];
}

export const SUPPORTED_SITE_ADAPTERS: Record<string, StandardSiteAdapter> = {
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    hostPatterns: ['linkedin.com', 'www.linkedin.com'],
  },
  indeed: {
    id: 'indeed',
    name: 'Indeed',
    hostPatterns: ['indeed.com', 'www.indeed.com'],
  },
  glassdoor: {
    id: 'glassdoor',
    name: 'Glassdoor',
    hostPatterns: ['glassdoor.com', 'www.glassdoor.com'],
  },
};

export function getStandardSiteAdapter(portal: string): StandardSiteAdapter | undefined {
  const key = portal.toLowerCase().trim();
  return SUPPORTED_SITE_ADAPTERS[key];
}

export function isAdapterUrl(url: string, adapter?: StandardSiteAdapter): boolean {
  if (!adapter || !url) return false;
  try {
    const parsed = new URL(url);
    return adapter.hostPatterns.some(
      (h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`)
    );
  } catch {
    return false;
  }
}

export function isSafeHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    return true;
  } catch {
    return false;
  }
}
