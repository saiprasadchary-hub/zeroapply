import type { PersonaData } from '../types';
import { extractRawTextFromFile } from './textExtractor';
import { runLocalMLClassification } from './localMLParser';
import { chunkResumeText } from '../agent/rag/resumeChunker';

export interface AutoFillResult {
  updatedPersona: PersonaData;
  fieldsCount: number;
  fileName: string;
}

/**
 * Main auto-fill entrypoint function.
 * Reads resume file (PDF/DOCX/TXT), runs on-device local ML entity classification,
 * and merges the extracted attributes into the target PersonaData.
 */
export async function autoFillPersonaFromResume(
  file: File,
  currentPersona: PersonaData
): Promise<AutoFillResult> {
  const rawText = await extractRawTextFromFile(file);

  if (!rawText || rawText.length < 10) {
    throw new Error(`Could not extract readable text content from "${file.name}".`);
  }

  const extractedFields = await runLocalMLClassification(rawText, currentPersona);
  const fieldsCount = Object.entries(extractedFields).filter(([key, value]) =>
    JSON.stringify(currentPersona[key as keyof PersonaData]) !== JSON.stringify(value)
  ).length;
  
  const resumeChunks = chunkResumeText(rawText);
  // Retain explicitly saved application preferences when the resume does not state them.
  for (const key of ['workAuthorization', 'availability', 'compensation', 'relocation', 'securityClearance', 'eeoDemographics'] as const) {
    const saved = currentPersona.resumeChunks?.[key];
    if (!resumeChunks[key] && saved?.trim()) resumeChunks[key] = saved;
  }

  const updatedPersona: PersonaData = {
    ...currentPersona,
    ...extractedFields,
    resumeText: rawText,
    experienceSummary: resumeChunks.summary ?? extractedFields.experienceSummary ?? '',
    resumeChunks,
    verified: false,
  };

  return {
    updatedPersona,
    fieldsCount,
    fileName: file.name,
  };
}

export * from './textExtractor';
export * from './localMLParser';
