/**
 * ZeroApply File Upload - Existing Resume Picker
 * Handles platforms (like LinkedIn Easy Apply) that present a list of previously
 * uploaded resumes as selectable radio items or cards.
 */

export interface ResumeSelectionResult {
  found: boolean;
  selected: boolean;
  selectedName?: string;
  count: number;
}

/**
 * In-browser injection script string to pick the best existing resume.
 */
export const PICK_EXISTING_RESUME_SCRIPT = `
(function() {
  // 1. Look for radiogroup of resumes (LinkedIn Easy Apply style)
  const resumeCards = Array.from(document.querySelectorAll(
    '[role="radiogroup"] [role="radio"], .resume-item, [data-resume-name], .jobs-resume-picker__item'
  ));

  if (resumeCards.length === 0) {
    return { found: false, selected: false, count: 0 };
  }

  // Pick first or best matching resume
  const target = resumeCards[0];
  const name = target.getAttribute('data-resume-name') 
    || (target.querySelector('h5, .resume-item__details h5, span.t-bold') ? target.querySelector('h5, .resume-item__details h5, span.t-bold').textContent.trim() : 'Active Resume');

  // Trigger click
  target.click();

  // If radio input exists inside, check it
  const radio = target.querySelector('input[type="radio"]');
  if (radio) {
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  }

  target.setAttribute('aria-checked', 'true');
  target.classList.add('resume-item--selected');

  return {
    found: true,
    selected: true,
    selectedName: name,
    count: resumeCards.length
  };
})();
`;
