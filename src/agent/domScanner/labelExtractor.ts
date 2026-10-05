/**
 * ZeroApply DOM Scanner - Label Extractor
 * Discovers and associates the semantic question/label for any input element
 * via ARIA attributes, <label for="...">, fieldsets, legends, and proximity.
 */

export function extractElementLabel(el: Element): string {
  // 1. Explicit ARIA label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) {
    return ariaLabel.trim();
  }

  // 2. ARIA labelledby reference
  const ariaLabelledBy = el.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const ids = ariaLabelledBy.split(/\s+/);
    const texts: string[] = [];
    for (const id of ids) {
      const refEl = document.getElementById(id);
      if (refEl && refEl.textContent?.trim()) {
        texts.push(refEl.textContent.trim());
      }
    }
    if (texts.length > 0) return texts.join(' ');
  }

  // 3. Label with matching for="..." attribute
  const elementId = el.getAttribute('id');
  if (elementId) {
    const matchingLabel = document.querySelector(`label[for="${elementId}"]`);
    if (matchingLabel && matchingLabel.textContent?.trim()) {
      return matchingLabel.textContent.trim();
    }
  }

  // 4. Closest parent <label>
  const parentLabel = el.closest('label');
  if (parentLabel && parentLabel.textContent?.trim()) {
    return parentLabel.textContent.trim();
  }

  // 5. Parent container with question-title or legend
  const parentContainer = el.closest('.fb-form-element, [data-test-form-element], fieldset, .jobs-easy-apply-form-section__grouping');
  if (parentContainer) {
    const questionTitleEl = parentContainer.querySelector('.question-title, legend, label, [class*="title"], [class*="label"]');
    if (questionTitleEl && questionTitleEl.textContent?.trim()) {
      return questionTitleEl.textContent.trim();
    }
  }

  // 6. Placeholder or Name attribute
  const placeholder = el.getAttribute('placeholder');
  if (placeholder && placeholder.trim()) {
    return placeholder.trim();
  }

  const name = el.getAttribute('name');
  if (name && name.trim()) {
    return name.trim();
  }

  return '';
}
