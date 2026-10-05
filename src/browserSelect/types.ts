export type BrowserMode = 'own' | 'agent';

export const DEFAULT_BROWSER_MODE: BrowserMode = 'agent';

export function normalizeBrowserMode(value: unknown): BrowserMode {
  return value === 'own' ? 'own' : DEFAULT_BROWSER_MODE;
}

