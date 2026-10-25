import type { WebviewTarget } from '../domScanner/injectedScanner';
import { captureWebsiteScreenshot } from '../vision/websiteScreenshot';

export interface SubmissionAnswer { question: string; answer: string; source: string }
export interface SubmissionEvidenceBundle {
  id: string;
  capturedAt: string;
  applicant: { name: string; email: string };
  jobUrl: string;
  jobId: string;
  companyName: string;
  jobTitle: string;
  confirmationText: string;
  answers: SubmissionAnswer[];
  screenshot?: string;
  screenshotError?: string;
}

const DATABASE = 'zeroapply_submission_evidence_v1';
const STORE = 'receipts';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('Receipt storage is unavailable in this environment.')); return; }
    let settled = false;
    const fail = (error: Error | DOMException): void => {
      if (settled) return;
      settled = true; clearTimeout(timer); reject(error);
    };
    const timer = setTimeout(() => fail(new Error('Receipt storage timed out.')), 5000);
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => {
      if (settled) { request.result.close(); return; }
      settled = true; clearTimeout(timer); resolve(request.result);
    };
    request.onerror = () => fail(request.error || new Error('Could not open receipt storage.'));
    request.onblocked = () => fail(new Error('Receipt storage is waiting for another app window to close.'));
  });
}

export async function saveSubmissionEvidence(bundle: SubmissionEvidenceBundle): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(bundle);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Receipt could not be saved.'));
      tx.onabort = () => reject(tx.error || new Error('Receipt storage was interrupted.'));
    });
  } finally { db.close(); }
}

export async function listSubmissionEvidence(): Promise<SubmissionEvidenceBundle[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result as SubmissionEvidenceBundle[]).sort((a, b) => b.capturedAt.localeCompare(a.capturedAt)));
      request.onerror = () => reject(request.error || new Error('Could not read saved receipts.'));
    });
  } finally { db.close(); }
}

export async function deleteSubmissionEvidence(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Could not delete receipt.'));
      tx.onabort = () => reject(tx.error || new Error('Receipt deletion was interrupted.'));
    });
  } finally { db.close(); }
}

export async function captureSubmissionEvidence(view: WebviewTarget, details: Omit<SubmissionEvidenceBundle, 'id' | 'capturedAt' | 'confirmationText' | 'screenshot' | 'screenshotError' | 'jobId'>): Promise<SubmissionEvidenceBundle> {
  const confirmationText = await view.executeJavaScript<string>(`(() => {
    const pattern = /your application (?:was|has been) sent|application (?:has been |was )?submitted|thank you for applying|thanks for applying|application received|received your application|your response has been recorded/i;
    const roots = [document];
    for (let i = 0; i < roots.length; i++) {
      for (const el of roots[i].querySelectorAll('*')) if (el.shadowRoot) roots.push(el.shadowRoot);
      for (const el of roots[i].querySelectorAll('dialog[open], [role="dialog"], h1, h2, h3, [role="status"], [role="alert"], .success-view')) {
        if (el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && pattern.test(el.innerText || el.textContent || '')) return (el.innerText || el.textContent).trim().slice(0, 2000);
      }
    }
    return '';
  })()`);
  if (!confirmationText) throw new Error('No visible application receipt was found.');
  let screenshotTimer: ReturnType<typeof setTimeout> | undefined;
  const screenshot = await Promise.race([
    captureWebsiteScreenshot(view),
    new Promise<undefined>(resolve => { screenshotTimer = setTimeout(() => resolve(undefined), 5000); }),
  ]).finally(() => { if (screenshotTimer) clearTimeout(screenshotTimer); });
  let jobId = '';
  try {
    const url = new URL(details.jobUrl);
    jobId = url.pathname.match(/\/jobs\/view\/(\d+)/)?.[1] || url.searchParams.get('currentJobId') || url.pathname;
  } catch { /* A receipt can still be preserved with its original URL. */ }
  return { ...details, id: crypto.randomUUID(), capturedAt: new Date().toISOString(), jobId, confirmationText, screenshot,
    screenshotError: screenshot ? undefined : 'The receipt was confirmed, but its screenshot could not be captured.' };
}
