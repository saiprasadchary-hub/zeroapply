export interface SavedResumeFile {
  name: string;
  type: string;
  base64Data: string;
}

const RESUME_STORAGE_KEY = 'zeroapply_saved_resume_file';
let inMemoryResumeCache: SavedResumeFile | null = null;

export function saveResumeFileToStorage(file: SavedResumeFile): void {
  inMemoryResumeCache = file;
  try {
    localStorage.setItem(RESUME_STORAGE_KEY, JSON.stringify(file));
  } catch (e) {
    console.warn('LocalStorage quota reached or storage restricted; keeping resume in runtime memory cache:', e);
  }
}

export function getSavedResumeFileFromStorage(): SavedResumeFile | null {
  if (inMemoryResumeCache) {
    return inMemoryResumeCache;
  }
  try {
    const raw = localStorage.getItem(RESUME_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      inMemoryResumeCache = parsed;
      return parsed;
    }
  } catch (e) {
    console.warn('Could not read saved resume from localStorage:', e);
  }
  return null;
}

export function clearSavedResumeFileFromStorage(): void {
  inMemoryResumeCache = null;
  try {
    localStorage.removeItem(RESUME_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear saved resume file:', error);
  }
}

/**
 * Generates browser injection script to attach a resume file to <input type="file"> elements
 * using the HTML5 DataTransfer API.
 */
export function generateResumeInjectionScript(fileName: string, mimeType: string, base64Data: string): string {
  return `
(function injectResumeFile() {
  try {
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    if (fileInputs.length === 0) return { injected: false, reason: 'No file input found' };

    const base64 = ${JSON.stringify(base64Data)};
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const file = new File([bytes], ${JSON.stringify(fileName)}, { type: ${JSON.stringify(mimeType || 'application/pdf')} });
    const container = new DataTransfer();
    container.items.add(file);

    let attachedCount = 0;
    fileInputs.forEach((input) => {
      input.files = container.files;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      attachedCount++;
    });

    return { injected: true, attachedCount };
  } catch (err) {
    return { injected: false, error: String(err) };
  }
})();
`;
}

/** Checks the actual FileList instead of trusting a portal's display label. */
export function generateResumeVerificationScript(fileName: string): string {
  return `
(function verifyResumeFile() {
  const expectedName = ${JSON.stringify(fileName)};
  const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
  if (!inputs.length) return { hasUploadField: false, matches: false, fileNames: [] };
  const fileNames = inputs.map((input) => input.files && input.files[0] ? input.files[0].name : '');
  return {
    hasUploadField: true,
    matches: fileNames.some((name) => name === expectedName),
    fileNames,
  };
})();
`;
}

/**
 * Smart one-pass resume handler that runs inside the page DOM.
 * 
 * 1. Detects if a resume is already displayed (LinkedIn shows the name in a label, not in input.files)
 * 2. Compares displayed name with the user's saved resume name
 * 3. If same → skip. If different → replace. If empty → upload.
 * 
 * Returns: { action: 'skip' | 'replaced' | 'uploaded' | 'no_field' | 'failed', displayedName: string, reason: string }
 */
export function generateSmartResumeHandlerScript(fileName: string, mimeType: string, base64Data: string): string {
  return `
(function smartResumeHandler() {
  try {
    const expectedName = ${JSON.stringify(fileName)}.toLowerCase().trim();

    // --- Step 1: Detect any displayed resume name on the page ---
    // LinkedIn specific selectors for the resume card
    const linkedinSelectors = [
      '.jobs-document-upload-redesign-card__file-name',
      '.jobs-resume-upload__file-name',
      '.document-upload-card__file-name',
      '[data-test-document-upload-file-name]',
    ];

    let displayedName = '';

    // Try LinkedIn-specific selectors first
    for (const sel of linkedinSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent && el.textContent.trim().length > 2) {
        displayedName = el.textContent.trim();
        break;
      }
    }

    // Fallback: scan text near any file input for .pdf/.docx/.doc patterns
    if (!displayedName) {
      const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
      for (const input of fileInputs) {
        // Check the input's own FileList
        if (input.files && input.files[0] && input.files[0].name) {
          displayedName = input.files[0].name;
          break;
        }
        // Check nearby sibling/parent text
        const container = input.closest('.jobs-document-upload-redesign-card, .document-upload, .resume-upload, [class*="upload"]') || input.parentElement;
        if (container) {
          const text = container.textContent || '';
          const match = text.match(/[\\w\\s-]+\\.(?:pdf|docx?)/i);
          if (match) {
            displayedName = match[0].trim();
            break;
          }
        }
      }
    }

    const displayedLower = displayedName.toLowerCase().trim();

    // --- Step 2: No file upload field at all ---
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    if (fileInputs.length === 0 && !displayedName) {
      return { action: 'no_field', displayedName: '', reason: 'No resume upload field found on this step' };
    }

    // --- Step 3: Compare names ---
    // Normalize: strip extension for comparison (some portals show "Resume.pdf" vs "Resume")
    const stripExt = (n) => n.replace(/\\.(?:pdf|docx?)$/i, '').trim();
    const namesMatch = displayedLower === expectedName ||
                       stripExt(displayedLower) === stripExt(expectedName);

    if (displayedName && namesMatch) {
      return { action: 'skip', displayedName, reason: 'Matching resume already uploaded' };
    }

    // --- Step 4: A different resume is displayed → try to replace ---
    // Look for Replace / Upload new / Change buttons
    if (displayedName && !namesMatch) {
      const visible = (el) => el.offsetParent !== null;
      const buttons = Array.from(document.querySelectorAll('button, [role="button"], label[for]')).filter(visible);
      const replaceBtn = buttons.find((b) => {
        const text = (b.textContent || b.getAttribute('aria-label') || '').toLowerCase();
        return /replace|upload.?new|change|choose.?file|select.?file/i.test(text);
      });
      if (replaceBtn) {
        replaceBtn.click();
        // Wait briefly for the upload slot to reset
      }
    }

    // --- Step 5: Inject the user's resume file ---
    if (fileInputs.length === 0) {
      // After clicking replace, re-query
      const refreshed = Array.from(document.querySelectorAll('input[type="file"]'));
      if (refreshed.length === 0) {
        // No file input found even after replace button click
        // If there IS a displayed resume (just with wrong name), that's still acceptable
        if (displayedName) {
          return { action: 'skip', displayedName, reason: 'Could not find file input to replace, but a resume is present — continuing' };
        }
        return { action: 'failed', displayedName: '', reason: 'No file input element available' };
      }
    }

    const targetInputs = Array.from(document.querySelectorAll('input[type="file"]'));
    const base64 = ${JSON.stringify(base64Data)};
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const file = new File([bytes], ${JSON.stringify(fileName)}, { type: ${JSON.stringify(mimeType || 'application/pdf')} });
    const container = new DataTransfer();
    container.items.add(file);

    let injected = false;
    for (const input of targetInputs) {
      try {
        input.files = container.files;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        injected = true;
      } catch (e) {
        // Some inputs may reject programmatic file assignment
      }
    }

    if (injected) {
      return { action: displayedName ? 'replaced' : 'uploaded', displayedName: displayedName || '', reason: displayedName ? 'Replaced existing resume' : 'Uploaded resume to empty slot' };
    }

    // Injection failed but a resume IS already on the page → don't block
    if (displayedName) {
      return { action: 'skip', displayedName, reason: 'File injection failed but existing resume is present — continuing' };
    }

    return { action: 'failed', displayedName: '', reason: 'File injection failed and no existing resume found' };
  } catch (err) {
    return { action: 'failed', displayedName: '', reason: 'Script error: ' + String(err) };
  }
})();
`;
}
