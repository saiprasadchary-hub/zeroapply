import type { ResumeDocument } from '../types';

export interface FloatingToolbarPosition {
  top: number;
  left: number;
  visible: boolean;
}

export type DocumentEditorSection =
  | 'contact.fullName'
  | 'contact.jobTitle'
  | 'contact.email'
  | 'contact.phone'
  | 'contact.location'
  | 'contact.linkedIn'
  | 'contact.gitHub'
  | 'contact.portfolio'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications';

export interface ActiveEditContext {
  section: DocumentEditorSection;
  itemId?: string;
  field?: string;
  index?: number;
  currentValue: string;
}

export interface DocumentEditorOptions {
  enableAiAssistant: boolean;
  highlightAtsKeywords: boolean;
  showWordCount: boolean;
  spellCheck: boolean;
  activeFocusMode: boolean;
}

export interface DocumentEditorProps {
  document: ResumeDocument;
  onUpdateDocument: React.Dispatch<React.SetStateAction<ResumeDocument>>;
  isEditMode: boolean;
  onToggleEditMode: () => void;
  onEnhanceBullet?: (bullet: string, role?: string, company?: string) => Promise<string>;
}
