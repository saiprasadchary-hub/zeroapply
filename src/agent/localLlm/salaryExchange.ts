import verifiedSnapshot from './salaryRateSnapshot.json';
/** Public market data only: applicant salaries never leave the device. */
export interface SalaryRate { date: string; usdPerInr: number }
const MAX_AGE_MS = 7 * 86400000;
let rate: SalaryRate | undefined;
let pending: Promise<void> | undefined;

export function installSalaryRate(data: unknown, now = Date.now()): SalaryRate {
  const value = data as { base?: string; date?: string; rates?: { USD?: number } } | null;
  const date = typeof value?.date === 'string' ? Date.parse(`${value.date}T00:00:00Z`) : NaN;
  const usd = value?.rates?.USD;
  if (value?.base !== 'INR' || !Number.isFinite(date) || date > now + 86400000 || now - date > MAX_AGE_MS
    || typeof usd !== 'number' || !Number.isFinite(usd) || usd <= 0 || usd >= 1) throw new Error('Invalid or stale INR/USD exchange rate.');
  rate = { date: value.date!, usdPerInr: usd };
  return { ...rate };
}

export function getSalaryRate(now = Date.now()): SalaryRate | undefined {
  return rate && now - Date.parse(`${rate.date}T00:00:00Z`) <= MAX_AGE_MS ? { ...rate } : undefined;
}

// A dated public snapshot also covers renderer network outages. It is subject
// to the same expiry checks as a fresh response, never an LLM-generated rate.
try { installSalaryRate(verifiedSnapshot); } catch { /* Refresh required. */ }

export async function refreshSalaryRate(fetcher: typeof fetch = fetch): Promise<void> {
  if (getSalaryRate()) return;
  if (pending) return pending;
  pending = (async (): Promise<void> => {
    const response = await fetcher('https://api.frankfurter.dev/v1/latest?base=INR&symbols=USD', { signal: AbortSignal.timeout(8000), credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('INR/USD rate provider unavailable.');
    installSalaryRate(await response.json());
  })().finally(() => { pending = undefined; });
  return pending;
}

export function convertAnnualInrToUsd(amount: number, monthly: boolean): string {
  const current = getSalaryRate();
  if (!current || !Number.isFinite(amount) || amount < 0) return '';
  return String(Math.round(amount * current.usdPerInr / (monthly ? 12 : 1)));
}
