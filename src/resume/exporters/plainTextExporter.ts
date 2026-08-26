import type { ResumeDocument } from '../types';
import { resumeToPlainText } from '../exportUtils';

/**
 * Downloads a formatted ASCII ATS plain-text file
 */
export function exportResumeToPlainText(doc: ResumeDocument) {
  const textContent = resumeToPlainText(doc);
  const title = (doc.contact.fullName || 'Resume').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${title}_ATS_Resume.txt`;

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
