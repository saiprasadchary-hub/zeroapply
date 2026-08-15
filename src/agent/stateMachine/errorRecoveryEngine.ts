export const ERROR_DETECTOR_SCRIPT = `
(function detectFormErrors() {
  const errorElements = Array.from(document.querySelectorAll('[aria-invalid="true"], .error, .has-error, .artdeco-inline-feedback--error'));
  const errorMessages = errorElements.map(el => el.innerText.trim()).filter(Boolean);

  return {
    hasErrors: errorMessages.length > 0,
    errorCount: errorMessages.length,
    messages: errorMessages,
  };
})();
`;
