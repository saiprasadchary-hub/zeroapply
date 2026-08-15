export const TELEMETRY_INJECTION_SCRIPT = `
(function initTelemetry() {
  if (window.__zaTelemetryInitialized) return;
  window.__zaTelemetryInitialized = true;

  console.log('[ZA_TELEMETRY_INIT] Active Learning Tracker injected.');

  // Helper to find the best label for an input
  function findLabelForInput(el) {
    if (!el) return '';
    
    // 1. Aria-label
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
    
    // 2. Associated <label for="...">
    if (el.id) {
      const label = document.querySelector('label[for="' + el.id + '"]');
      if (label && label.innerText) return label.innerText.trim();
    }
    
    // 3. Closest wrapping <label>
    const wrapper = el.closest('label');
    if (wrapper && wrapper.innerText) return wrapper.innerText.trim();
    
    // 4. Closest legendary fieldset or heading
    const container = el.closest('.jobs-search-results__list-item, form, fieldset, div');
    if (container) {
       const heading = container.querySelector('legend, h3, h4, span.text-heading-large, span.fb-dash-form-element__label');
       if (heading && heading.innerText) return heading.innerText.trim();
    }
    
    return el.name || el.id || '';
  }

  // We only care when an input loses focus (meaning they finished typing/selecting)
  document.addEventListener('focusout', (e) => {
    const target = e.target;
    
    // We only care about inputs, selects, and textareas
    if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
      
      // Ignore hidden inputs, passwords, files
      if (target.type === 'hidden' || target.type === 'password' || target.type === 'file') return;

      let value = target.value;
      if (target.type === 'checkbox' || target.type === 'radio') {
         if (!target.checked) return; // Only care about the selected one
         value = target.value || target.nextElementSibling?.innerText || 'Yes';
      }
      
      if (!value || value.trim() === '') return;

      const questionLabel = findLabelForInput(target);
      if (!questionLabel || questionLabel.length < 5) return; // Ignore generic unidentifiable fields

      // Send telemetry back to host
      const payload = {
        question: questionLabel,
        answer: value.trim()
      };
      
      // Prefix with [ZA_TELEMETRY] so the Electron host can catch it via console-message
      console.log('[ZA_TELEMETRY] ' + JSON.stringify(payload));
    }
  }, true); // use capture phase
})();
`;
