export type BrowserMode = 'own' | 'agent';

export const DEFAULT_BROWSER_MODE: BrowserMode = 'own';

export function normalizeBrowserMode(value: unknown): BrowserMode {
  return value === 'agent' ? 'agent' : DEFAULT_BROWSER_MODE;
}

