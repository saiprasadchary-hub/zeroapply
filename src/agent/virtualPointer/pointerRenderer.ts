import type { PointerConfig } from './types';
import { DEFAULT_POINTER_CONFIG } from './types';

/**
 * In-page injection script that mounts and controls the visual virtual mouse pointer in the webview.
 */
export function generatePointerInjectionScript(config: PointerConfig = DEFAULT_POINTER_CONFIG): string {
  const cfgJson = JSON.stringify(config);

  return `
(function initVirtualPointer() {
  if (window.__zaVirtualPointer) return;

  const config = ${cfgJson};
  let currentX = window.innerWidth / 2;
  let currentY = window.innerHeight / 2;

  // Create Container
  const container = document.createElement('div');
  container.id = 'za-virtual-pointer-root';
  container.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 2147483647;
    pointer-events: none !important;
    user-select: none !important;
  \`;

  // SVG Pro Cursor Arrow (Sleek modern dark cursor with white border & soft shadow)
  const cursorSvg = \`
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.3));">
      <path d="M3 3L10.07 20.97L13.58 13.58L20.97 10.07L3 3Z" fill="#09090b" stroke="#ffffff" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>
  \`;

  // Cursor Element
  const pointer = document.createElement('div');
  pointer.id = 'za-virtual-cursor';
  pointer.innerHTML = cursorSvg;
  pointer.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    width: 24px;
    height: 24px;
    transform: translate3d(\${currentX}px, \${currentY}px, 0);
    transition: transform \${config.smoothnessMs}ms cubic-bezier(0.2, 0.8, 0.2, 1);
    pointer-events: none !important;
    will-change: transform;
    display: flex;
    align-items: flex-start;
  \`;

  // Subtle Agent Badge Tag
  if (config.showAgentTag) {
    const tag = document.createElement('div');
    tag.id = 'za-pointer-tag';
    tag.innerText = config.tagLabel || 'ZeroApply';
    tag.style.cssText = \`
      margin-left: 16px;
      margin-top: 14px;
      padding: 2px 7px;
      background: #09090b;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      border: 1px solid rgba(255,255,255,0.15);
      white-space: nowrap;
      letter-spacing: 0.02em;
      opacity: 0.92;
      transition: opacity 0.2s ease;
    \`;
    pointer.appendChild(tag);
  }

  container.appendChild(pointer);
  document.documentElement.appendChild(container);

  // Global API exposed inside webview
  window.__zaVirtualPointer = {
    moveTo: function(x, y) {
      currentX = x;
      currentY = y;
      pointer.style.transform = \`translate3d(\${x}px, \${y}px, 0)\`;
    },

    click: function(x, y) {
      if (typeof x === 'number' && typeof y === 'number') {
        this.moveTo(x, y);
      }

      // Micro click scale animation on cursor
      pointer.style.transform = \`translate3d(\${currentX}px, \${currentY}px, 0) scale(0.85)\`;
      setTimeout(() => {
        pointer.style.transform = \`translate3d(\${currentX}px, \${currentY}px, 0) scale(1)\`;
      }, 120);

      // Expanding subtle ripple wave
      if (config.showClickRipple) {
        const ripple = document.createElement('div');
        ripple.style.cssText = \`
          position: fixed;
          left: \${currentX}px;
          top: \${currentY}px;
          width: 24px;
          height: 24px;
          margin-left: -12px;
          margin-top: -12px;
          border-radius: 50%;
          border: 1.5px solid #09090b;
          background: rgba(9, 9, 11, 0.08);
          pointer-events: none !important;
          animation: zaRipple 0.35s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        \`;

        // Inject keyframes if not exists
        if (!document.getElementById('za-ripple-keyframes')) {
          const style = document.createElement('style');
          style.id = 'za-ripple-keyframes';
          style.innerHTML = \`
            @keyframes zaRipple {
              0% { transform: scale(0.3); opacity: 0.8; }
              100% { transform: scale(1.6); opacity: 0; }
            }
          \`;
          document.head.appendChild(style);
        }

        container.appendChild(ripple);
        setTimeout(() => {
          if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
        }, 400);
      }
    },

    setActionText: function(text) {
      const tag = document.getElementById('za-pointer-tag');
      if (tag) {
        tag.innerText = text || config.tagLabel || 'ZeroApply';
      }
    },

    hide: function() {
      pointer.style.opacity = '0';
    },

    show: function() {
      pointer.style.opacity = '1';
    },

    destroy: function() {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
      delete window.__zaVirtualPointer;
    }
  };
})();
`;
}
