/**
 * ZeroApply - Standalone Visual Agent Cursor
 * Injects the Dark Liquid Glass Cursor System matching the official ZeroApply reference poster:
 * - Deep obsidian liquid glass body with multi-stop gradient
 * - Luminous electric lavender/periwinkle glass rim glow
 * - Internal specular facet reflection and leading edge glint
 * - Signature Ø Zero Apply brand emblem at the lower notch
 * - Non-blocking pointer events, dual click radar ripples, and smooth Bezier trails
 * - High z-index (2147483647 !important) and ensureDomAttached() for modal resilience
 */

(() => {
  'use strict';

  const existingRoot = document.getElementById('zeroapply-codex-cursor-root');
  if (window.__zeroapplyCursor && existingRoot && document.body && document.body.contains(existingRoot)) {
    return;
  }
  if (existingRoot) {
    try { existingRoot.remove(); } catch(e) {}
  }

  const root = document.createElement('div');
  root.id = 'zeroapply-codex-cursor-root';
  root.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none !important;z-index:2147483647 !important;overflow:hidden;';

  const style = document.createElement('style');
  style.textContent = `
    #zeroapply-codex-cursor-root {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      overflow: hidden;
    }
    .za-cursor-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 58px;
      height: 58px;
      pointer-events: none !important;
      will-change: left, top, transform;
      z-index: 2147483647 !important;
    }
    .za-glass-svg {
      display: block !important;
      width: 58px !important;
      height: 58px !important;
      min-width: 58px !important;
      min-height: 58px !important;
      pointer-events: none !important;
      overflow: visible !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    #zeroapply-codex-cursor-root svg,
    #zeroapply-codex-cursor-root .za-cursor-pointer svg {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    #zeroapply-codex-cursor-root path,
    #zeroapply-codex-cursor-root circle,
    #zeroapply-codex-cursor-root line,
    #zeroapply-codex-cursor-root g {
      visibility: visible !important;
    }
    .za-cursor-pointer {
      position: relative;
      width: 58px;
      height: 58px;
      pointer-events: none !important;
      animation: za-float 3.2s ease-in-out infinite;
      transform-origin: 14px 8px;
      transition: transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease;
    }
    .za-cursor-pointer.za-cursor-bounce {
      transform: scale(0.86) rotate(-5deg);
    }
    .za-cursor-pointer.za-cursor-hover {
      filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.65)) !important;
    }
    .za-cursor-pointer.za-cursor-error {
      filter: drop-shadow(0 4px 10px rgba(244, 63, 94, 0.45)) !important;
    }
    @keyframes za-float {
      0%, 100% {
        transform: translateY(0px) rotate(0deg);
      }
      50% {
        transform: translateY(-4px) rotate(-1.5deg);
      }
    }
    .za-click-ripple {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 2px solid rgba(196, 181, 253, 0.85);
      background-color: rgba(167, 139, 250, 0.16);
      pointer-events: none !important;
      transform: translate(-50%, -50%) scale(0.15);
      box-shadow: 0 0 22px rgba(196, 181, 253, 0.8), inset 0 0 12px rgba(167, 139, 250, 0.45);
      animation: za-ripple-expand 0.52s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
      z-index: 2147483646 !important;
    }
    .za-click-ripple-pulse {
      border: 1.5px solid rgba(167, 139, 250, 0.65);
      animation: za-ripple-expand 0.46s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
    }
    @keyframes za-ripple-expand {
      0% {
        transform: translate(-50%, -50%) scale(0.15);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(2.5);
        opacity: 0;
      }
    }
    .za-cursor-trail {
      position: absolute;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: radial-gradient(circle, #c4b5fd 0%, rgba(167, 139, 250, 0.2) 80%);
      pointer-events: none !important;
      transform: translate(-50%, -50%);
      animation: za-trail-fade 0.38s ease-out forwards;
      z-index: 2147483645 !important;
    }
    .za-motion-ghost {
      position: absolute;
      width: 58px;
      height: 58px;
      pointer-events: none !important;
      opacity: 0.42;
      transform-origin: 14px 8px;
      animation: za-ghost-fade 0.28s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
      z-index: 2147483644 !important;
    }
    @keyframes za-ghost-fade {
      0% { opacity: 0.42; transform: scale(0.98); }
      100% { opacity: 0; transform: scale(0.88); }
    }
    @keyframes za-trail-fade {
      0% {
        opacity: 0.85;
        transform: translate(-50%, -50%) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.2);
      }
    }
    .za-cursor-badge {
      position: absolute;
      left: 50px;
      top: 16px;
      background: linear-gradient(135deg, rgba(18, 14, 34, 0.92), rgba(10, 8, 20, 0.95));
      color: #ede9fe;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11.5px;
      font-weight: 700;
      letter-spacing: 0.3px;
      padding: 3.5px 11px;
      border-radius: 14px;
      white-space: nowrap;
      pointer-events: none !important;
      border: 1px solid rgba(196, 181, 253, 0.45);
      box-shadow: 0 4px 20px rgba(139, 92, 246, 0.35), 0 2px 8px rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      gap: 6px;
      backdrop-filter: blur(12px);
      animation: za-badge-in 0.2s ease-out;
      z-index: 2147483647 !important;
    }
    @keyframes za-badge-in {
      from { opacity: 0; transform: translateY(4px) scale(0.9); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .za-cursor-sparkle {
      display: inline-block;
      color: #c4b5fd;
      font-size: 12px;
    }
    .za-verified-highlight {
      outline: 2px solid #10b981 !important;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.45) !important;
      transition: all 0.3s ease !important;
    }
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.className = 'za-cursor-container';
  container.style.left = '450px';
  container.style.top = '220px';

  const pointer = document.createElement('div');
  pointer.className = 'za-cursor-pointer';

  const cursorSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="58" height="58" viewBox="0 0 64 64" fill="none" class="za-glass-svg" style="filter: drop-shadow(0 0 10px rgba(167, 139, 250, 0.75)) drop-shadow(0 0 24px rgba(129, 140, 248, 0.45)) drop-shadow(0 8px 20px rgba(0, 0, 0, 0.7));">
    <defs>
      <!-- Liquid Glass Obsidian Body Fill -->
      <linearGradient id="za-glass-body-demo" x1="14" y1="8" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#2a2046" stop-opacity="0.95" />
        <stop offset="35%" stop-color="#191330" stop-opacity="0.96" />
        <stop offset="70%" stop-color="#0e0b1c" stop-opacity="0.98" />
        <stop offset="100%" stop-color="#080612" stop-opacity="0.99" />
      </linearGradient>

      <!-- Glowing Electric Lavender Glass Rim Gradient -->
      <linearGradient id="za-glass-rim-demo" x1="12" y1="6" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="15%" stop-color="#e0e7ff" />
        <stop offset="35%" stop-color="#c4b5fd" />
        <stop offset="65%" stop-color="#a78bfa" />
        <stop offset="85%" stop-color="#818cf8" />
        <stop offset="100%" stop-color="#6366f1" />
      </linearGradient>

      <!-- Internal Specular Liquid Glass Sheen -->
      <linearGradient id="za-glass-sheen-demo" x1="14" y1="8" x2="28" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
        <stop offset="40%" stop-color="#c4b5fd" stop-opacity="0.25" />
        <stop offset="100%" stop-color="#a78bfa" stop-opacity="0.0" />
      </linearGradient>

      <!-- Ambient Shadow Blur Filter -->
      <filter id="za-glass-shadow-demo" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.2" result="blur" />
      </filter>

  </defs>

    <!-- Ambient Contact Drop-Shadow -->
    <path d="M 15 11 L 46 29 L 31 33 L 21 48 Z" fill="#04020a" opacity="0.65" filter="url(#za-glass-shadow-demo)" />

    <!-- Solid Obsidian Base Underlay (Guarantees 100% visibility even if SVG gradient/filter references fail in host page) -->
    <path d="M 14 8 L 46 27 L 30 31 L 20 46 Z" 
          fill="#140f26" 
          stroke="#c4b5fd" 
          stroke-width="2.6" 
          stroke-linejoin="round" 
          stroke-linecap="round" />

    <!-- Main Dark Glass Arrowhead Body (Liquid Obsidian Gradient & Lavender Rim) -->
    <path d="M 14 8 L 46 27 L 30 31 L 20 46 Z" 
          fill="url(#za-glass-body-demo)" 
          stroke="url(#za-glass-rim-demo)" 
          stroke-width="2.6" 
          stroke-linejoin="round" 
          stroke-linecap="round" />

    <!-- Liquid Glass Internal Refraction Sheen Facet -->
    <path d="M 15 10 L 22 41 L 28 33 L 21 13 Z" fill="rgba(196, 181, 253, 0.35)" />
    <path d="M 15 10 L 22 41 L 28 33 L 21 13 Z" fill="url(#za-glass-sheen-demo)" />

    <!-- Top-Left Leading Edge Specular Highlight & Glint -->
    <path d="M 14.5 9.5 L 18 23" 
          stroke="#ffffff" 
          stroke-width="1.8" 
          stroke-linecap="round" 
          opacity="0.95" />
    <circle cx="14" cy="8.5" r="1.3" fill="#ffffff" />


    <!-- Dynamic Interactive State Overlays -->
    <g class="za-state-typing" style="display: none;">
      <line x1="53" y1="16" x2="61" y2="16" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round" />
      <line x1="57" y1="16" x2="57" y2="44" stroke="#e0e7ff" stroke-width="2.2" stroke-linecap="round" />
      <line x1="53" y1="44" x2="61" y2="44" stroke="#c4b5fd" stroke-width="2" stroke-linecap="round" />
    </g>

    <g class="za-state-sparkles" style="display: none;">
      <path d="M 52 14 Q 52 18 56 18 Q 52 18 52 22 Q 52 18 48 18 Q 52 18 52 14 Z" fill="#e0e7ff" />
      <path d="M 58 24 Q 58 26.5 60.5 26.5 Q 58 26.5 58 29 Q 58 26.5 55.5 26.5 Q 58 26.5 58 24 Z" fill="#c4b5fd" />
      <path d="M 46 25 Q 46 27 48 27 Q 46 27 46 29 Q 46 27 44 27 Q 46 27 46 25 Z" fill="#a78bfa" />
    </g>

    <g class="za-state-success" style="display: none;">
      <circle cx="53" cy="18" r="7.5" fill="#140f29" stroke="#c4b5fd" stroke-width="1.8" />
      <path d="M 49.5 18 L 52 20.5 L 56.5 15.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </g>

    <g class="za-state-error" style="display: none;">
      <circle cx="53" cy="18" r="7.5" fill="#2d0b14" stroke="#f43f5e" stroke-width="1.8" />
      <line x1="50" y1="15" x2="56" y2="21" stroke="#fda4af" stroke-width="1.8" stroke-linecap="round" />
      <line x1="56" y1="15" x2="50" y2="21" stroke="#fda4af" stroke-width="1.8" stroke-linecap="round" />
    </g>

    <g class="za-state-drag" style="display: none;">
      <rect x="47" y="14" width="16" height="20" rx="3" fill="rgba(24, 18, 44, 0.85)" stroke="#c4b5fd" stroke-width="1.5" />
      <line x1="51" y1="19" x2="59" y2="19" stroke="#a78bfa" stroke-width="1.2" stroke-linecap="round" />
      <line x1="51" y1="23" x2="57" y2="23" stroke="#a78bfa" stroke-width="1.2" stroke-linecap="round" />
      <circle cx="61" cy="32" r="4.5" fill="#7c3aed" stroke="#ffffff" stroke-width="1" />
      <line x1="61" y1="29.5" x2="61" y2="34.5" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
      <line x1="58.5" y1="32" x2="63.5" y2="32" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
    </g>

    <ellipse class="za-state-idle" cx="32" cy="38" rx="22" ry="7" fill="none" stroke="rgba(196, 181, 253, 0.35)" stroke-width="1.4" stroke-dasharray="3 3" transform="rotate(-15 32 38)" style="display: none;" />
  </svg>`;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(cursorSvg, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (svgEl && !doc.querySelector('parsererror')) {
      pointer.appendChild(document.importNode(svgEl, true));
    } else {
      pointer.insertAdjacentHTML('afterbegin', cursorSvg);
    }
  } catch(e) {
    try {
      pointer.insertAdjacentHTML('afterbegin', cursorSvg);
    } catch(_) {}
  }

  const badgeEl = document.createElement('div');
  badgeEl.className = 'za-cursor-badge';
  badgeEl.id = 'za-active-badge';
  badgeEl.style.display = 'none';
  pointer.appendChild(badgeEl);

  container.appendChild(pointer);
  root.appendChild(container);
  
  function safeMount() {
    const mountParent = document.body || document.documentElement;
    if (mountParent && !document.getElementById('zeroapply-codex-cursor-root')) {
      mountParent.appendChild(root);
    }
  }
  safeMount();
  if (!document.body && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeMount, { once: true });
  }

  let curX = 450;
  let curY = 220;
  let animId = null;

  function setCursorMode(mode) {
    if (!pointer) return;
    const typing = pointer.querySelector('.za-state-typing');
    const sparkles = pointer.querySelector('.za-state-sparkles');
    const success = pointer.querySelector('.za-state-success');
    const error = pointer.querySelector('.za-state-error');
    const drag = pointer.querySelector('.za-state-drag');
    const idle = pointer.querySelector('.za-state-idle');

    if (typing) typing.style.display = mode === 'typing' ? 'block' : 'none';
    if (sparkles) sparkles.style.display = (mode === 'agent' || mode === 'ai') ? 'block' : 'none';
    if (success) success.style.display = mode === 'success' ? 'block' : 'none';
    if (error) error.style.display = mode === 'error' ? 'block' : 'none';
    if (drag) drag.style.display = (mode === 'drag' || mode === 'upload') ? 'block' : 'none';
    if (idle) idle.style.display = mode === 'idle' ? 'block' : 'none';

    if (mode === 'hover') {
      pointer.classList.add('za-cursor-hover');
    } else {
      pointer.classList.remove('za-cursor-hover');
    }

    if (mode === 'error') {
      pointer.classList.add('za-cursor-error');
    } else {
      pointer.classList.remove('za-cursor-error');
    }
  }

  function createMotionGhost(x, y) {
    const g = document.createElement('div');
    g.className = 'za-motion-ghost';
    g.style.left = x + 'px';
    g.style.top = y + 'px';
    const svgNode = pointer.querySelector('svg');
    if (svgNode) {
      g.appendChild(svgNode.cloneNode(true));
    }
    root.appendChild(g);
    setTimeout(() => g.remove(), 280);
  }

  function createTrail(x, y) {
    const t = document.createElement('div');
    t.className = 'za-cursor-trail';
    t.style.left = (x + 14) + 'px';
    t.style.top = (y + 8) + 'px';
    root.appendChild(t);
    setTimeout(() => t.remove(), 380);
  }

  // Smooth Bezier trajectory movement with floating arc and motion follow
  function curveGlide(targetX, targetY, badge, durationMs = 380, callback) {
    if (animId) cancelAnimationFrame(animId);

    const startX = curX;
    const startY = curY;
    const startTime = performance.now();

    const badgeElement = document.getElementById('za-active-badge');
    if (badgeElement) {
      while (badgeElement.firstChild) badgeElement.removeChild(badgeElement.firstChild);
      if (badge) {
        const cleanText = String(badge).replace(/^✦\s*/, '');
        const sp = document.createElement('span');
        sp.className = 'za-cursor-sparkle';
        sp.textContent = '✦';
        badgeElement.appendChild(sp);
        badgeElement.appendChild(document.createTextNode(' ' + cleanText));
        badgeElement.style.display = 'flex';
      } else {
        badgeElement.style.display = 'none';
      }
    }

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Perpendicular Bezier arc offset so the cursor curves naturally across the screen
    const arcHeight = Math.min(Math.max(dist * 0.22, 25), 85);
    const sign = dx > 0 ? -1 : 1;
    const ctrlX = (startX + targetX) / 2 + (-dy / (dist || 1)) * arcHeight * sign;
    const ctrlY = (startY + targetY) / 2 + (dx / (dist || 1)) * arcHeight * sign - 15;

    let lastTrailTime = 0;
    let lastGhostTime = 0;

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

      const inv = 1 - ease;
      const x = inv * inv * startX + 2 * inv * ease * ctrlX + ease * ease * targetX;
      const y = inv * inv * startY + 2 * inv * ease * ctrlY + ease * ease * targetY;

      curX = x;
      curY = y;
      container.style.left = x + 'px';
      container.style.top = y + 'px';

      if (now - lastTrailTime > 45 && progress < 0.95) {
        createTrail(x, y);
        lastTrailTime = now;
      }

      if (now - lastGhostTime > 55 && progress > 0.08 && progress < 0.92) {
        createMotionGhost(x, y);
        lastGhostTime = now;
      }

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        animId = null;
        curX = targetX;
        curY = targetY;
        container.style.left = targetX + 'px';
        container.style.top = targetY + 'px';
        if (typeof callback === 'function') callback();
      }
    }

    animId = requestAnimationFrame(step);
  }

  function ripple(x, y) {
    const r1 = document.createElement('div');
    r1.className = 'za-click-ripple';
    r1.style.left = (x + 14) + 'px';
    r1.style.top = (y + 8) + 'px';
    root.appendChild(r1);

    const r2 = document.createElement('div');
    r2.className = 'za-click-ripple za-click-ripple-pulse';
    r2.style.left = (x + 14) + 'px';
    r2.style.top = (y + 8) + 'px';
    setTimeout(() => root.appendChild(r2), 70);

    pointer.classList.add('za-cursor-bounce');
    setTimeout(() => pointer.classList.remove('za-cursor-bounce'), 220);
    setTimeout(() => r1.remove(), 540);
    setTimeout(() => r2.remove(), 610);
  }

  function ensureDomAttached() {
    let r = document.getElementById('zeroapply-codex-cursor-root');
    const targetParent = document.body || document.documentElement;
    if (!r) {
      if (targetParent) targetParent.appendChild(root);
    } else if (targetParent && r.parentElement !== targetParent) {
      targetParent.appendChild(r);
    }
    root.style.display = 'block';
    container.style.display = 'block';
    container.style.opacity = '1';
    pointer.style.display = 'block';
    pointer.style.opacity = '1';
  }

  function findCursorTarget(sel) {
    if (!sel) return null;

    // Check active modal first
    const activeModal = Array.from(document.querySelectorAll(
      '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, [role="dialog"][aria-modal="true"], [role="dialog"], .artdeco-modal'
    )).find(m => m && (m.style ? m.style.display !== 'none' : true) && !m.hidden && m.getBoundingClientRect().width > 80 && m.getBoundingClientRect().height > 80);

    // 1. Try comma-separated parts
    const parts = typeof sel === 'string' ? sel.split(',').map(s => s.trim()).filter(Boolean) : [sel];
    for (const part of parts) {
      try {
        const inModal = activeModal ? activeModal.querySelector(part) : null;
        if (inModal && inModal.getBoundingClientRect().width > 0) return inModal;
        const inDoc = document.querySelector(part);
        if (inDoc && inDoc.getBoundingClientRect().width > 0) return inDoc;
      } catch(e) {}
    }

    // 2. Direct selector
    try {
      const el = (activeModal ? activeModal.querySelector(sel) : null) || document.querySelector(sel);
      if (el) return el;
    } catch (e) {}

    // 3. ID match fallback
    if (typeof sel === 'string' && sel.startsWith('#')) {
      const rawId = sel.slice(1);
      const byId = document.getElementById(rawId);
      if (byId) return byId;
    }

    // 4. Smart keyword resolution for Apply buttons
    if (typeof sel === 'string' && /apply|easy/i.test(sel)) {
      const applySelectors = [
        'button.jobs-apply-button',
        'button[aria-label*="Easy Apply" i]',
        'button[aria-label*="Apply" i]',
        'button#main-easy-apply-btn',
        'a.jobs-apply-button',
        '.jobs-s-apply button',
        'button[data-za-apply-btn]',
        '[data-control-name*="apply" i]',
        '[data-qa="btn-apply"]',
        '[data-automation-id*="apply" i]',
        '.jobs-apply-button--top-card button'
      ];
      for (const as of applySelectors) {
        try {
          const match = document.querySelector(as);
          if (match && match.getBoundingClientRect().width > 0) return match;
        } catch(e) {}
      }

      const allBtns = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      const textMatch = allBtns.find(b => {
        const t = (b.textContent || b.getAttribute('aria-label') || '').trim();
        return /Easy Apply|Apply Now|^Apply$/i.test(t);
      });
      if (textMatch) return textMatch;
    }

    // 5. Smart keyword resolution for Next / Submit / Review / Continue
    if (typeof sel === 'string' && /submit|next|review|continue|done/i.test(sel)) {
      const navSelectors = [
        'button[data-za-step-btn="true"]',
        'button[aria-label*="Submit" i]',
        'button[aria-label*="Review" i]',
        'button[aria-label*="Next" i]',
        'button[aria-label*="Continue" i]',
        'footer button.artdeco-button--primary',
        '.artdeco-modal__actionbar button.artdeco-button--primary',
        'button[data-easy-apply-next-button]',
        'button[data-easy-apply-submit-button]'
      ];
      for (const ns of navSelectors) {
        try {
          const match = (activeModal ? activeModal.querySelector(ns) : null) || document.querySelector(ns);
          if (match && match.getBoundingClientRect().width > 0) return match;
        } catch(e) {}
      }

      const allModalBtns = Array.from((activeModal || document).querySelectorAll('button, [role="button"]'));
      const navTextMatch = allModalBtns.find(b => {
        const t = (b.textContent || b.getAttribute('aria-label') || '').trim();
        return /Submit application|Submit|Next|Review|Continue|Done/i.test(t);
      });
      if (navTextMatch) return navTextMatch;
    }

    return null;
  }

  window.__zeroapplyCursor = {
    setMode: (mode) => {
      setCursorMode(mode);
      return true;
    },
    glideTo: (x, y, badge, duration) => {
      ensureDomAttached();
      const dist = Math.hypot(x - curX, y - curY);
      const naturalDuration = duration || Math.min(Math.max(Math.round(380 + Math.sqrt(dist) * 11), 420), 750);
      curveGlide(x, y, badge, naturalDuration);
      return true;
    },
    glideToElement: (selector, badge, duration) => {
      ensureDomAttached();
      const el = findCursorTarget(selector);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const targetX = Math.min(Math.max(rect.left + rect.width / 2 - 14, 20), (window.innerWidth || 1200) - 70);
      const targetY = Math.min(Math.max(rect.top + rect.height / 2 - 8, 20), (window.innerHeight || 800) - 70);
      const dist = Math.hypot(targetX - curX, targetY - curY);
      const naturalDuration = duration || Math.min(Math.max(Math.round(380 + Math.sqrt(dist) * 11), 420), 750);
      curveGlide(targetX, targetY, badge || 'Inspect', naturalDuration);
      return true;
    },
    clickAt: (x, y, badge) => {
      ensureDomAttached();
      const dist = Math.hypot(x - curX, y - curY);
      const naturalDuration = Math.min(Math.max(Math.round(360 + Math.sqrt(dist) * 10), 380), 700);
      return new Promise((resolve) => {
        curveGlide(x, y, badge, naturalDuration, () => {
          setTimeout(() => {
            ripple(x, y);
            setTimeout(resolve, 150);
          }, 80);
        });
      });
    },
    clickElement: (selector, badge) => {
      ensureDomAttached();
      const el = findCursorTarget(selector);
      if (el) {
        try { if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' }); } catch(e) {}
      }
      const rect = el ? el.getBoundingClientRect() : null;
      const targetX = rect && rect.width > 0
        ? Math.min(Math.max(rect.left + rect.width / 2 - 14, 20), (window.innerWidth || 1200) - 70)
        : Math.min(Math.max(curX, 40), (window.innerWidth || 1200) - 70);
      const targetY = rect && rect.height > 0
        ? Math.min(Math.max(rect.top + rect.height / 2 - 14, 20), (window.innerHeight || 800) - 70)
        : Math.min(Math.max(curY, 40), (window.innerHeight || 800) - 70);
      const dist = Math.hypot(targetX - curX, targetY - curY);
      const naturalDuration = Math.min(Math.max(Math.round(380 + Math.sqrt(dist) * 10), 400), 720);

      return new Promise((resolve) => {
        curveGlide(targetX, targetY, badge || 'Click', naturalDuration, () => {
          setCursorMode('hover');
          setTimeout(() => {
            setCursorMode('default');
            ripple(targetX, targetY);
            if (el) {
              try { if (typeof el.focus === 'function') el.focus(); } catch(e) {}
              el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
              el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
              try {
                if (typeof el.click === 'function') {
                  el.click();
                } else {
                  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                }
              } catch(e) {}
            }
            setTimeout(() => {
              const b = document.getElementById('za-active-badge');
              if (b && b.textContent && b.textContent.includes('Click')) {
                b.style.display = 'none';
              }
              resolve(true);
            }, 180);
          }, 90);
        });
      });
    },
    verifyElement: (selector, badge) => {
      ensureDomAttached();
      const el = findCursorTarget(selector);
      if (el) {
        try { if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' }); } catch(e) {}
      }
      const rect = el ? el.getBoundingClientRect() : null;
      const targetX = rect && rect.width > 0
        ? Math.min(Math.max(rect.left + rect.width / 2, 20), (window.innerWidth || 1200) - 70)
        : Math.min(Math.max(curX, 40), (window.innerWidth || 1200) - 70);
      const targetY = rect && rect.height > 0
        ? Math.min(Math.max(rect.top + rect.height / 2, 20), (window.innerHeight || 800) - 70)
        : Math.min(Math.max(curY, 40), (window.innerHeight || 800) - 70);
      const dist = Math.hypot(targetX - curX, targetY - curY);
      const naturalDuration = Math.min(Math.max(Math.round(360 + Math.sqrt(dist) * 9), 380), 650);

      return new Promise((resolve) => {
        curveGlide(targetX, targetY, badge || 'Verified ✓', naturalDuration, () => {
          setCursorMode('success');
          if (el) el.classList.add('za-verified-highlight');
          setTimeout(() => {
            if (el) el.classList.remove('za-verified-highlight');
            setTimeout(() => setCursorMode('default'), 400);
            resolve(true);
          }, 400);
        });
      });
    },
    typeElement: (selector, text, badge) => {
      ensureDomAttached();
      const el = findCursorTarget(selector);
      if (el) {
        try { if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' }); } catch(e) {}
      }
      const rect = el ? el.getBoundingClientRect() : null;
      const targetX = rect && rect.width > 0
        ? Math.min(Math.max(rect.left + 15, 20), (window.innerWidth || 1200) - 70)
        : Math.min(Math.max(curX, 40), (window.innerWidth || 1200) - 70);
      const targetY = rect && rect.height > 0
        ? Math.min(Math.max(rect.top + rect.height / 2 - 6, 20), (window.innerHeight || 800) - 70)
        : Math.min(Math.max(curY, 40), (window.innerHeight || 800) - 70);
      const dist = Math.hypot(targetX - curX, targetY - curY);
      const naturalDuration = Math.min(Math.max(Math.round(380 + Math.sqrt(dist) * 10), 400), 720);

      return new Promise((resolve) => {
        curveGlide(targetX, targetY, badge || 'Typing...', naturalDuration, () => {
          setCursorMode('typing');
          ripple(targetX, targetY);
          if (!el) {
            setTimeout(() => {
              setCursorMode('default');
              resolve(true);
            }, 250);
            return;
          }
          try { el.focus(); } catch(e) {}

          const fullText = String(text || '');
          if (!fullText) {
            setCursorMode('default');
            resolve(true);
            return;
          }

          const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
          const setVal = (v) => {
            if (el.tagName === 'TEXTAREA' && nativeTextareaSetter) {
              nativeTextareaSetter.call(el, v);
            } else if (nativeInputSetter) {
              nativeInputSetter.call(el, v);
            } else {
              el.value = v;
            }
          };

          setVal('');
          el.dispatchEvent(new Event('input', { bubbles: true }));

          let charIdx = 0;
          let currentStr = '';

          setTimeout(() => {
            function typeNextChar() {
              if (charIdx >= fullText.length) {
                el.dispatchEvent(new Event('change', { bubbles: true }));
                setTimeout(() => {
                  setCursorMode('default');
                  resolve(true);
                }, 220);
                return;
              }

              const char = fullText[charIdx];
              currentStr += char;
              setVal(currentStr);

              el.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));

              charIdx++;

              let delay = 45 + Math.random() * 40;
              if (char === ' ' || char === ',' || char === '.') {
                delay += 80 + Math.random() * 70;
              }

              setTimeout(typeNextChar, delay);
            }

            typeNextChar();
          }, 180);
        });
      });
    },
    selectElement: (selector, val, badge) => {
      ensureDomAttached();
      const el = findCursorTarget(selector);
      if (el) {
        try { if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' }); } catch(e) {}
      }
      const rect = el ? el.getBoundingClientRect() : null;
      const targetX = rect && rect.width > 0
        ? Math.min(Math.max(rect.left + rect.width / 2 - 8, 20), (window.innerWidth || 1200) - 70)
        : Math.min(Math.max(curX, 40), (window.innerWidth || 1200) - 70);
      const targetY = rect && rect.height > 0
        ? Math.min(Math.max(rect.top + rect.height / 2 - 6, 20), (window.innerHeight || 800) - 70)
        : Math.min(Math.max(curY, 40), (window.innerHeight || 800) - 70);
      const dist = Math.hypot(targetX - curX, targetY - curY);
      const naturalDuration = Math.min(Math.max(Math.round(380 + Math.sqrt(dist) * 10), 400), 720);

      return new Promise((resolve) => {
        curveGlide(targetX, targetY, badge || 'Select', naturalDuration, () => {
          setCursorMode('hover');
          ripple(targetX, targetY);
          if (el) {
            try { el.focus(); } catch(e) {}
            setTimeout(() => {
              setCursorMode('default');
              el.value = val;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              setTimeout(() => resolve(true), 180);
            }, 280);
          } else {
            setTimeout(() => {
              setCursorMode('default');
              resolve(true);
            }, 200);
          }
        });
      });
    },
    uploadElement: (selector, fileName, badge) => {
      ensureDomAttached();
      const el = findCursorTarget(selector);
      if (el) {
        try { if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' }); } catch(e) {}
      }
      const rect = el ? el.getBoundingClientRect() : null;
      const targetX = rect && rect.width > 0
        ? Math.min(Math.max(rect.left + rect.width / 2 - 8, 20), (window.innerWidth || 1200) - 70)
        : Math.min(Math.max(curX, 40), (window.innerWidth || 1200) - 70);
      const targetY = rect && rect.height > 0
        ? Math.min(Math.max(rect.top + rect.height / 2 - 6, 20), (window.innerHeight || 800) - 70)
        : Math.min(Math.max(curY, 40), (window.innerHeight || 800) - 70);
      const dist = Math.hypot(targetX - curX, targetY - curY);
      const naturalDuration = Math.min(Math.max(Math.round(380 + Math.sqrt(dist) * 10), 400), 720);

      return new Promise((resolve) => {
        setCursorMode('upload');
        curveGlide(targetX, targetY, badge || 'Upload', naturalDuration, () => {
          ripple(targetX, targetY);
          setCursorMode('success');
          setTimeout(() => {
            setCursorMode('default');
            resolve(true);
          }, 450);
        });
      });
    },
    scrollPage: (deltaY, badge) => {
      const scrollBadge = badge || (deltaY > 0 ? 'AI: Scrolling Down ↓' : 'AI: Scrolling Up ↑');
      const badgeElement = document.getElementById('za-active-badge');
      if (badgeElement) {
        badgeElement.textContent = scrollBadge;
        badgeElement.style.display = 'block';
      }
      return new Promise((resolve) => {
        const startY = window.scrollY || window.pageYOffset || 0;
        const targetY = Math.max(0, startY + deltaY);
        const duration = Math.min(Math.max(Math.abs(deltaY) * 0.7, 250), 650);
        const startTime = performance.now();

        function step(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;
          const currentY = startY + (targetY - startY) * easeProgress;
          window.scrollTo(0, currentY);
          window.dispatchEvent(new WheelEvent('wheel', { deltaY: (deltaY / duration) * 16, bubbles: true }));

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            window.scrollTo(0, targetY);
            setTimeout(() => {
              if (badgeElement) badgeElement.style.display = 'none';
              resolve(true);
            }, 100);
          }
        }
        requestAnimationFrame(step);
      });
    },
    scrollContainer: (selector, deltaY, badge) => {
      const containerElement = findCursorTarget(selector);
      if (!containerElement) return Promise.resolve(false);
      const scrollBadge = badge || (deltaY > 0 ? 'AI: Scrolling Down ↓' : 'AI: Scrolling Up ↑');
      const badgeElement = document.getElementById('za-active-badge');
      if (badgeElement) {
        badgeElement.textContent = scrollBadge;
        badgeElement.style.display = 'block';
      }
      return new Promise((resolve) => {
        const startY = containerElement.scrollTop || 0;
        const targetY = Math.max(0, startY + deltaY);
        const duration = Math.min(Math.max(Math.abs(deltaY) * 0.7, 250), 650);
        const startTime = performance.now();

        function step(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;
          const currentY = startY + (targetY - startY) * easeProgress;
          containerElement.scrollTop = currentY;
          containerElement.dispatchEvent(new WheelEvent('wheel', { deltaY: (deltaY / duration) * 16, bubbles: true }));

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            containerElement.scrollTop = targetY;
            setTimeout(() => {
              if (badgeElement) badgeElement.style.display = 'none';
              resolve(true);
            }, 100);
          }
        }
        requestAnimationFrame(step);
      });
    },
    scrollElementIntoView: (selector, badge) => {
      const el = findCursorTarget(selector);
      if (!el) return Promise.resolve(false);
      const scrollBadge = badge || 'AI: Viewing Field';
      const badgeElement = document.getElementById('za-active-badge');
      if (badgeElement) {
        badgeElement.textContent = scrollBadge;
        badgeElement.style.display = 'block';
      }
      try {
        if (typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
      } catch(e) {}
      return new Promise((resolve) => {
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          if (window.__zeroapplyCursor && typeof window.__zeroapplyCursor.glideTo === 'function') {
            window.__zeroapplyCursor.glideTo(rect.left + rect.width / 2, rect.top + rect.height / 2, scrollBadge);
          }
          setTimeout(() => {
            if (badgeElement) badgeElement.style.display = 'none';
            resolve(true);
          }, 200);
        }, 250);
      });
    },
    dismiss: () => {
      const b = document.getElementById('za-active-badge');
      if (b) b.style.display = 'none';
      return true;
    }
  };

  console.log('✨ ZeroApply Dark Glass Visual Cursor initialized.');
})();
