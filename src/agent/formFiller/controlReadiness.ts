import type { WebviewTarget } from '../domScanner/injectedScanner';

/** Re-query after animation/remount; do not click through overlays or disabled controls. */
export async function waitForControlReady(view: WebviewTarget, selectors: string[]): Promise<boolean> {
  return view.executeJavaScript<boolean>(`(async () => {
    const deadline = Date.now() + 2500;
    const roots = [document];
    for (let i = 0; i < roots.length; i++) for (const element of roots[i].querySelectorAll('*')) if (element.shadowRoot) roots.push(element.shadowRoot);
    let previous = '';
    while (Date.now() < deadline) {
      let control;
      for (const root of roots) for (const selector of ${JSON.stringify(selectors)}) { try { control ||= root.querySelector(selector); } catch {} }
      if (!control) return false;
      let target = control;
      if (!target.getClientRects().length && target.labels?.length) target = target.labels[0];
      const rect = target.getBoundingClientRect();
      const style = getComputedStyle(target);
      const x = Math.min(innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
      const y = Math.min(innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
      let hit = document.elementFromPoint(x, y);
      while (hit?.shadowRoot?.elementFromPoint) { const deeper = hit.shadowRoot.elementFromPoint(x, y); if (!deeper || deeper === hit) break; hit = deeper; }
      const unobscured = hit && (hit === target || target.contains(hit) || (control.labels && Array.from(control.labels).some(label => label.contains(hit))));
      const position = [Math.round(rect.x), Math.round(rect.y), Math.round(rect.width), Math.round(rect.height)].join(',');
      const readOnlyText = control.readOnly && control.getAttribute('role') !== 'combobox';
      if (unobscured && rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0' && !control.disabled && !readOnlyText && control.getAttribute('aria-disabled') !== 'true' && position === previous) return true;
      previous = position;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return false;
  })()`).catch(() => false);
}
