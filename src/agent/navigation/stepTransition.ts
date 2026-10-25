/** One activation per unchanged form state, with a lock shared by all page callers. */
export const STEP_TRANSITION_SCRIPT = String.raw`async function(selector, label, timeoutMs) {
  const roots = [document];
  for (let i = 0; i < roots.length; i++) {
    for (const el of roots[i].querySelectorAll('*')) if (el.shadowRoot) roots.push(el.shadowRoot);
  }
  const query = selector => roots.flatMap(root => Array.from(root.querySelectorAll(selector)));
  const visible = el => el && el.getClientRects().length > 0 && !el.closest('[hidden], [aria-hidden="true"]');
  const modalSelector = 'dialog[open], [role="dialog"], .artdeco-modal, .jobs-easy-apply-modal';
  const findRoot = () => query(modalSelector).filter(visible).at(-1) || query('form').find(visible);
  const shape = root => JSON.stringify(Array.from(root.querySelectorAll('h1,h2,h3,legend,label,input,select,textarea,[role="radiogroup"],[role="progressbar"],[aria-current="step"],button,p'))
    .filter(el => !el.closest('#zeroapply-visual-cursor, [id^="za-hud"], [role="alert"]'))
    .filter(el => el.tagName !== 'P' || /\d+\s*\/\s*\d+\s*pages/i.test(el.textContent || ''))
    .map(el => [el.tagName, el.getAttribute('type'), el.getAttribute('name'),
      el.matches('input,select,textarea') ? '' : el.textContent?.trim(), el.getAttribute('aria-valuenow')]));
  const answers = root => JSON.stringify(Array.from(root.querySelectorAll('input,select,textarea,[role="radio"],[role="checkbox"]'))
    .map(el => [el.value, el.checked, el.getAttribute('aria-checked')]));
  const pending = window.__zeroApplyWizardTransition;
  const root = findRoot();
  if (pending?.waiting) return { clicked: false, stepChanged: false };
  if (pending && root && pending.url === location.href && pending.shape === shape(root) && pending.answers === answers(root)) {
    return { clicked: false, stepChanged: false };
  }
  const button = query(selector).find(visible);
  if (!button || button.matches(':disabled,[aria-disabled="true"]')) return { clicked: false, stepChanged: false };
  if (/(^|\.)linkedin\.com$/i.test(location.hostname) && (!root || !root.matches(modalSelector) || !root.contains(button))) {
    return { clicked: false, stepChanged: false };
  }
  const scope = root || document.body;
  const state = { url: location.href, shape: shape(scope), answers: answers(scope), waiting: true };
  window.__zeroApplyWizardTransition = state;
  let clicked = false;
  try {
    button.scrollIntoView({block:'center',behavior:'instant'});
    if (window.__zeroapplyCursor?.clickElement) clicked = await window.__zeroapplyCursor.clickElement(button, label);
    else { button.click(); clicked = true; }
    if (!clicked) { delete window.__zeroApplyWizardTransition; return {clicked:false,stepChanged:false}; }
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const current = findRoot();
      if (location.href !== state.url || (root && !current) || (current && shape(current) !== state.shape)) {
        return {clicked:true,stepChanged:true};
      }
    }
    return {clicked:true,stepChanged:false};
  } finally { state.waiting = false; }
}`;
