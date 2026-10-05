/**
 * ZeroApply Navigation - Platform Search URL Builder
 * Production-grade query and URL generation based on candidate persona,
 * targeted job roles, location statistics, and platform-specific filter flags.
 */

export type PlatformId = 'linkedin' | 'indeed' | 'glassdoor' | 'unstop' | 'naukri' | 'auto' | 'testbed';

export interface SearchCriteria {
  platform: PlatformId | string;
  targetRoles: string[] | string;
  location?: string;
  workPreference?: 'Remote' | 'On-site' | 'Hybrid';
  easyApplyOnly?: boolean;
}

/**
 * Extracts and normalizes primary role keyword from string or array.
 */
export function normalizeRoleKeyword(targetRoles?: string[] | string): string {
  if (!targetRoles) return 'Software Engineer';
  if (Array.isArray(targetRoles)) {
    const valid = targetRoles.map((r) => r.trim()).filter((r) => r.length > 0);
    return valid.length > 0 ? valid[0] : 'Software Engineer';
  }
  const trimmed = targetRoles.trim();
  return trimmed.length > 0 ? trimmed : 'Software Engineer';
}

/**
 * Extracts location statistics (city, state, country, remote status).
 */
export function parseLocationStats(rawLocation?: string, workPreference?: string): {
  queryLocation: string;
  isRemote: boolean;
} {
  const loc = (rawLocation || '').trim();
  const pref = (workPreference || '').toLowerCase();
  const isRemote = pref === 'remote' || /remote/i.test(loc);

  if (isRemote && (!loc || /remote/i.test(loc))) {
    return { queryLocation: 'Remote', isRemote: true };
  }

  return { queryLocation: loc, isRemote };
}

/**
 * Builds platform-compliant search URLs with Easy Apply filters.
 */
export function buildSearchUrl(
  platform: PlatformId | string,
  targetRoles?: string[] | string,
  location = '',
  workPreference: 'Remote' | 'On-site' | 'Hybrid' = 'Remote',
  applyMode: 'easy' | 'normal' | boolean = 'easy'
): string {
  const role = normalizeRoleKeyword(targetRoles);
  const { queryLocation, isRemote } = parseLocationStats(location, workPreference);

  const roleEncoded = encodeURIComponent(role);
  const locEncoded = encodeURIComponent(queryLocation);

  const normalizedPlatform = (platform || 'linkedin').toLowerCase().trim();
  const isEasyApply = applyMode === 'easy' || applyMode === true || applyMode === undefined;

  switch (normalizedPlatform) {
    case 'linkedin': {
      // f_AL=true: LinkedIn Easy Apply filter parameter
      // f_WT=2: Remote work filter on LinkedIn
      const remoteParam = isRemote ? '&f_WT=2' : '';
      const easyApplyParam = isEasyApply ? '&f_AL=true' : '';
      return `https://www.linkedin.com/jobs/search/?keywords=${roleEncoded}&location=${locEncoded}${easyApplyParam}${remoteParam}`;
    }

    case 'indeed': {
      // indeed Easy Apply filtering
      const easyApplyParam = isEasyApply ? '&sc=0kf%3Aattr%28DS3S6%29%3B' : '';
      return `https://www.indeed.com/jobs?q=${roleEncoded}&l=${locEncoded}${easyApplyParam}`;
    }

    case 'glassdoor': {
      return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${roleEncoded}&locKeyword=${locEncoded}`;
    }

    case 'unstop': {
      return `https://unstop.com/jobs?search=${roleEncoded}`;
    }

    case 'naukri': {
      const cleanRole = role.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const cleanLoc = (queryLocation || 'india').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return `https://www.naukri.com/${cleanRole}-jobs-in-${cleanLoc}`;
    }

    case 'testbed':
    case 'clone-linkedin':
    case 'clone inkdin': {
      const modeParam = isEasyApply ? '?mode=easy' : '?mode=normal';
      return `http://localhost:5173/clone-linkedin/index.html${modeParam}`;
    }

    default: {
      const easyApplyParam = isEasyApply ? '&f_AL=true' : '';
      return `https://www.linkedin.com/jobs/search/?keywords=${roleEncoded}&location=${locEncoded}${easyApplyParam}`;
    }
  }
}

/**
 * Navigates a webview or browser page target to the computed search URL.
 */
export async function searchAndNavigate(
  view: { loadURL?: (url: string) => Promise<void>; goto?: (url: string) => Promise<unknown>; getURL?: () => string; src?: string } | null | undefined,
  platform: PlatformId | string,
  targetRoles: string[] | string,
  location = '',
  workPreference: 'Remote' | 'On-site' | 'Hybrid' = 'Remote',
  applyMode: 'easy' | 'normal' | boolean = 'easy'
): Promise<string> {
  const url = buildSearchUrl(platform, targetRoles, location, workPreference, applyMode);
  if (view) {
    const currentUrl = typeof view.getURL === 'function' ? view.getURL() : (view.src || '');
    if (currentUrl && currentUrl === url) {
      return url;
    }

    if ('src' in view && typeof view.src === 'string') {
      try {
        view.src = url;
        return url;
      } catch {
        // Fall back below if direct src assignment fails
      }
    }

    if (typeof view.loadURL === 'function') {
      try {
        await view.loadURL(url);
      } catch (err: any) {
        const msg = String(err?.message || '');
        const code = err?.code ?? err?.errno;
        // ERR_ABORTED (-3) and ERR_FAILED (-2) are completely normal when LinkedIn redirects to currentJobId or supersedes navigation
        if (
          code === -3 || code === 'ERR_ABORTED' || msg.includes('ERR_ABORTED') || msg.includes('-3') ||
          code === -2 || code === 'ERR_FAILED' || msg.includes('ERR_FAILED') || msg.includes('-2')
        ) {
          return url;
        }
        throw err;
      }
    } else if (typeof view.goto === 'function') {
      try {
        await view.goto(url);
      } catch (err: any) {
        const msg = String(err?.message || '');
        if (
          !msg.includes('ERR_ABORTED') && !msg.includes('net::ERR_ABORTED') &&
          !msg.includes('ERR_FAILED') && !msg.includes('net::ERR_FAILED')
        ) {
          throw err;
        }
      }
    }
  }
  return url;
}
