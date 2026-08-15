import type { PlatformId } from './ui/AgentControlBar';
import type { ApplyMode } from '../types';

/**
 * Build a job search URL for the given platform using role, location, and apply mode.
 * When applyMode is 'easy', platform-specific "Easy Apply" filters are appended.
 */
export function buildSearchUrl(
  platformId: PlatformId,
  roleKeyword: string,
  location: string,
  applyMode: ApplyMode = 'easy'
): string {
  const encodedRole = encodeURIComponent(roleKeyword.trim());
  const encodedLocation = encodeURIComponent(location.trim());
  const easyApply = applyMode === 'easy';

  switch (platformId) {
    case 'linkedin': {
      // LinkedIn: f_AL=true enables "Easy Apply" filter
      const base = `https://www.linkedin.com/jobs/search/?keywords=${encodedRole}&location=${encodedLocation}`;
      return easyApply ? `${base}&f_AL=true` : base;
    }
    case 'unstop': {
      return `https://unstop.com/jobs?keyword=${encodedRole}&location=${encodedLocation}`;
    }
    case 'indeed': {
      // Indeed: explvl filter; sc=0kf%3Aattr(KOCMT) filters for "Easily apply"
      const base = `https://www.indeed.com/jobs?q=${encodedRole}&l=${encodedLocation}`;
      return easyApply ? `${base}&sc=0kf%3Aattr(KOCMT)%3B` : base;
    }
    case 'glassdoor': {
      // Glassdoor: applicationType=1 = "Easy Apply"
      const base = `https://www.glassdoor.com/Job/jobs.htm?keyword=${encodedRole}&loc=${encodedLocation}`;
      return easyApply ? `${base}&applicationType=1` : base;
    }
    case 'naukri': {
      return `https://www.naukri.com/${encodedRole}-jobs-in-${encodedLocation}`;
    }
    case 'auto': {
      const suffix = easyApply ? '+easy+apply' : '';
      return `https://www.google.com/search?q=${encodedRole}+jobs+${encodedLocation}${suffix}`;
    }
    default: {
      return `https://www.google.com/search?q=${encodedRole}+jobs+${encodedLocation}`;
    }
  }
}

/**
 * Navigate the given Electron webview to the generated search URL.
 */
export async function searchAndNavigate(
  view: any,
  platformId: PlatformId,
  roleKeyword: string,
  location: string,
  applyMode: ApplyMode = 'easy'
): Promise<void> {
  const url = buildSearchUrl(platformId, roleKeyword, location, applyMode);
  if (view && typeof view.loadURL === 'function') {
    view.loadURL(url);
  } else {
    console.warn('searchAndNavigate: webview instance not available');
  }
}
