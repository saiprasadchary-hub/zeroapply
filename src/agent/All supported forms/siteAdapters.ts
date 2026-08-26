import type { PlatformId } from '../ui/AgentControlBar';

export interface StandardSiteAdapter {
  id: Exclude<PlatformId, 'auto'>;
  label: string;
  hosts: string[];
  jobPathPatterns: string[];
}

export const STANDARD_SITE_ADAPTERS: StandardSiteAdapter[] = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    hosts: ['linkedin.com'],
    jobPathPatterns: ['/jobs/view/'],
  },
  {
    id: 'indeed',
    label: 'Indeed',
    hosts: ['indeed.com'],
    jobPathPatterns: ['/viewjob', '/rc/clk', '/pagead/clk'],
  },
  {
    id: 'glassdoor',
    label: 'Glassdoor',
    hosts: ['glassdoor.com'],
    jobPathPatterns: ['/job-listing/', '/partner/joblisting.htm'],
  },
  {
    id: 'naukri',
    label: 'Naukri',
    hosts: ['naukri.com'],
    jobPathPatterns: ['/job-listings-', '/job-listing/'],
  },
  {
    id: 'unstop',
    label: 'Unstop',
    hosts: ['unstop.com'],
    jobPathPatterns: ['/jobs/', '/opportunity/'],
  },
];

export function hostnameMatches(hostname: string, expectedHost: string): boolean {
  const normalized = hostname.toLowerCase();
  const expected = expectedHost.toLowerCase();
  return normalized === expected || normalized.endsWith(`.${expected}`);
}

export function isSafeHttpsUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

export function getStandardSiteAdapter(platformId: PlatformId): StandardSiteAdapter | undefined {
  return STANDARD_SITE_ADAPTERS.find((adapter) => adapter.id === platformId);
}

export function isAdapterUrl(value: string, adapter: StandardSiteAdapter): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && adapter.hosts.some((host) => hostnameMatches(parsed.hostname, host));
  } catch {
    return false;
  }
}
