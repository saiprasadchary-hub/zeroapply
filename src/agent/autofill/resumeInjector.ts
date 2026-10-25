export interface SavedResumeFile {
  name: string;
  type: string;
  base64?: string;
  base64Data?: string;
  size?: number | string;
  lastModified?: number;
}

const STORAGE_KEY = 'zeroapply_saved_resume_file';

export async function saveResumeFileToStorage(file: File | SavedResumeFile): Promise<void> {
  if (typeof localStorage === 'undefined') return;

  if ('base64' in file && typeof file.base64 === 'string') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(file));
    return;
  }

  if ('base64Data' in file && typeof file.base64Data === 'string') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...file, base64: file.base64Data }));
    return;
  }

  if (typeof File !== 'undefined' && file instanceof File) {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const base64 = (reader.result as string).split(',')[1] || '';
          const saved: SavedResumeFile = {
            name: file.name,
            type: file.type || 'application/pdf',
            size: file.size,
            lastModified: file.lastModified,
            base64,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}

export function clearSavedResumeFileFromStorage(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getSavedResumeFileFromStorage(): SavedResumeFile | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
