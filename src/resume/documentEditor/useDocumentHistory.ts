import { useState, useCallback } from 'react';
import type { ResumeDocument } from '../types';

export function useDocumentHistory(
  initialDocument: ResumeDocument,
  onDocumentChange?: (doc: ResumeDocument) => void
) {
  const [history, setHistory] = useState<ResumeDocument[]>([initialDocument]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const currentDocument = history[currentIndex] || initialDocument;

  const setDocument = useCallback(
    (action: ResumeDocument | ((prev: ResumeDocument) => ResumeDocument)) => {
      setHistory((prevHistory) => {
        const active = prevHistory[currentIndex];
        const next = typeof action === 'function' ? action(active) : action;
        
        // Don't record if identical timestamp/data
        if (JSON.stringify(active) === JSON.stringify(next)) {
          return prevHistory;
        }

        // Slice history up to current index and append next state
        const sliced = prevHistory.slice(0, currentIndex + 1);
        const newHistory = [...sliced, next];
        
        // Limit history to 50 items
        if (newHistory.length > 50) {
          newHistory.shift();
        }

        return newHistory;
      });

      setCurrentIndex((prev) => Math.min(prev + 1, 49));

      if (onDocumentChange) {
        const next = typeof action === 'function' ? action(history[currentIndex]) : action;
        onDocumentChange(next);
      }
    },
    [currentIndex, history, onDocumentChange]
  );

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, history.length]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return {
    document: currentDocument,
    setDocument,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
