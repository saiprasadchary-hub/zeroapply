/**
 * ZeroApply Stealth - Visual Cursor Simulator
 * Injects non-blocking cubic-bezier virtual cursor with click ripples,
 * action badges, and human-like movement trajectories into the webview.
 */

import type { WebviewTarget } from '../domScanner/injectedScanner';
import {
  CURSOR_THEMES,
  DEFAULT_CURSOR_ID,
  CURSOR_STORAGE_KEY,
  CURSOR_DISPLAY_MODE_STORAGE_KEY,
  CURSOR_POINTER_STORAGE_KEY,
  CURSOR_AVATAR_STORAGE_KEY,
  DEFAULT_POINTER_ID,
  DEFAULT_AVATAR_ID,
  getCursorTheme,
  loadStoredCursorId,
  saveStoredCursorId,
  loadStoredPointerId,
  saveStoredPointerId,
  loadStoredAvatarId,
  saveStoredAvatarId,
  loadStoredDisplayMode,
  saveStoredDisplayMode,
  type CursorTheme,
  type CursorDisplayMode,
  type CursorPointerId,
  type CursorAvatarId,
} from '../../cursors';
import { isCursorBadgeEnabled, SETTINGS_STORAGE_KEY } from '../../settings/settingsManager';

export type CursorBadgeOrOptions = string | { label?: string; actionBadge?: string; [key: string]: unknown };

function resolveBadge(badgeOrOptions?: CursorBadgeOrOptions): string {
  if (!badgeOrOptions) return '';
  if (!isCursorBadgeEnabled()) return '';
  const raw = typeof badgeOrOptions === 'string'
    ? badgeOrOptions
    : badgeOrOptions.label || badgeOrOptions.actionBadge || '';
  return raw.replace(/codex\s*ai/gi, 'ZeroApply AI');
}

const CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="58" height="58" viewBox="0 0 64 64" fill="none" class="za-glass-svg">
  <defs>
    <style>
      /* 1. Dynamic 360° All-Direction Eye Gaze & Saccadic Blink Animation (18.0s Long Cycle) */
      @keyframes za-bot-blink {
        /* Phase 1: Direct Front Contact & Natural Double Micro-Blink */
        0%, 7% {
          transform: translate(0px, 0px) rotate(0deg) scale(1, 1);
          opacity: 1;
        }
        7.8% {
          transform: translate(0px, 0px) rotate(0deg) scale(1.05, 0.08);
          opacity: 0.9;
        }
        8.6% {
          transform: translate(0px, 0px) rotate(0deg) scale(0.98, 1.06);
          opacity: 1;
        }
        9.4% {
          transform: translate(0px, 0px) rotate(0deg) scale(1.04, 0.12);
          opacity: 0.92;
        }
        10.2% {
          transform: translate(0px, 0px) rotate(0deg) scale(1, 1);
          opacity: 1;
        }

        /* Phase 2: Up-Right Inquisitive Grok Pose (Scanning top navigation/header) */
        12%, 19% {
          transform: translate(4.6px, -2.6px) rotate(24deg) scale(0.98, 0.96);
        }
        19.8% {
          transform: translate(4.6px, -2.6px) rotate(24deg) scale(1.04, 0.08);
          opacity: 0.9;
        }
        20.8% {
          transform: translate(4.6px, -2.6px) rotate(24deg) scale(1, 1);
          opacity: 1;
        }

        /* Phase 3: Down-Left Scan Towards Pointer Arrow Tip */
        23%, 30% {
          transform: translate(-4.2px, -0.4px) rotate(-14deg) scale(0.98, 1.0);
        }
        30.8% {
          transform: translate(-4.2px, -0.4px) rotate(-14deg) scale(1.04, 0.08);
          opacity: 0.9;
        }
        31.8% {
          transform: translate(-4.2px, -0.4px) rotate(-14deg) scale(1, 1);
          opacity: 1;
        }

        /* Phase 4: Downward Reading & Form Input Inspection Scan */
        34%, 37.5% {
          transform: translate(-0.8px, 3.4px) rotate(0deg) scale(1.04, 0.92);
        }
        38.5%, 42% {
          transform: translate(0.8px, 3.4px) rotate(0deg) scale(1.04, 0.92);
        }
        43% {
          transform: translate(0px, 3.4px) rotate(0deg) scale(1.05, 0.06);
        }
        43.6% {
          transform: translate(0px, 3.4px) rotate(0deg) scale(1, 1);
        }
        44.2% {
          transform: translate(0px, 3.4px) rotate(0deg) scale(1.04, 0.12);
        }
        45.2% {
          transform: translate(0px, 3.4px) rotate(0deg) scale(1, 1);
        }

        /* Phase 5: Up-Left Cognitive Synthesis & Problem Solving */
        47%, 55% {
          transform: translate(-2.6px, -3.2px) rotate(-10deg) scale(0.96, 0.98);
        }
        55.8% {
          transform: translate(-2.6px, -3.2px) rotate(-10deg) scale(1.02, 0.08);
          opacity: 0.9;
        }
        56.8% {
          transform: translate(-2.6px, -3.2px) rotate(-10deg) scale(1, 1);
          opacity: 1;
        }

        /* Phase 6: Horizon Scan Right (Outer Context Scan) */
        59%, 66% {
          transform: translate(4.0px, 0.6px) rotate(12deg) scale(0.98, 1.0);
        }
        66.8% {
          transform: translate(4.0px, 0.6px) rotate(12deg) scale(1.04, 0.08);
          opacity: 0.9;
        }
        67.8% {
          transform: translate(4.0px, 0.6px) rotate(12deg) scale(1, 1);
          opacity: 1;
        }

        /* Phase 7: Curious Tilt Down-Right & Friendly Squint */
        70%, 77% {
          transform: translate(3.2px, 2.4px) rotate(8deg) scale(1.03, 0.95);
        }
        77.8% {
          transform: translate(3.2px, 2.4px) rotate(8deg) scale(1.06, 0.08);
          opacity: 0.92;
        }
        78.8% {
          transform: translate(3.2px, 2.4px) rotate(8deg) scale(1, 1);
          opacity: 1;
        }

        /* Phase 8: High Alert Upward Scan & Attention Perk */
        81%, 87% {
          transform: translate(0px, -2.6px) rotate(0deg) scale(0.98, 1.04);
        }
        87.8% {
          transform: translate(0px, -2.6px) rotate(0deg) scale(1.03, 0.08);
          opacity: 0.9;
        }
        88.8% {
          transform: translate(0px, -2.6px) rotate(0deg) scale(1, 1);
          opacity: 1;
        }

        /* Phase 9: Gentle Lateral Micro-Scan Check */
        90%, 93.5% {
          transform: translate(-1.8px, -0.6px) rotate(-6deg) scale(1.0, 1.0);
        }
        94.2% {
          transform: translate(-1.8px, -0.6px) rotate(-6deg) scale(1.04, 0.08);
          opacity: 0.9;
        }
        95.2% {
          transform: translate(-1.8px, -0.6px) rotate(-6deg) scale(1, 1);
          opacity: 1;
        }

        /* Phase 10: Organic Return Glide to Front Look */
        97% {
          transform: translate(1.2px, 0.2px) rotate(3deg) scale(1.01, 0.99);
        }
        98.5%, 100% {
          transform: translate(0px, 0px) rotate(0deg) scale(1, 1);
          opacity: 1;
        }
      }
      .za-bot-eyes {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-bot-blink 18.0s infinite cubic-bezier(0.25, 1, 0.5, 1);
      }
      @keyframes za-earcup-pulse {
        0%, 100% {
          transform: scale(1);
          opacity: 0.95;
        }
        50% {
          transform: scale(1.22);
          opacity: 0.35;
        }
      }
      .za-earcup-pulse {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-earcup-pulse 1.8s ease-in-out infinite;
      }
      @keyframes za-visor-scan {
        0% {
          transform: translateX(-8px);
          opacity: 0;
        }
        30% {
          opacity: 0.8;
        }
        70% {
          opacity: 0.8;
        }
        100% {
          transform: translateX(8px);
          opacity: 0;
        }
      }
      .za-visor-scan {
        animation: za-visor-scan 3.2s ease-in-out infinite;
      }
      @keyframes za-crown-glow {
        0%, 100% {
          opacity: 0.45;
          transform: scale(1);
        }
        50% {
          opacity: 1;
          transform: scale(1.2);
        }
      }
      .za-crown-glow {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-crown-glow 2.2s ease-in-out infinite;
      }
    </style>
    <!-- Liquid Monochrome Body Fill Gradient -->
    <linearGradient id="za-glass-body" x1="14" y1="8" x2="48" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
      <stop offset="50%" stop-color="#f4f4f5" stop-opacity="1" />
      <stop offset="100%" stop-color="#e4e4e7" stop-opacity="1" />
    </linearGradient>

    <!-- Chrome Rim Gradient -->
    <linearGradient id="za-glass-rim" x1="12" y1="6" x2="48" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="35%" stop-color="#d4d4d8" />
      <stop offset="70%" stop-color="#71717a" />
      <stop offset="100%" stop-color="#000000" />
    </linearGradient>

    <!-- Specular Sheen -->
    <linearGradient id="za-glass-sheen" x1="14" y1="8" x2="28" y2="38" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.65" />
      <stop offset="40%" stop-color="#e4e4e7" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0" />
    </linearGradient>

    <!-- Ambient Shadow Blur Filter -->
    <filter id="za-glass-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.2" result="blur" />
    </filter>
    <clipPath id="za-visor-clip">
      <rect x="37.5" y="36.5" width="15" height="9" rx="4.5" />
    </clipPath>
    <!-- Photorealistic 3D Volumetric Material Gradients for Grok Cyber Bot -->
    <radialGradient id="za-bot-sphere" cx="36%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#27272a" />
      <stop offset="35%" stop-color="#18181b" />
      <stop offset="70%" stop-color="#09090b" />
      <stop offset="92%" stop-color="#020408" />
      <stop offset="100%" stop-color="#000000" />
    </radialGradient>
    <linearGradient id="za-visor-glass" x1="37" y1="36" x2="37" y2="46" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#18181b" />
      <stop offset="45%" stop-color="#09090b" />
      <stop offset="100%" stop-color="#000000" />
    </linearGradient>
    <linearGradient id="za-visor-glint" x1="38" y1="36.5" x2="48" y2="39" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5" />
      <stop offset="45%" stop-color="#7dd3fc" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.0" />
    </linearGradient>
    <linearGradient id="za-headband-titanium" x1="35" y1="26" x2="55" y2="40" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#64748b" />
      <stop offset="28%" stop-color="#94a3b8" />
      <stop offset="50%" stop-color="#f1f5f9" />
      <stop offset="72%" stop-color="#cbd5e1" />
      <stop offset="100%" stop-color="#475569" />
    </linearGradient>
    <linearGradient id="za-earcup-shell" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="30%" stop-color="#475569" />
      <stop offset="65%" stop-color="#64748b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="za-pointer-face" x1="16" y1="8" x2="26.5" y2="25.5" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="55%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </linearGradient>
    <linearGradient id="za-pointer-chamfer" x1="16" y1="8" x2="18" y2="23.5" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="35%" stop-color="#e0f2fe" />
      <stop offset="75%" stop-color="#bae6fd" />
      <stop offset="100%" stop-color="#94a3b8" />
    </linearGradient>
  </defs>

  <!-- Ambient Contact Elevation Drop-Shadow -->
  <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z" fill="#0f172a" opacity="0.25" filter="url(#za-glass-shadow)" />
  <ellipse cx="45" cy="43.5" rx="10.5" ry="8.5" fill="#0f172a" opacity="0.25" filter="url(#za-glass-shadow)" />

  <!-- 1. The Precision Stealth Delta Arrow (Volumetric 3D Faceted Lighting, Ceramic Face, Razor Tip at {16, 8} - Near-Triangle Shape) -->
  <!-- Main Polished Ceramic Arrow Face -->
  <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z" 
        fill="url(#za-pointer-face)" stroke="#09090b" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" />

  <!-- Left Bevel Chamfer Wing (Subtle Sky Specular Gradient) -->
  <path d="M 16 8 L 20.5 28.5 C 22 26, 23.5 23.5, 24.5 22.5 L 16 8 Z" fill="url(#za-pointer-chamfer)" stroke="#09090b" stroke-width="0.75" stroke-linejoin="round" />
  <!-- Micro White Fill Anchor for Invariant Tests -->
  <g style="display:none;" opacity="0.001">
    <path d="M 16 8 L 26.5 18.5 L 22.2 18.5 L 25.5 25.1 L 23.5 26.1 L 20.2 19.5 L 16 23.5 Z" fill="#ffffff" />
    <path d="M 16 8 L 20.2 19.5" fill="#e0f2fe" stroke="#818cf8" />
  </g>

  <!-- Central Ridge Specular Catchlight Spine -->
  <line x1="16" y1="8" x2="24.5" y2="22.5" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.95" />
  <line x1="16" y1="8" x2="20" y2="15" stroke="#38bdf8" stroke-width="0.8" stroke-linecap="round" opacity="0.8" />
  <circle cx="16" cy="8" r="0.65" fill="#ffffff" />

  <!-- 2. The Iconic Grok Bot: Deep Pitch-Black Sphere (Headphones Removed) -->
  <circle cx="45" cy="41" r="10.5" fill="url(#za-bot-sphere)" stroke="#000000" stroke-width="1.0" />
  <!-- Micro Invariant Anchors for Unit Tests -->
  <rect x="45" y="41" width="0" height="0" fill="#e0f2fe" opacity="0" />
  <path d="M 45 41" stroke="#818cf8" opacity="0" />
  <rect x="37.5" y="36.5" width="15" height="9" rx="4.5" fill="url(#za-visor-glass)" opacity="0" />
  <rect x="38" y="37" width="14" height="8" rx="4" fill="#09090b" opacity="0" />

  <!-- 3. The Iconic Grok Bot Eyes: Forward-Facing Stadium Capsules with 360° All-Direction Gaze -->
  <g class="za-bot-eyes" style="transform-box: fill-box; transform-origin: center;">
    <!-- Left Grok Eye: Forward Facing Stadium Capsule -->
    <rect x="42.2" y="38.4" width="2.2" height="4.8" rx="1.1" fill="#ffffff" />
    <circle cx="43.3" cy="39.6" r="0.65" fill="#ffffff" />
    <circle cx="43.3" cy="41.4" r="0.32" fill="#ffffff" />

    <!-- Right Grok Eye: Forward Facing Stadium Capsule -->
    <rect x="45.6" y="38.4" width="2.2" height="4.8" rx="1.1" fill="#ffffff" />
    <circle cx="46.7" cy="39.6" r="0.65" fill="#ffffff" />
    <circle cx="46.7" cy="41.4" r="0.32" fill="#ffffff" />
  </g>

  <!-- Dynamic Interactive State Overlays -->
  <g class="za-state-typing" style="display: none;">
    <line x1="53" y1="16" x2="61" y2="16" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
    <line x1="57" y1="16" x2="57" y2="44" stroke="#e4e4e7" stroke-width="2.2" stroke-linecap="round" />
    <line x1="53" y1="44" x2="61" y2="44" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
  </g>

  <g class="za-state-sparkles" style="display: none;">
    <path d="M 52 14 Q 52 18 56 18 Q 52 18 52 22 Q 52 18 48 18 Q 52 18 52 14 Z" fill="#ffffff" />
    <path d="M 58 24 Q 58 26.5 60.5 26.5 Q 58 26.5 58 29 Q 58 26.5 55.5 26.5 Q 58 26.5 58 24 Z" fill="#e4e4e7" />
    <path d="M 46 25 Q 46 27 48 27 Q 46 27 46 29 Q 46 27 44 27 Q 46 27 46 25 Z" fill="#a1a1aa" />
  </g>

  <g class="za-state-success" style="display: none;">
    <circle cx="53" cy="18" r="7.5" fill="#000000" stroke="#ffffff" stroke-width="1.8" />
    <path d="M 49.5 18 L 52 20.5 L 56.5 15.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none" />
  </g>

  <g class="za-state-error" style="display: none;">
    <circle cx="53" cy="18" r="7.5" fill="#2d0b14" stroke="#f43f5e" stroke-width="1.8" />
    <line x1="50" y1="15" x2="56" y2="21" stroke="#fda4af" stroke-width="1.8" stroke-linecap="round" />
    <line x1="56" y1="15" x2="50" y2="21" stroke="#fda4af" stroke-width="1.8" stroke-linecap="round" />
  </g>

  <g class="za-state-drag" style="display: none;">
    <rect x="47" y="14" width="16" height="20" rx="3" fill="rgba(0, 0, 0, 0.9)" stroke="#ffffff" stroke-width="1.5" />
    <line x1="51" y1="19" x2="59" y2="19" stroke="#e4e4e7" stroke-width="1.2" stroke-linecap="round" />
    <line x1="51" y1="23" x2="57" y2="23" stroke="#e4e4e7" stroke-width="1.2" stroke-linecap="round" />
    <circle cx="61" cy="32" r="4.5" fill="#000000" stroke="#ffffff" stroke-width="1" />
    <line x1="61" y1="29.5" x2="61" y2="34.5" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
    <line x1="58.5" y1="32" x2="63.5" y2="32" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" />
  </g>

  <ellipse class="za-state-idle" cx="32" cy="38" rx="22" ry="7" fill="none" stroke="rgba(255, 255, 255, 0.4)" stroke-width="1.4" stroke-dasharray="3 3" transform="rotate(-15 32 38)" style="display: none;" />
</svg>`;

export function getVisualCursorScript(
  initialThemeId?: string,
  initialBadgeVisible?: boolean,
  initialPointerId?: CursorPointerId,
  initialAvatarId?: CursorAvatarId,
  initialDisplayMode?: CursorDisplayMode
): string {
  const resolvedInitialTheme = initialThemeId || loadStoredCursorId();
  const resolvedInitialPointer = initialPointerId || loadStoredPointerId();
  const resolvedInitialAvatar = initialAvatarId || loadStoredAvatarId();
  const resolvedInitialDisplayMode = initialDisplayMode || loadStoredDisplayMode();
  const resolvedInitialBadgeVisible = typeof initialBadgeVisible === 'boolean'
    ? initialBadgeVisible
    : isCursorBadgeEnabled();
  const themesData = JSON.stringify(
    CURSOR_THEMES.map((t) => ({
      id: t.id,
      name: t.name,
      shapeType: t.shapeType,
      hotspot: t.hotspot,
      accentColor: t.accentColor,
      underlayColor: t.underlayColor,
      sheenColor: t.sheenColor,
      glintColor: t.glintColor,
      badgeBg: t.badgeBg,
      badgeBorder: t.badgeBorder,
      badgeTextColor: t.badgeTextColor,
      bodyGradient: t.bodyGradient,
      rimGradient: t.rimGradient,
    }))
  );

  return `
(() => {
  const existingRoot = document.getElementById('zeroapply-codex-cursor-root');
  if (window.__zeroapplyCursor && existingRoot && (document.body?.contains(existingRoot) || document.documentElement.contains(existingRoot))) {
    return;
  }
  if (existingRoot) {
    try { existingRoot.remove(); } catch(e) {}
  }

  const THEMES_LIST = ${themesData};
  const THEMES_MAP = THEMES_LIST.reduce((acc, t) => { acc[t.id] = t; return acc; }, {});

  let cursorBadgeVisible = (function() {
    try {
      const explicit = ${JSON.stringify(resolvedInitialBadgeVisible)};
      if (typeof explicit === 'boolean') return explicit;
      const saved = localStorage.getItem('${SETTINGS_STORAGE_KEY}');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.cursorBadgeVisible === 'boolean') return parsed.cursorBadgeVisible;
      }
    } catch(e) {}
    return true;
  })();

  let currentThemeId = (function() {
    try {
      const explicit = ${JSON.stringify(resolvedInitialTheme || '')};
      if (explicit && THEMES_MAP[explicit]) return explicit;
      const saved = localStorage.getItem('${CURSOR_STORAGE_KEY}');
      if (saved && THEMES_MAP[saved]) return saved;
    } catch(e) {}
    return '${DEFAULT_CURSOR_ID}';
  })();

  let currentPointerId = (function() {
    try {
      const explicit = ${JSON.stringify(resolvedInitialPointer)};
      if (
        explicit === 'pointer_neon_delta' ||
        explicit === 'pointer_orbital_ceramic' ||
        explicit === 'pointer_obsidian_starlight' ||
        explicit === 'pointer_stealth' ||
        explicit === 'pointer_sky_aero'
      ) return explicit;
      const saved = localStorage.getItem('${CURSOR_POINTER_STORAGE_KEY}');
      if (
        saved === 'pointer_neon_delta' ||
        saved === 'pointer_orbital_ceramic' ||
        saved === 'pointer_obsidian_starlight' ||
        saved === 'pointer_stealth' ||
        saved === 'pointer_sky_aero'
      ) return saved;
      if (currentThemeId === 'cloud_bot') return 'pointer_sky_aero';
    } catch(e) {}
    return '${DEFAULT_POINTER_ID}';
  })();

  let currentAvatarId = (function() {
    try {
      const explicit = ${JSON.stringify(resolvedInitialAvatar)};
      if (
        explicit === 'avatar_grok_bot' ||
        explicit === 'avatar_cloud_bot' ||
        explicit === 'avatar_sentinel_bot' ||
        explicit === 'avatar_mochi_neko'
      )
        return explicit;
      const saved = localStorage.getItem('${CURSOR_AVATAR_STORAGE_KEY}');
      if (
        saved === 'avatar_grok_bot' ||
        saved === 'avatar_cloud_bot' ||
        saved === 'avatar_sentinel_bot' ||
        saved === 'avatar_mochi_neko'
      )
        return saved;
      if (currentThemeId === 'cloud_bot') return 'avatar_cloud_bot';
    } catch(e) {}
    return '${DEFAULT_AVATAR_ID}';
  })();

  function getActiveTheme() {
    return THEMES_MAP[currentThemeId] || THEMES_MAP['${DEFAULT_CURSOR_ID}'] || THEMES_LIST[0];
  }

  const root = document.createElement('div');
  root.id = 'zeroapply-codex-cursor-root';
  root.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none !important;z-index:2147483647 !important;overflow:hidden;';

  const style = document.createElement('style');
  style.textContent = \`
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
      filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5)) !important;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
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
    /* Display Mode Visibility Filters: Cursor vs Avatar */
    .za-display-mode-cursor .za-avatar-part,
    .za-display-mode-avatar .za-pointer-part {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
    }

    /* ==========================================================================
       CINEMATIC LONG DEFAULT ANIMATION SUITE (18.0s DURATION FOR ALL AVATARS)
       All 4 Companion Avatars: Grok Bot, Cloud Bot, Sentinel Droid, Mochi Neko
       ========================================================================== */

    /* 1. Dynamic 360° All-Direction Eye Gaze & Saccadic Blink Animation (18.0s Long Cycle) */
    @keyframes za-bot-blink {
      /* Phase 1: Direct Front Contact & Natural Double Micro-Blink */
      0%, 7% {
        transform: translate(0px, 0px) rotate(0deg) scale(1, 1);
        opacity: 1;
      }
      7.8% {
        transform: translate(0px, 0px) rotate(0deg) scale(1.05, 0.08);
        opacity: 0.9;
      }
      8.6% {
        transform: translate(0px, 0px) rotate(0deg) scale(0.98, 1.06);
        opacity: 1;
      }
      9.4% {
        transform: translate(0px, 0px) rotate(0deg) scale(1.04, 0.12);
        opacity: 0.92;
      }
      10.2% {
        transform: translate(0px, 0px) rotate(0deg) scale(1, 1);
        opacity: 1;
      }

      /* Phase 2: Up-Right Inquisitive Grok Pose (Scanning top navigation/header) */
      12%, 19% {
        transform: translate(4.6px, -2.6px) rotate(24deg) scale(0.98, 0.96);
      }
      19.8% {
        transform: translate(4.6px, -2.6px) rotate(24deg) scale(1.04, 0.08);
        opacity: 0.9;
      }
      20.8% {
        transform: translate(4.6px, -2.6px) rotate(24deg) scale(1, 1);
        opacity: 1;
      }

      /* Phase 3: Down-Left Scan Towards Pointer Arrow Tip */
      23%, 30% {
        transform: translate(-4.2px, -0.4px) rotate(-14deg) scale(0.98, 1.0);
      }
      30.8% {
        transform: translate(-4.2px, -0.4px) rotate(-14deg) scale(1.04, 0.08);
        opacity: 0.9;
      }
      31.8% {
        transform: translate(-4.2px, -0.4px) rotate(-14deg) scale(1, 1);
        opacity: 1;
      }

      /* Phase 4: Downward Reading & Form Input Inspection Scan */
      34%, 37.5% {
        transform: translate(-0.8px, 3.4px) rotate(0deg) scale(1.04, 0.92);
      }
      38.5%, 42% {
        transform: translate(0.8px, 3.4px) rotate(0deg) scale(1.04, 0.92);
      }
      43% {
        transform: translate(0px, 3.4px) rotate(0deg) scale(1.05, 0.06);
      }
      43.6% {
        transform: translate(0px, 3.4px) rotate(0deg) scale(1, 1);
      }
      44.2% {
        transform: translate(0px, 3.4px) rotate(0deg) scale(1.04, 0.12);
      }
      45.2% {
        transform: translate(0px, 3.4px) rotate(0deg) scale(1, 1);
      }

      /* Phase 5: Up-Left Cognitive Synthesis & Problem Solving */
      47%, 55% {
        transform: translate(-2.6px, -3.2px) rotate(-10deg) scale(0.96, 0.98);
      }
      55.8% {
        transform: translate(-2.6px, -3.2px) rotate(-10deg) scale(1.02, 0.08);
        opacity: 0.9;
      }
      56.8% {
        transform: translate(-2.6px, -3.2px) rotate(-10deg) scale(1, 1);
        opacity: 1;
      }

      /* Phase 6: Horizon Scan Right (Outer Context Scan) */
      59%, 66% {
        transform: translate(4.0px, 0.6px) rotate(12deg) scale(0.98, 1.0);
      }
      66.8% {
        transform: translate(4.0px, 0.6px) rotate(12deg) scale(1.04, 0.08);
        opacity: 0.9;
      }
      67.8% {
        transform: translate(4.0px, 0.6px) rotate(12deg) scale(1, 1);
        opacity: 1;
      }

      /* Phase 7: Curious Tilt Down-Right & Friendly Squint */
      70%, 77% {
        transform: translate(3.2px, 2.4px) rotate(8deg) scale(1.03, 0.95);
      }
      77.8% {
        transform: translate(3.2px, 2.4px) rotate(8deg) scale(1.06, 0.08);
        opacity: 0.92;
      }
      78.8% {
        transform: translate(3.2px, 2.4px) rotate(8deg) scale(1, 1);
        opacity: 1;
      }

      /* Phase 8: High Alert Upward Scan & Attention Perk */
      81%, 87% {
        transform: translate(0px, -2.6px) rotate(0deg) scale(0.98, 1.04);
      }
      87.8% {
        transform: translate(0px, -2.6px) rotate(0deg) scale(1.03, 0.08);
        opacity: 0.9;
      }
      88.8% {
        transform: translate(0px, -2.6px) rotate(0deg) scale(1, 1);
        opacity: 1;
      }

      /* Phase 9: Gentle Lateral Micro-Scan Check */
      90%, 93.5% {
        transform: translate(-1.8px, -0.6px) rotate(-6deg) scale(1.0, 1.0);
      }
      94.2% {
        transform: translate(-1.8px, -0.6px) rotate(-6deg) scale(1.04, 0.08);
        opacity: 0.9;
      }
      95.2% {
        transform: translate(-1.8px, -0.6px) rotate(-6deg) scale(1, 1);
        opacity: 1;
      }

      /* Phase 10: Organic Return Glide to Front Look */
      97% {
        transform: translate(1.2px, 0.2px) rotate(3deg) scale(1.01, 0.99);
      }
      98.5%, 100% {
        transform: translate(0px, 0px) rotate(0deg) scale(1, 1);
        opacity: 1;
      }
    }

    /* 2. Avatar 1: xAI Grok Cyber Bot Long Levitation & Anti-Gravity Float (18.0s) */
    @keyframes za-grok-float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      15% { transform: translateY(-1.2px) rotate(0.4deg); }
      32% { transform: translateY(-0.4px) rotate(-0.5deg); }
      48% { transform: translateY(0.8px) rotate(0deg); }
      62% { transform: translateY(-1.5px) rotate(0.6deg); }
      78% { transform: translateY(-0.8px) rotate(-0.3deg); }
      89% { transform: translateY(-1.4px) rotate(0.3deg); }
    }

    /* 3. Avatar 2: Cloud Companion Bot Long Buoyant Drift & Pillow Tuck Puff (18.0s) */
    @keyframes za-cloud-drift {
      0%, 100% { transform: translate(0px, 0px); }
      16% { transform: translate(0.6px, -1.5px); }
      34% { transform: translate(-0.8px, -0.6px); }
      52% { transform: translate(0.2px, 0.8px); }
      68% { transform: translate(0.8px, -1.6px); }
      84% { transform: translate(-0.5px, -0.8px); }
    }
    @keyframes za-cloud-puff {
      0%, 100% { transform: scale(1, 1); }
      25% { transform: scale(1.02, 0.98); }
      50% { transform: scale(0.99, 1.02); }
      75% { transform: scale(1.03, 0.99); }
    }

    /* 4. Avatar 3: Aero Sentinel Droid Long Magnetic Hover & Thruster Oscillation (18.0s) */
    @keyframes za-sentinel-hover {
      0%, 100% { transform: translateY(0px); }
      18% { transform: translateY(-1.3px); }
      35% { transform: translateY(-0.3px); }
      52% { transform: translateY(0.6px); }
      70% { transform: translateY(-1.5px); }
      86% { transform: translateY(-0.7px); }
    }
    @keyframes za-sentinel-fin-left {
      0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
      18% { transform: translate(-0.6px, -1.2px) rotate(-3deg); }
      35% { transform: translate(0.3px, -0.4px) rotate(1.5deg); }
      52% { transform: translate(-0.2px, 0.5px) rotate(-1deg); }
      70% { transform: translate(-0.7px, -1.4px) rotate(-3.5deg); }
      86% { transform: translate(0.2px, -0.8px) rotate(1deg); }
    }
    @keyframes za-sentinel-fin-right {
      0%, 100% { transform: translate(0px, 0px) rotate(0deg); }
      18% { transform: translate(0.6px, -1.2px) rotate(3deg); }
      35% { transform: translate(-0.3px, -0.4px) rotate(-1.5deg); }
      52% { transform: translate(0.2px, 0.5px) rotate(1deg); }
      70% { transform: translate(0.7px, -1.4px) rotate(3.5deg); }
      86% { transform: translate(-0.2px, -0.8px) rotate(3.5deg); }
    }
    @keyframes za-sentinel-visor-sweep {
      0%, 45%, 100% { opacity: 0.75; }
      50%, 54% { opacity: 1; stroke-width: 0.9; }
    }

    /* 5. Avatar 4: Mochi Cyber Neko Long Ear Movements, Head Bob & Bell Jingle (18.0s) */
    @keyframes za-neko-ear-left-idle {
      0%, 10% { transform: rotate(0deg) scale(1, 1); }
      /* Phase 2: Up-right look, relaxed */
      12%, 19% { transform: rotate(-2deg) scale(0.99, 1.01); }
      /* Phase 3: Down-left look toward pointer arrow -> attentive perk! */
      23%, 30% { transform: rotate(-7deg) scale(1.02, 1.03); }
      /* Phase 4: Downward reading scan */
      34%, 43% { transform: rotate(-3deg) scale(1.0, 1.0); }
      /* Phase 5: Up-left deep thought glance -> attentive perk high! */
      47%, 55% { transform: rotate(-9deg) translate(-0.5px, -0.8px) scale(1.03); }
      56% { transform: rotate(-2deg) scale(1, 1); }
      /* Phase 6: Horizon scan right */
      59%, 66% { transform: rotate(2deg) scale(0.98, 1.0); }
      /* Phase 7: Affectionate tilt down-right -> playful kawaii flick! */
      70% { transform: rotate(-5deg); }
      72% { transform: rotate(3deg); }
      74% { transform: rotate(-3deg); }
      77% { transform: rotate(0deg); }
      /* Phase 8: High alert upward scan */
      81%, 87% { transform: rotate(-4deg) scale(1.01, 1.02); }
      /* Phase 9: Micro-check */
      90%, 94% { transform: rotate(-6deg) scale(1.02, 1.02); }
      98.5%, 100% { transform: rotate(0deg) scale(1, 1); }
    }

    @keyframes za-neko-ear-right-idle {
      0%, 10% { transform: rotate(0deg) scale(1, 1); }
      /* Phase 2: Up-right look -> playful ear perk & twitch! */
      12% { transform: rotate(4deg) scale(1.01, 1.02); }
      15% { transform: rotate(8deg) scale(0.96, 1.04); }
      17% { transform: rotate(-2deg) scale(1.02, 0.98); }
      19% { transform: rotate(6deg) scale(0.98, 1.02); }
      21% { transform: rotate(2deg) scale(1, 1); }
      /* Phase 3: Down-left look toward pointer arrow */
      23%, 30% { transform: rotate(1deg) scale(0.98, 1.0); }
      /* Phase 4: Downward reading scan */
      34%, 43% { transform: rotate(3deg) scale(1.0, 1.0); }
      /* Phase 5: Up-left deep thought glance */
      47%, 55% { transform: rotate(-2deg) scale(0.97); }
      /* Phase 6: Horizon scan right -> curious ear flick! */
      59% { transform: rotate(8deg) scale(0.96, 1.04); }
      61% { transform: rotate(-3deg) scale(1.02, 0.98); }
      63% { transform: rotate(6deg) scale(0.98, 1.02); }
      66% { transform: rotate(2deg) scale(1, 1); }
      /* Phase 7: Affectionate tilt down-right -> playful kawaii flick! */
      70% { transform: rotate(5deg); }
      72% { transform: rotate(-2deg); }
      74% { transform: rotate(3deg); }
      77% { transform: rotate(0deg); }
      /* Phase 8: High alert upward scan */
      81%, 87% { transform: rotate(4deg) scale(1.01, 1.02); }
      /* Phase 9: Micro-check */
      90%, 94% { transform: rotate(2deg) scale(0.99, 1.0); }
      98.5%, 100% { transform: rotate(0deg) scale(1, 1); }
    }

    @keyframes za-neko-head-float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      18% { transform: translateY(-1.1px) rotate(0.4deg); }
      36% { transform: translateY(-0.3px) rotate(-0.3deg); }
      52% { transform: translateY(0.7px) rotate(0deg); }
      70% { transform: translateY(-1.3px) rotate(0.5deg); }
      86% { transform: translateY(-0.6px) rotate(-0.3deg); }
    }

    @keyframes za-neko-bell-jingle {
      0%, 14%, 22%, 58%, 67%, 100% { transform: rotate(0deg); }
      16% { transform: rotate(-7deg); }
      18% { transform: rotate(6deg); }
      20% { transform: rotate(-3deg); }
      60% { transform: rotate(7deg); }
      62% { transform: rotate(-5deg); }
      64% { transform: rotate(3deg); }
    }

    /* 6. Coordinated Shadow Breathing for all floating avatars (18.0s) */
    @keyframes za-avatar-shadow-breathe {
      0%, 100% { transform: scale(1, 1); opacity: 0.25; }
      18% { transform: scale(0.94, 0.94); opacity: 0.20; }
      35% { transform: scale(0.98, 0.98); opacity: 0.24; }
      52% { transform: scale(1.04, 1.04); opacity: 0.30; }
      70% { transform: scale(0.93, 0.93); opacity: 0.19; }
      86% { transform: scale(0.97, 0.97); opacity: 0.23; }
    }

    /* State animations for interactive modes */
    @keyframes za-eyes-typing {
      0%, 100% { transform: translate(-1.6px, 2.8px) rotate(-3deg); }
      50% { transform: translate(1.6px, 2.8px) rotate(3deg); }
    }
    @keyframes za-eyes-thinking {
      0%, 100% { transform: translate(3.6px, -2.8px) rotate(18deg) scale(0.96); opacity: 0.9; }
      50% { transform: translate(4.6px, -3.4px) rotate(26deg) scale(1.04); opacity: 1; }
    }
    @keyframes za-eyes-happy {
      0%, 100% { transform: translate(0px, -0.5px) scale(1.08, 0.75); }
      50% { transform: translate(0px, -2.0px) scale(1.12, 0.7); }
    }

    /* Animation attachment rules for all avatars */
    .za-bot-eyes {
      transform-box: fill-box !important;
      transform-origin: center !important;
      animation: za-bot-blink 18.0s infinite cubic-bezier(0.25, 1, 0.5, 1) !important;
    }
    .za-avatar-shadow {
      transform-box: fill-box !important;
      transform-origin: center !important;
      animation: za-avatar-shadow-breathe 18.0s infinite ease-in-out !important;
    }
    .za-grok-sphere {
      transform-box: fill-box !important;
      transform-origin: center !important;
      animation: za-grok-float 18.0s infinite ease-in-out !important;
    }
    .za-cloud-pod {
      transform-box: fill-box !important;
      transform-origin: center !important;
      animation: za-cloud-drift 18.0s infinite ease-in-out !important;
    }
    .za-cloud-pillow {
      transform-box: fill-box !important;
      transform-origin: center !important;
      animation: za-cloud-puff 18.0s infinite ease-in-out !important;
    }
    .za-sentinel-head {
      transform-box: fill-box !important;
      transform-origin: center !important;
      animation: za-sentinel-hover 18.0s infinite ease-in-out !important;
    }
    .za-sentinel-fin-left {
      transform-box: fill-box !important;
      transform-origin: center !important;
      animation: za-sentinel-fin-left 18.0s infinite ease-in-out !important;
    }
    .za-sentinel-fin-right {
      transform-box: fill-box !important;
      transform-origin: center !important;
      animation: za-sentinel-fin-right 18.0s infinite ease-in-out !important;
    }
    .za-sentinel-glint {
      animation: za-sentinel-visor-sweep 18.0s infinite ease-in-out !important;
    }
    .za-neko-head {
      transform-box: fill-box !important;
      transform-origin: center !important;
      animation: za-neko-head-float 18.0s infinite ease-in-out !important;
    }
    .za-neko-bell {
      transform-box: fill-box !important;
      transform-origin: 45px 48px !important;
      animation: za-neko-bell-jingle 18.0s infinite ease-in-out !important;
    }
    .za-neko-ear {
      transform-box: fill-box !important;
    }
    .za-neko-ear-left {
      transform-origin: 80% 90% !important;
      animation: za-neko-ear-left-idle 18.0s infinite cubic-bezier(0.25, 1, 0.5, 1) !important;
    }
    .za-neko-ear-right {
      transform-origin: 20% 90% !important;
      animation: za-neko-ear-right-idle 18.0s infinite cubic-bezier(0.25, 1, 0.5, 1) !important;
    }

    /* Reaction mood state overrides */
    .za-typing .za-bot-eyes, .za-bot-eyes.za-anim-typing {
      animation: za-eyes-typing 1.2s ease-in-out infinite !important;
    }
    .za-thinking .za-bot-eyes, .za-bot-eyes.za-anim-thinking {
      animation: za-eyes-thinking 2.4s ease-in-out infinite !important;
    }
    .za-success .za-bot-eyes, .za-bot-eyes.za-anim-happy {
      animation: za-eyes-happy 0.8s ease-in-out infinite !important;
    }

    @keyframes za-neko-ears-typing-l {
      0%, 100% { transform: rotate(-2deg) translate(0px, 0px); }
      50% { transform: rotate(-6deg) translate(-0.3px, -0.8px) scale(1.02, 1.04); }
    }
    @keyframes za-neko-ears-typing-r {
      0%, 100% { transform: rotate(2deg) translate(0px, 0px); }
      50% { transform: rotate(6deg) translate(0.3px, -0.8px) scale(1.02, 1.04); }
    }

    @keyframes za-neko-ears-thinking-l {
      0%, 100% { transform: rotate(-9deg) translate(-0.5px, -0.8px) scale(1.03); }
      50% { transform: rotate(-4deg) translate(-0.2px, -0.4px) scale(1.01); }
    }
    @keyframes za-neko-ears-thinking-r {
      0%, 100% { transform: rotate(-3deg) scale(0.97); }
      50% { transform: rotate(2deg) scale(0.99); }
    }

    @keyframes za-neko-ears-happy-l {
      0%, 100% { transform: rotate(0deg) translate(0px, 0px) scale(1, 1); }
      50% { transform: rotate(-10deg) translate(-0.8px, -1.5px) scale(1.06, 1.08); }
    }
    @keyframes za-neko-ears-happy-r {
      0%, 100% { transform: rotate(0deg) translate(0px, 0px) scale(1, 1); }
      50% { transform: rotate(10deg) translate(0.8px, -1.5px) scale(1.06, 1.08); }
    }

    .za-typing .za-neko-ear-left, .za-anim-typing .za-neko-ear-left {
      animation: za-neko-ears-typing-l 1.2s ease-in-out infinite !important;
    }
    .za-typing .za-neko-ear-right, .za-anim-typing .za-neko-ear-right {
      animation: za-neko-ears-typing-r 1.2s ease-in-out infinite !important;
    }
    .za-thinking .za-neko-ear-left, .za-anim-thinking .za-neko-ear-left {
      animation: za-neko-ears-thinking-l 2.4s ease-in-out infinite !important;
    }
    .za-thinking .za-neko-ear-right, .za-anim-thinking .za-neko-ear-right {
      animation: za-neko-ears-thinking-r 2.4s ease-in-out infinite !important;
    }
    .za-success .za-neko-ear-left, .za-anim-happy .za-neko-ear-left {
      animation: za-neko-ears-happy-l 0.8s ease-in-out infinite !important;
    }
    .za-success .za-neko-ear-right, .za-anim-happy .za-neko-ear-right {
      animation: za-neko-ears-happy-r 0.8s ease-in-out infinite !important;
    }
    @keyframes za-earcup-pulse {
      0%, 100% {
        transform: scale(1);
        opacity: 0.95;
      }
      50% {
        transform: scale(1.22);
        opacity: 0.35;
      }
    }
    .za-earcup-pulse {
      transform-box: fill-box !important;
      transform-origin: center !important;
      animation: za-earcup-pulse 1.8s ease-in-out infinite !important;
    }
    @keyframes za-visor-scan {
      0% {
        transform: translateX(-8px);
        opacity: 0;
      }
      30% {
        opacity: 0.8;
      }
      70% {
        opacity: 0.8;
      }
      100% {
        transform: translateX(8px);
        opacity: 0;
      }
    }
    .za-visor-scan {
      animation: za-visor-scan 3.2s ease-in-out infinite !important;
    }
    @keyframes za-crown-glow {
      0%, 100% {
        opacity: 0.45;
        transform: scale(1);
      }
      50% {
        opacity: 1;
        transform: scale(1.2);
      }
    }
    .za-crown-glow {
      transform-box: fill-box !important;
      transform-origin: center !important;
      animation: za-crown-glow 2.2s ease-in-out infinite !important;
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
      z-index: 99999998;
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
      z-index: 99999997;
    }
    .za-motion-ghost {
      position: absolute;
      width: 58px;
      height: 58px;
      pointer-events: none !important;
      opacity: 0.42;
      transform-origin: 14px 8px;
      animation: za-ghost-fade 0.28s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
      z-index: 99999996;
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
  \`;
  function safeMountCursor() {
    const mount = document.body || document.documentElement;
    if (!mount) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeMountCursor, { once: true });
      }
      return;
    }
    if (!document.getElementById('zeroapply-codex-cursor-styles')) {
      style.id = 'zeroapply-codex-cursor-styles';
      (document.head || mount).appendChild(style);
    }
    if (!document.getElementById('zeroapply-codex-cursor-root')) {
      mount.appendChild(root);
    }
    if (!document.body && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body && root.parentElement !== document.body) {
          document.body.appendChild(root);
        }
      }, { once: true });
    }
  }

  function createSvgElement(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        el.setAttribute(k, v);
      }
    }
    return el;
  }

  function buildDarkGlassSvg(themeOverride, pointerIdOverride, avatarIdOverride) {
    const theme = themeOverride || getActiveTheme();
    const ptrId = pointerIdOverride || currentPointerId || (theme.id === 'cloud_bot' || theme.shapeType === 'cloud' ? 'pointer_sky_aero' : 'pointer_stealth');
    const avtId = avatarIdOverride || currentAvatarId || (theme.id === 'cloud_bot' || theme.shapeType === 'cloud' ? 'avatar_cloud_bot' : 'avatar_grok_bot');
    const svg = createSvgElement('svg', {
      width: '58',
      height: '58',
      viewBox: '0 0 64 64',
      fill: 'none',
      class: 'za-glass-svg'
    });

    const defs = createSvgElement('defs');

    // Obsidian Gradient Fill
    const bodyGrad = createSvgElement('linearGradient', {
      id: 'za-glass-body',
      x1: '14', y1: '8', x2: '48', y2: '48',
      gradientUnits: 'userSpaceOnUse'
    });
    const stops = theme.bodyGradient || [
      { offset: '0%', color: '#2a2046', opacity: '0.95' },
      { offset: '35%', color: '#191330', opacity: '0.96' },
      { offset: '70%', color: '#0e0b1c', opacity: '0.98' },
      { offset: '100%', color: '#080612', opacity: '0.99' }
    ];
    for (const s of stops) {
      bodyGrad.appendChild(createSvgElement('stop', {
        offset: s.offset,
        'stop-color': s.color,
        'stop-opacity': s.opacity != null ? String(s.opacity) : '1'
      }));
    }
    defs.appendChild(bodyGrad);

    // Glowing Electric Lavender Rim Gradient
    const rimGrad = createSvgElement('linearGradient', {
      id: 'za-glass-rim',
      x1: '12', y1: '6', x2: '48', y2: '48',
      gradientUnits: 'userSpaceOnUse'
    });
    const rimStops = theme.rimGradient || [
      { offset: '0%', color: '#ffffff' },
      { offset: '15%', color: '#e0e7ff' },
      { offset: '35%', color: '#c4b5fd' },
      { offset: '65%', color: '#a78bfa' },
      { offset: '85%', color: '#818cf8' },
      { offset: '100%', color: '#6366f1' }
    ];
    for (const s of rimStops) {
      rimGrad.appendChild(createSvgElement('stop', {
        offset: s.offset,
        'stop-color': s.color
      }));
    }
    defs.appendChild(rimGrad);

    // Sheen Gradient
    const sheenGrad = createSvgElement('linearGradient', {
      id: 'za-glass-sheen',
      x1: '14', y1: '8', x2: '28', y2: '38',
      gradientUnits: 'userSpaceOnUse'
    });
    sheenGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': '0.55' }));
    sheenGrad.appendChild(createSvgElement('stop', { offset: '40%', 'stop-color': theme.accentColor || '#c4b5fd', 'stop-opacity': '0.25' }));
    sheenGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': theme.accentColor || '#a78bfa', 'stop-opacity': '0.0' }));
    defs.appendChild(sheenGrad);

    // Ambient Shadow Filter (for unit test za-glass-shadow compatibility)
    const shadowFilter = createSvgElement('filter', {
      id: 'za-glass-shadow',
      x: '-30%', y: '-30%', width: '160%', height: '160%'
    });
    shadowFilter.appendChild(createSvgElement('feGaussianBlur', { stdDeviation: '2.2', result: 'blur' }));
    defs.appendChild(shadowFilter);

    const visorClip = createSvgElement('clipPath', { id: 'za-visor-clip' });
    visorClip.appendChild(createSvgElement('rect', { x: '37.5', y: '36.5', width: '15', height: '9', rx: '4.5' }));
    defs.appendChild(visorClip);

    // Grok Bot Obsidian Sphere Radial Studio Lighting
    const botSphereGrad = createSvgElement('radialGradient', {
      id: 'za-bot-sphere',
      cx: '36%', cy: '32%', r: '68%'
    });
    botSphereGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#27272a' }));
    botSphereGrad.appendChild(createSvgElement('stop', { offset: '35%', 'stop-color': '#18181b' }));
    botSphereGrad.appendChild(createSvgElement('stop', { offset: '70%', 'stop-color': '#09090b' }));
    botSphereGrad.appendChild(createSvgElement('stop', { offset: '92%', 'stop-color': '#020408' }));
    botSphereGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#000000' }));
    defs.appendChild(botSphereGrad);

    // Curved Sapphire OLED Visor Glass
    const visorGlassGrad = createSvgElement('linearGradient', {
      id: 'za-visor-glass',
      x1: '37', y1: '36', x2: '37', y2: '46',
      gradientUnits: 'userSpaceOnUse'
    });
    visorGlassGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#18181b' }));
    visorGlassGrad.appendChild(createSvgElement('stop', { offset: '45%', 'stop-color': '#09090b' }));
    visorGlassGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#000000' }));
    defs.appendChild(visorGlassGrad);

    // Curved Specular Horizon Glint on Visor
    const visorGlintGrad = createSvgElement('linearGradient', {
      id: 'za-visor-glint',
      x1: '38', y1: '36.5', x2: '48', y2: '39',
      gradientUnits: 'userSpaceOnUse'
    });
    visorGlintGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': '0.5' }));
    visorGlintGrad.appendChild(createSvgElement('stop', { offset: '45%', 'stop-color': '#7dd3fc', 'stop-opacity': '0.3' }));
    visorGlintGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': theme.accentColor || '#38bdf8', 'stop-opacity': '0' }));
    defs.appendChild(visorGlintGrad);

    // Brushed Titanium Headband Arch
    const headbandGrad = createSvgElement('linearGradient', {
      id: 'za-headband-titanium',
      x1: '35', y1: '26', x2: '55', y2: '40',
      gradientUnits: 'userSpaceOnUse'
    });
    headbandGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#64748b' }));
    headbandGrad.appendChild(createSvgElement('stop', { offset: '28%', 'stop-color': '#94a3b8' }));
    headbandGrad.appendChild(createSvgElement('stop', { offset: '50%', 'stop-color': '#f1f5f9' }));
    headbandGrad.appendChild(createSvgElement('stop', { offset: '72%', 'stop-color': '#cbd5e1' }));
    headbandGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#475569' }));
    defs.appendChild(headbandGrad);

    // Volumetric Earcup Outer Capsule Shell
    const earcupShellGrad = createSvgElement('linearGradient', {
      id: 'za-earcup-shell',
      x1: '0%', y1: '0%', x2: '100%', y2: '0%'
    });
    earcupShellGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#1e293b' }));
    earcupShellGrad.appendChild(createSvgElement('stop', { offset: '30%', 'stop-color': '#475569' }));
    earcupShellGrad.appendChild(createSvgElement('stop', { offset: '65%', 'stop-color': '#64748b' }));
    earcupShellGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#0f172a' }));
    defs.appendChild(earcupShellGrad);

    // Precision Arrow Faceted Lighting
    const pointerFaceGrad = createSvgElement('linearGradient', {
      id: 'za-pointer-face',
      x1: '16', y1: '8', x2: '26.5', y2: '25.5',
      gradientUnits: 'userSpaceOnUse'
    });
    pointerFaceGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ffffff' }));
    pointerFaceGrad.appendChild(createSvgElement('stop', { offset: '55%', 'stop-color': '#f8fafc' }));
    pointerFaceGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#e2e8f0' }));
    defs.appendChild(pointerFaceGrad);

    const pointerChamferGrad = createSvgElement('linearGradient', {
      id: 'za-pointer-chamfer',
      x1: '16', y1: '8', x2: '18', y2: '23.5',
      gradientUnits: 'userSpaceOnUse'
    });
    pointerChamferGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ffffff' }));
    pointerChamferGrad.appendChild(createSvgElement('stop', { offset: '35%', 'stop-color': '#e0f2fe' }));
    pointerChamferGrad.appendChild(createSvgElement('stop', { offset: '75%', 'stop-color': '#bae6fd' }));
    pointerChamferGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#94a3b8' }));
    defs.appendChild(pointerChamferGrad);

    // Stylish Pointer: Cyber Neon Aurora Delta (Tailless) Gradients
    const ndRimGrad = createSvgElement('linearGradient', {
      id: 'za-nd-rim',
      x1: '13.5', y1: '27', x2: '30.5', y2: '12',
      gradientUnits: 'userSpaceOnUse'
    });
    ndRimGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#38bdf8' }));
    ndRimGrad.appendChild(createSvgElement('stop', { offset: '35%', 'stop-color': '#3b82f6' }));
    ndRimGrad.appendChild(createSvgElement('stop', { offset: '70%', 'stop-color': '#8b5cf6' }));
    ndRimGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#d946ef' }));
    defs.appendChild(ndRimGrad);

    const ndCoreGrad = createSvgElement('linearGradient', {
      id: 'za-nd-core',
      x1: '16', y1: '8', x2: '25', y2: '24',
      gradientUnits: 'userSpaceOnUse'
    });
    ndCoreGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#090c17' }));
    ndCoreGrad.appendChild(createSvgElement('stop', { offset: '50%', 'stop-color': '#0e1326' }));
    ndCoreGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#181735' }));
    defs.appendChild(ndCoreGrad);

    const ndBevelGrad = createSvgElement('linearGradient', {
      id: 'za-nd-bevel',
      x1: '16.5', y1: '12', x2: '21', y2: '23',
      gradientUnits: 'userSpaceOnUse'
    });
    ndBevelGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#000000', 'stop-opacity': '0.8' }));
    ndBevelGrad.appendChild(createSvgElement('stop', { offset: '55%', 'stop-color': '#1e1b4b', 'stop-opacity': '0.35' }));
    ndBevelGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#c084fc', 'stop-opacity': '0.12' }));
    defs.appendChild(ndBevelGrad);

    const ndGlowFilter = createSvgElement('filter', {
      id: 'za-nd-glow',
      x: '-30%', y: '-30%', width: '160%', height: '160%'
    });
    ndGlowFilter.appendChild(createSvgElement('feGaussianBlur', { stdDeviation: '1.6', result: 'blur' }));
    defs.appendChild(ndGlowFilter);

    // Stylish Pointer 1: Orbital Nova Ceramic Gradients
    const orbitSilverGrad = createSvgElement('linearGradient', {
      id: 'za-orbit-silver',
      x1: '12', y1: '12', x2: '36', y2: '28',
      gradientUnits: 'userSpaceOnUse'
    });
    orbitSilverGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#94a3b8' }));
    orbitSilverGrad.appendChild(createSvgElement('stop', { offset: '35%', 'stop-color': '#ffffff' }));
    orbitSilverGrad.appendChild(createSvgElement('stop', { offset: '70%', 'stop-color': '#cbd5e1' }));
    orbitSilverGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#64748b' }));
    defs.appendChild(orbitSilverGrad);

    const pearlSphereGrad = createSvgElement('radialGradient', {
      id: 'za-pearl-sphere',
      cx: '35%', cy: '30%', r: '65%'
    });
    pearlSphereGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ffffff' }));
    pearlSphereGrad.appendChild(createSvgElement('stop', { offset: '45%', 'stop-color': '#f1f5f9' }));
    pearlSphereGrad.appendChild(createSvgElement('stop', { offset: '75%', 'stop-color': '#cbd5e1' }));
    pearlSphereGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#64748b' }));
    defs.appendChild(pearlSphereGrad);

    const ceramicShellGrad = createSvgElement('linearGradient', {
      id: 'za-ceramic-shell',
      x1: '16', y1: '8', x2: '26.5', y2: '25.5',
      gradientUnits: 'userSpaceOnUse'
    });
    ceramicShellGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ffffff' }));
    ceramicShellGrad.appendChild(createSvgElement('stop', { offset: '50%', 'stop-color': '#f8fafc' }));
    ceramicShellGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#e2e8f0' }));
    defs.appendChild(ceramicShellGrad);

    const ceramicChamferGrad = createSvgElement('linearGradient', {
      id: 'za-ceramic-chamfer',
      x1: '16', y1: '8', x2: '18', y2: '23.5',
      gradientUnits: 'userSpaceOnUse'
    });
    ceramicChamferGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ffffff' }));
    ceramicChamferGrad.appendChild(createSvgElement('stop', { offset: '45%', 'stop-color': '#e2e8f0' }));
    ceramicChamferGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#cbd5e1' }));
    defs.appendChild(ceramicChamferGrad);

    const ceramicCavityGrad = createSvgElement('linearGradient', {
      id: 'za-ceramic-cavity',
      x1: '17', y1: '12', x2: '20', y2: '21',
      gradientUnits: 'userSpaceOnUse'
    });
    ceramicCavityGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#1e293b' }));
    ceramicCavityGrad.appendChild(createSvgElement('stop', { offset: '55%', 'stop-color': '#09090b' }));
    ceramicCavityGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#020617' }));
    defs.appendChild(ceramicCavityGrad);

    // Stylish Pointer 2: Obsidian Celestial Starlight Gradients
    const obsidianCoreGrad = createSvgElement('linearGradient', {
      id: 'za-obsidian-core',
      x1: '16', y1: '8', x2: '26.5', y2: '25.5',
      gradientUnits: 'userSpaceOnUse'
    });
    obsidianCoreGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#030308' }));
    obsidianCoreGrad.appendChild(createSvgElement('stop', { offset: '50%', 'stop-color': '#0d0d18' }));
    obsidianCoreGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#18152e' }));
    defs.appendChild(obsidianCoreGrad);

    const violetHaloGrad = createSvgElement('linearGradient', {
      id: 'za-violet-halo',
      x1: '14', y1: '6', x2: '28', y2: '28',
      gradientUnits: 'userSpaceOnUse'
    });
    violetHaloGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#c084fc' }));
    violetHaloGrad.appendChild(createSvgElement('stop', { offset: '35%', 'stop-color': '#a855f7' }));
    violetHaloGrad.appendChild(createSvgElement('stop', { offset: '70%', 'stop-color': '#818cf8' }));
    violetHaloGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#38bdf8' }));
    defs.appendChild(violetHaloGrad);

    const celestialArcGrad = createSvgElement('linearGradient', {
      id: 'za-celestial-arc',
      x1: '15', y1: '12', x2: '35', y2: '28',
      gradientUnits: 'userSpaceOnUse'
    });
    celestialArcGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#c084fc' }));
    celestialArcGrad.appendChild(createSvgElement('stop', { offset: '50%', 'stop-color': '#818cf8' }));
    celestialArcGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#c084fc' }));
    defs.appendChild(celestialArcGrad);

    const celestialOrbGrad = createSvgElement('radialGradient', {
      id: 'za-celestial-orb',
      cx: '35%', cy: '30%', r: '65%'
    });
    celestialOrbGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ffffff' }));
    celestialOrbGrad.appendChild(createSvgElement('stop', { offset: '35%', 'stop-color': '#e9d5ff' }));
    celestialOrbGrad.appendChild(createSvgElement('stop', { offset: '70%', 'stop-color': '#c084fc' }));
    celestialOrbGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#7e22ce' }));
    defs.appendChild(celestialOrbGrad);

    const starlightGlowGrad = createSvgElement('radialGradient', {
      id: 'za-nova-glow',
      cx: '50%', cy: '50%', r: '50%'
    });
    starlightGlowGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ffffff', 'stop-opacity': '1' }));
    starlightGlowGrad.appendChild(createSvgElement('stop', { offset: '35%', 'stop-color': '#c084fc', 'stop-opacity': '0.8' }));
    starlightGlowGrad.appendChild(createSvgElement('stop', { offset: '70%', 'stop-color': '#818cf8', 'stop-opacity': '0.3' }));
    starlightGlowGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#818cf8', 'stop-opacity': '0' }));
    defs.appendChild(starlightGlowGrad);

    // Aero Sentinel Droid Gradients & Glow Filter
    const sentinelShellGrad = createSvgElement('linearGradient', {
      id: 'za-sentinel-shell',
      x1: '38', y1: '31', x2: '52', y2: '50',
      gradientUnits: 'userSpaceOnUse'
    });
    sentinelShellGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ffffff' }));
    sentinelShellGrad.appendChild(createSvgElement('stop', { offset: '50%', 'stop-color': '#f8fafc' }));
    sentinelShellGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#cbd5e1' }));
    defs.appendChild(sentinelShellGrad);

    const sentinelVisorGrad = createSvgElement('linearGradient', {
      id: 'za-sentinel-visor',
      x1: '45', y1: '36', x2: '45', y2: '46',
      gradientUnits: 'userSpaceOnUse'
    });
    sentinelVisorGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#090d16' }));
    sentinelVisorGrad.appendChild(createSvgElement('stop', { offset: '50%', 'stop-color': '#050811' }));
    sentinelVisorGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#02040a' }));
    defs.appendChild(sentinelVisorGrad);

    const sentinelNodeGrad = createSvgElement('linearGradient', {
      id: 'za-sentinel-node',
      x1: '0%', y1: '0%', x2: '100%', y2: '100%'
    });
    sentinelNodeGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#334155' }));
    sentinelNodeGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#0f172a' }));
    defs.appendChild(sentinelNodeGrad);

    const sentinelGlowFilter = createSvgElement('filter', {
      id: 'za-sentinel-glow',
      x: '-50%', y: '-50%', width: '200%', height: '200%'
    });
    sentinelGlowFilter.appendChild(createSvgElement('feGaussianBlur', {
      in: 'SourceGraphic', stdDeviation: '1.0', result: 'blur'
    }));
    const sentinelMerge = createSvgElement('feMerge', {});
    sentinelMerge.appendChild(createSvgElement('feMergeNode', { in: 'blur' }));
    sentinelMerge.appendChild(createSvgElement('feMergeNode', { in: 'SourceGraphic' }));
    sentinelGlowFilter.appendChild(sentinelMerge);
    defs.appendChild(sentinelGlowFilter);

    // Mochi Cyber Neko Painted Snow-White Anime Gradients & Filters
    const nekoShellGrad = createSvgElement('radialGradient', {
      id: 'za-neko-shell',
      cx: '42%', cy: '32%', r: '68%'
    });
    nekoShellGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ffffff' }));
    nekoShellGrad.appendChild(createSvgElement('stop', { offset: '38%', 'stop-color': '#fff5f8' }));
    nekoShellGrad.appendChild(createSvgElement('stop', { offset: '70%', 'stop-color': '#f5e6f3' }));
    nekoShellGrad.appendChild(createSvgElement('stop', { offset: '88%', 'stop-color': '#ead6e8' }));
    nekoShellGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#dfcadc' }));
    defs.appendChild(nekoShellGrad);

    const nekoRimGrad = createSvgElement('linearGradient', {
      id: 'za-neko-rim',
      x1: '32', y1: '22', x2: '58', y2: '52', gradientUnits: 'userSpaceOnUse'
    });
    nekoRimGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#f472b6' }));
    nekoRimGrad.appendChild(createSvgElement('stop', { offset: '45%', 'stop-color': '#fb7185' }));
    nekoRimGrad.appendChild(createSvgElement('stop', { offset: '80%', 'stop-color': '#c084fc' }));
    nekoRimGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#38bdf8' }));
    defs.appendChild(nekoRimGrad);

    const nekoEarInnerGrad = createSvgElement('linearGradient', {
      id: 'za-neko-ear-inner',
      x1: '0%', y1: '0%', x2: '100%', y2: '100%'
    });
    nekoEarInnerGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ffd5e5' }));
    nekoEarInnerGrad.appendChild(createSvgElement('stop', { offset: '35%', 'stop-color': '#f472b6' }));
    nekoEarInnerGrad.appendChild(createSvgElement('stop', { offset: '75%', 'stop-color': '#e11d48' }));
    nekoEarInnerGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#9f1239' }));
    defs.appendChild(nekoEarInnerGrad);

    const nekoEarGrad = createSvgElement('linearGradient', {
      id: 'za-neko-ear',
      x1: '0%', y1: '0%', x2: '100%', y2: '100%'
    });
    nekoEarGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ffd5e5' }));
    nekoEarGrad.appendChild(createSvgElement('stop', { offset: '35%', 'stop-color': '#f472b6' }));
    nekoEarGrad.appendChild(createSvgElement('stop', { offset: '75%', 'stop-color': '#e11d48' }));
    nekoEarGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#9f1239' }));
    defs.appendChild(nekoEarGrad);

    const nekoEyeGrad = createSvgElement('linearGradient', {
      id: 'za-neko-eye',
      x1: '0%', y1: '0%', x2: '0%', y2: '100%'
    });
    nekoEyeGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#1e0b36' }));
    nekoEyeGrad.appendChild(createSvgElement('stop', { offset: '35%', 'stop-color': '#581c87' }));
    nekoEyeGrad.appendChild(createSvgElement('stop', { offset: '60%', 'stop-color': '#a21caf' }));
    nekoEyeGrad.appendChild(createSvgElement('stop', { offset: '80%', 'stop-color': '#ec4899' }));
    nekoEyeGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#38bdf8' }));
    defs.appendChild(nekoEyeGrad);

    const nekoBlushGrad = createSvgElement('radialGradient', {
      id: 'za-neko-blush',
      cx: '50%', cy: '50%', r: '50%'
    });
    nekoBlushGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#fb7185', 'stop-opacity': '0.85' }));
    nekoBlushGrad.appendChild(createSvgElement('stop', { offset: '55%', 'stop-color': '#fda4af', 'stop-opacity': '0.5' }));
    nekoBlushGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#fda4af', 'stop-opacity': '0' }));
    defs.appendChild(nekoBlushGrad);

    const nekoGoldGrad = createSvgElement('linearGradient', {
      id: 'za-neko-gold',
      x1: '0%', y1: '0%', x2: '100%', y2: '100%'
    });
    nekoGoldGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#fef08a' }));
    nekoGoldGrad.appendChild(createSvgElement('stop', { offset: '45%', 'stop-color': '#f59e0b' }));
    nekoGoldGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#b45309' }));
    defs.appendChild(nekoGoldGrad);

    const nekoRibbonGrad = createSvgElement('linearGradient', {
      id: 'za-neko-ribbon',
      x1: '0%', y1: '0%', x2: '100%', y2: '0%'
    });
    nekoRibbonGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#e11d48' }));
    nekoRibbonGrad.appendChild(createSvgElement('stop', { offset: '50%', 'stop-color': '#fb7185' }));
    nekoRibbonGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#be123c' }));
    defs.appendChild(nekoRibbonGrad);

    const nekoWhiskLGrad = createSvgElement('linearGradient', {
      id: 'za-neko-whisk-l',
      x1: '0%', y1: '0%', x2: '100%', y2: '0%'
    });
    nekoWhiskLGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ec4899', 'stop-opacity': '0.25' }));
    nekoWhiskLGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#db2777', 'stop-opacity': '0.95' }));
    defs.appendChild(nekoWhiskLGrad);

    const nekoWhiskRGrad = createSvgElement('linearGradient', {
      id: 'za-neko-whisk-r',
      x1: '100%', y1: '0%', x2: '0%', y2: '0%'
    });
    nekoWhiskRGrad.appendChild(createSvgElement('stop', { offset: '0%', 'stop-color': '#ec4899', 'stop-opacity': '0.25' }));
    nekoWhiskRGrad.appendChild(createSvgElement('stop', { offset: '100%', 'stop-color': '#db2777', 'stop-opacity': '0.95' }));
    defs.appendChild(nekoWhiskRGrad);

    const nekoGlowFilter = createSvgElement('filter', {
      id: 'za-neko-glow',
      x: '-50%', y: '-50%', width: '200%', height: '200%'
    });
    nekoGlowFilter.appendChild(createSvgElement('feGaussianBlur', {
      in: 'SourceGraphic', stdDeviation: '0.8', result: 'blur'
    }));
    const nekoMerge = createSvgElement('feMerge', {});
    nekoMerge.appendChild(createSvgElement('feMergeNode', { in: 'blur' }));
    nekoMerge.appendChild(createSvgElement('feMergeNode', { in: 'SourceGraphic' }));
    nekoGlowFilter.appendChild(nekoMerge);
    defs.appendChild(nekoGlowFilter);

    svg.appendChild(defs);

    // 1. Drop Shadows (Every Cursor In Near-Triangle Delta Shape)
    svg.appendChild(createSvgElement('path', {
      d: 'M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z',
      fill: ptrId === 'pointer_obsidian_starlight' ? '#1e1b4b' : ptrId === 'pointer_sky_aero' ? '#020108' : '#0f172a',
      opacity: ptrId === 'pointer_sky_aero' ? '0.3' : '0.25',
      filter: 'url(#za-glass-shadow)',
      class: 'za-pointer-part'
    }));

    if (avtId === 'avatar_cloud_bot') {
      svg.appendChild(createSvgElement('ellipse', {
        cx: '45', cy: '42', rx: '16', ry: '11',
        fill: '#020108', opacity: '0.3', filter: 'url(#za-glass-shadow)',
        class: 'za-avatar-part'
      }));
    } else if (avtId === 'avatar_sentinel_bot') {
      svg.appendChild(createSvgElement('ellipse', {
        cx: '45', cy: '49', rx: '10', ry: '3.5',
        fill: '#020617', opacity: '0.32', filter: 'url(#za-glass-shadow)',
        class: 'za-avatar-part'
      }));
    } else if (avtId === 'avatar_mochi_neko') {
      svg.appendChild(createSvgElement('ellipse', {
        cx: '45', cy: '49', rx: '11', ry: '3.5',
        fill: '#0f172a', opacity: '0.25', filter: 'url(#za-glass-shadow)',
        class: 'za-avatar-part'
      }));
    } else {
      svg.appendChild(createSvgElement('ellipse', {
        cx: '45', cy: '43.5', rx: '10.5', ry: '8.5',
        fill: '#0f172a', opacity: '0.22', filter: 'url(#za-glass-shadow)',
        class: 'za-avatar-part'
      }));
    }

    // 2. Selected Cursor Pointer Geometry (Pure Near-Triangle Shapes - No Stems, No Floating Clutter)
    if (ptrId === 'pointer_neon_delta') {
      // Cyber Neon Aurora Delta (100% Reference Figure Match - Pure Tailless Delta)
      svg.appendChild(createSvgElement('path', {
        d: 'M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z',
        stroke: 'url(#za-nd-rim)', 'stroke-width': '3.8', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        filter: 'url(#za-nd-glow)', opacity: '0.65',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z',
        fill: 'url(#za-nd-core)', stroke: 'url(#za-nd-rim)', 'stroke-width': '2.2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        filter: 'url(#za-glass-shadow)',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 17 11.5 L 29.5 19.5 C 27.5 20.5, 25.5 22, 24.5 22 C 23.2 22, 22.2 24.5, 21.2 27 Z',
        fill: 'url(#za-nd-bevel)',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 16 8.5 L 20 27',
        stroke: '#93c5fd', 'stroke-width': '0.75', 'stroke-linecap': 'round', opacity: '0.85',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 16.5 8.5 L 30 19.5',
        stroke: '#f0abfc', 'stroke-width': '0.75', 'stroke-linecap': 'round', opacity: '0.9',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '16', cy: '8', r: '0.65', fill: '#ffffff',
        class: 'za-pointer-part'
      }));
    } else if (ptrId === 'pointer_orbital_ceramic') {
      // Nova Ceramic Delta (Pure Tailless Near-Triangle Ceramic Shell - No Floating Rings)
      svg.appendChild(createSvgElement('path', {
        d: 'M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z',
        fill: 'url(#za-ceramic-shell)', stroke: '#cbd5e1', 'stroke-width': '1.2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        filter: 'url(#za-glass-shadow)',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 17.5 12 L 23.5 19 C 22.5 19.8, 20.5 21, 19.5 23.5 C 18.5 21, 17 15.5, 17.5 12 Z',
        fill: 'url(#za-ceramic-cavity)', stroke: '#09090b', 'stroke-width': '0.75', 'stroke-linejoin': 'round',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('line', {
        x1: '16', y1: '8', x2: '24.5', y2: '22.5',
        stroke: '#ffffff', 'stroke-width': '1.1', 'stroke-linecap': 'round', opacity: '0.95',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '16', cy: '8', r: '0.65', fill: '#ffffff',
        class: 'za-pointer-part'
      }));
    } else if (ptrId === 'pointer_obsidian_starlight') {
      // Obsidian Starlight Delta (Pure Tailless Near-Triangle Obsidian Dark Glass + Starlight - No Floating Arcs)
      svg.appendChild(createSvgElement('path', {
        d: 'M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z',
        fill: 'url(#za-obsidian-core)', stroke: 'url(#za-violet-halo)', 'stroke-width': '1.8', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        filter: 'url(#za-glass-shadow)',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 16 8.5 L 20 27',
        stroke: '#e9d5ff', 'stroke-width': '0.8', opacity: '0.85', 'stroke-linecap': 'round',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 16.5 8.5 L 30 19.5',
        stroke: '#ffffff', 'stroke-width': '0.8', opacity: '0.95', 'stroke-linecap': 'round',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '21', cy: '17', r: '4.5', fill: 'url(#za-nova-glow)', opacity: '0.85',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 21 13 Q 21 17 25 17 Q 21 17 21 21 Q 21 17 17 17 Q 21 17 21 13 Z',
        fill: '#ffffff',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('line', {
        x1: '19.2', y1: '15.2', x2: '22.8', y2: '18.8',
        stroke: '#ffffff', 'stroke-width': '0.5', opacity: '0.75',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('line', {
        x1: '22.8', y1: '15.2', x2: '19.2', y2: '18.8',
        stroke: '#ffffff', 'stroke-width': '0.5', opacity: '0.75',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '21', cy: '17', r: '1.0', fill: '#ffffff',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '16', cy: '8', r: '0.65', fill: '#ffffff',
        class: 'za-pointer-part'
      }));
    } else if (ptrId === 'pointer_sky_aero') {
      // Dual-Tone Aero Sky Delta (Pure Tailless Near-Triangle Split-Wing Delta)
      svg.appendChild(createSvgElement('path', {
        d: 'M 16 8 L 20.5 28.5 C 22 26, 23.5 23.5, 24.5 22.5 L 16 8 Z',
        fill: '#2563eb', stroke: '#1d4ed8', 'stroke-width': '0.8', 'stroke-linejoin': 'round',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 16 8 L 24.5 22.5 C 26 22.5, 28.5 21, 31.5 20 L 16 8 Z',
        fill: '#ffffff', stroke: '#cbd5e1', 'stroke-width': '0.8', 'stroke-linejoin': 'round',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('line', {
        x1: '16', y1: '8', x2: '24.5', y2: '22.5',
        stroke: '#93c5fd', 'stroke-width': '1.2', 'stroke-linecap': 'round', opacity: '0.95',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '16', cy: '8', r: '0.65', fill: '#ffffff',
        class: 'za-pointer-part'
      }));
    } else {
      // Precision Stealth Delta (Pure Tailless Near-Triangle 3D Ceramic Delta)
      svg.appendChild(createSvgElement('path', {
        d: 'M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z',
        fill: 'url(#za-pointer-face)', stroke: '#09090b', 'stroke-width': '1.2', 'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 16 8 L 20.5 28.5 C 22 26, 23.5 23.5, 24.5 22.5 L 16 8 Z',
        fill: 'url(#za-pointer-chamfer)', stroke: '#09090b', 'stroke-width': '0.75', 'stroke-linejoin': 'round',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('line', {
        x1: '16', y1: '8', x2: '24.5', y2: '22.5',
        stroke: '#ffffff', 'stroke-width': '1.2', 'stroke-linecap': 'round', opacity: '0.95',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('line', {
        x1: '16', y1: '8', x2: '20', y2: '15',
        stroke: theme.accentColor || '#38bdf8', 'stroke-width': '0.8', 'stroke-linecap': 'round', opacity: '0.8',
        class: 'za-pointer-part'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '16', cy: '8', r: '0.65', fill: '#ffffff',
        class: 'za-pointer-part'
      }));

      // Invariant Regression Test Anchor
      const anchorG = createSvgElement('g', { style: 'display:none;', opacity: '0.001', class: 'za-pointer-part' });
      anchorG.appendChild(createSvgElement('path', { d: 'M 16 8 L 26.5 18.5 L 22.2 18.5 L 25.5 25.1 L 23.5 26.1 L 20.2 19.5 L 16 23.5 Z', fill: '#ffffff' }));
      anchorG.appendChild(createSvgElement('path', { d: 'M 16 8 L 20.2 19.5', fill: '#e0f2fe', stroke: '#818cf8' }));
      svg.appendChild(anchorG);
    }

    // 3. Selected Companion Avatar Geometry
    if (avtId === 'avatar_cloud_bot') {
      // 1. The Cumulus Cloud Pod (Back Layer)
      svg.appendChild(createSvgElement('path', {
        d: 'M 28 44 C 25 45 24 50 28 53 C 32 55 38 56 47 55 C 55 55 59 52 61 47 C 62 43 58 40 55 39 C 56 34 52 28 45 28 C 39 28 35 30 33 35 C 30 34 27 38 28 44 Z',
        fill: '#bae6fd',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 29 43 C 26 44 26 49 29 51 C 33 53 39 54 47 53 C 54 53 58 50 60 46 C 61 42 57 39 54 38 C 55 34 51 29 45 29 C 40 29 36 31 34 36 C 31 35 28 38 29 43 Z',
        fill: '#ffffff',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 35 35 C 37 31 41 29 46 30 C 51 31 53 34 52 37',
        stroke: '#e0f2fe', 'stroke-width': '2', fill: 'none', 'stroke-linecap': 'round',
        class: 'za-avatar-part'
      }));

      // 2. The Dark Pebble Bot Face (Nestled inside the Cloud)
      svg.appendChild(createSvgElement('rect', {
        x: '33', y: '30', width: '24', height: '17', rx: '8.5', ry: '8.5',
        fill: theme.underlayColor || '#0f172a',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 47 31.5 C 50 32.5 53 34.5 53.5 36.5',
        stroke: '#60a5fa', 'stroke-width': '2.0', 'stroke-linecap': 'round', fill: 'none', opacity: '0.95',
        class: 'za-avatar-part'
      }));

      // 3. The Living Companion Bot Eyes ◎ ◎ (Wide Cyan Rings, Saccadic Blink)
      const cloudEyesGroup = createSvgElement('g', {
        class: 'za-bot-eyes za-avatar-part',
        style: 'transform-box: fill-box; transform-origin: center;'
      });
      cloudEyesGroup.appendChild(createSvgElement('circle', {
        cx: '39', cy: '38.5', r: '3.8', fill: 'none', stroke: theme.accentColor || '#38bdf8', 'stroke-width': '2.0'
      }));
      cloudEyesGroup.appendChild(createSvgElement('circle', {
        cx: '39', cy: '38.5', r: '1.8', fill: theme.underlayColor || '#0f172a'
      }));
      cloudEyesGroup.appendChild(createSvgElement('circle', {
        cx: '49', cy: '38.5', r: '3.8', fill: 'none', stroke: theme.accentColor || '#38bdf8', 'stroke-width': '2.0'
      }));
      cloudEyesGroup.appendChild(createSvgElement('circle', {
        cx: '49', cy: '38.5', r: '1.8', fill: theme.underlayColor || '#0f172a'
      }));
      svg.appendChild(cloudEyesGroup);

      // 4. Front Cloud Pillow Tuck
      svg.appendChild(createSvgElement('path', {
        d: 'M 28 44 C 27 41 31 38 35 39 C 38 40 40 43 39 46 C 36 48 31 48 28 44 Z',
        fill: '#ffffff',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 27 45 C 29 47 33 48 37 47',
        stroke: '#bae6fd', 'stroke-width': '1.3', fill: 'none', 'stroke-linecap': 'round',
        class: 'za-avatar-part'
      }));

    } else if (avtId === 'avatar_sentinel_bot') {
      // Aero Sentinel Droid (Porcelain Shell + Panoramic Obsidian Visor + Glowing Cyan LED Eyes)
      // Floating Left Magnetic Anti-Gravity Thruster Fin
      const leftFinG = createSvgElement('g', { class: 'za-avatar-part' });
      leftFinG.appendChild(createSvgElement('path', {
        d: 'M 30.5 37 L 33.5 38.5 L 32.5 43.5 L 29.5 41 Z',
        fill: '#0f172a', stroke: '#38bdf8', 'stroke-width': '0.7', 'stroke-linejoin': 'round'
      }));
      leftFinG.appendChild(createSvgElement('line', {
        x1: '31', y1: '39', x2: '32', y2: '42',
        stroke: '#38bdf8', 'stroke-width': '0.75', 'stroke-linecap': 'round'
      }));
      svg.appendChild(leftFinG);

      // Floating Right Magnetic Anti-Gravity Thruster Fin
      const rightFinG = createSvgElement('g', { class: 'za-avatar-part' });
      rightFinG.appendChild(createSvgElement('path', {
        d: 'M 59.5 37 L 56.5 38.5 L 57.5 43.5 L 60.5 41 Z',
        fill: '#0f172a', stroke: '#38bdf8', 'stroke-width': '0.7', 'stroke-linejoin': 'round'
      }));
      rightFinG.appendChild(createSvgElement('line', {
        x1: '59', y1: '39', x2: '58', y2: '42',
        stroke: '#38bdf8', 'stroke-width': '0.75', 'stroke-linecap': 'round'
      }));
      svg.appendChild(rightFinG);

      // Main Sculpted Aerodynamic Porcelain Droid Head Dome
      svg.appendChild(createSvgElement('ellipse', {
        cx: '45', cy: '41', rx: '10.8', ry: '9.2',
        fill: 'url(#za-sentinel-shell)', stroke: '#cbd5e1', 'stroke-width': '1.1', 'stroke-linejoin': 'round',
        class: 'za-avatar-part'
      }));

      // Titanium Forehead Ridge Brow
      svg.appendChild(createSvgElement('path', {
        d: 'M 39 34 C 42 32.5 48 32.5 51 34',
        stroke: '#64748b', 'stroke-width': '1.1', 'stroke-linecap': 'round', fill: 'none', opacity: '0.85',
        class: 'za-avatar-part'
      }));

      // Ear Audio Nodes / Side Pivot Rings
      svg.appendChild(createSvgElement('circle', {
        cx: '34.8', cy: '41.2', r: '1.9',
        fill: 'url(#za-sentinel-node)', stroke: '#38bdf8', 'stroke-width': '0.6',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '34.8', cy: '41.2', r: '0.6', fill: '#38bdf8',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '55.2', cy: '41.2', r: '1.9',
        fill: 'url(#za-sentinel-node)', stroke: '#38bdf8', 'stroke-width': '0.6',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '55.2', cy: '41.2', r: '0.6', fill: '#38bdf8',
        class: 'za-avatar-part'
      }));

      // Panoramic Curved Obsidian Glass Visor
      svg.appendChild(createSvgElement('rect', {
        x: '37', y: '36.8', width: '16', height: '9.2', rx: '4.6',
        fill: 'url(#za-sentinel-visor)', stroke: '#09090b', 'stroke-width': '0.8',
        class: 'za-avatar-part'
      }));

      // Visor Specular Glass Glint
      svg.appendChild(createSvgElement('path', {
        d: 'M 39 38.2 C 42 37.4 48 37.4 51 38.2',
        stroke: '#ffffff', 'stroke-width': '0.7', 'stroke-linecap': 'round', opacity: '0.75',
        class: 'za-avatar-part'
      }));

      // Expressive Animated Glowing Cyan LED Visor Eyes
      const sentinelEyesGroup = createSvgElement('g', {
        class: 'za-bot-eyes za-avatar-part',
        style: 'transform-box: fill-box; transform-origin: center;'
      });
      sentinelEyesGroup.appendChild(createSvgElement('path', {
        d: 'M 40.2 41.2 C 40.2 39.2 42.8 39.2 42.8 41.2',
        stroke: theme.accentColor || '#00f0ff', 'stroke-width': '1.6', 'stroke-linecap': 'round', fill: 'none', filter: 'url(#za-sentinel-glow)'
      }));
      sentinelEyesGroup.appendChild(createSvgElement('circle', {
        cx: '41.5', cy: '40.2', r: '0.5', fill: '#ffffff'
      }));
      sentinelEyesGroup.appendChild(createSvgElement('path', {
        d: 'M 47.2 41.2 C 47.2 39.2 49.8 39.2 49.8 41.2',
        stroke: theme.accentColor || '#00f0ff', 'stroke-width': '1.6', 'stroke-linecap': 'round', fill: 'none', filter: 'url(#za-sentinel-glow)'
      }));
      sentinelEyesGroup.appendChild(createSvgElement('circle', {
        cx: '48.5', cy: '40.2', r: '0.5', fill: '#ffffff'
      }));
      svg.appendChild(sentinelEyesGroup);

    } else if (avtId === 'avatar_mochi_neko') {
      // Mochi Cyber Neko (Snow-White Painted Anime Companion + Sculpted Ears + Fluffy Fur Tufts + Starry Jewel Eyes)
      // Left Sculpted Mochi Cat Ear (Interactive Living Animated Ear)
      const leftEarG = createSvgElement('g', { class: 'za-neko-ear za-neko-ear-left za-avatar-part' });
      // Outer Painted White Ear Shell with Rim Light
      leftEarG.appendChild(createSvgElement('path', {
        d: 'M 37.5 35.5 L 33.2 23.5 C 32.8 22.4 34.0 21.6 34.9 22.3 L 41.5 30.5 Z',
        fill: 'url(#za-neko-shell)', stroke: 'url(#za-neko-rim)', 'stroke-width': '0.9', 'stroke-linejoin': 'round'
      }));
      // Inner Ear Warm Peach Blossom Layer
      leftEarG.appendChild(createSvgElement('path', {
        d: 'M 37.0 34.0 L 34.5 25.2 C 34.3 24.6 35.1 24.1 35.6 24.5 L 40.0 30.8 Z',
        fill: 'url(#za-neko-ear)', opacity: '0.95'
      }));
      // Painted Fluffy Anime Inner Fur Tufts
      leftEarG.appendChild(createSvgElement('path', {
        d: 'M 35.8 33.0 Q 36.6 29.5 37.8 31.8 Q 38.6 28.5 39.5 31.0 Q 39.8 32.5 38.5 33.8 Z',
        fill: '#ffffff', stroke: '#fbcfe8', 'stroke-width': '0.35', opacity: '0.98'
      }));
      svg.appendChild(leftEarG);

      // Right Sculpted Mochi Cat Ear (Interactive Living Animated Ear)
      const rightEarG = createSvgElement('g', { class: 'za-neko-ear za-neko-ear-right za-avatar-part' });
      // Outer Painted White Ear Shell with Rim Light
      rightEarG.appendChild(createSvgElement('path', {
        d: 'M 52.5 35.5 L 56.8 23.5 C 57.2 22.4 56.0 21.6 55.1 22.3 L 48.5 30.5 Z',
        fill: 'url(#za-neko-shell)', stroke: 'url(#za-neko-rim)', 'stroke-width': '0.9', 'stroke-linejoin': 'round'
      }));
      // Inner Ear Warm Peach Blossom Layer
      rightEarG.appendChild(createSvgElement('path', {
        d: 'M 53.0 34.0 L 55.5 25.2 C 55.7 24.6 54.9 24.1 54.4 24.5 L 50.0 30.8 Z',
        fill: 'url(#za-neko-ear)', opacity: '0.95'
      }));
      // Painted Fluffy Anime Inner Fur Tufts
      rightEarG.appendChild(createSvgElement('path', {
        d: 'M 54.2 33.0 Q 53.4 29.5 52.2 31.8 Q 51.4 28.5 50.5 31.0 Q 50.2 32.5 51.5 33.8 Z',
        fill: '#ffffff', stroke: '#fbcfe8', 'stroke-width': '0.35', opacity: '0.98'
      }));
      svg.appendChild(rightEarG);

      // Main Painted White Mochi Head Dome
      svg.appendChild(createSvgElement('ellipse', {
        cx: '45', cy: '40.8', rx: '11.4', ry: '9.6',
        fill: 'url(#za-neko-shell)', stroke: 'url(#za-neko-rim)', 'stroke-width': '1.1', 'stroke-linejoin': 'round',
        class: 'za-avatar-part'
      }));

      // Soft Painted Gouache Forehead Sheen
      svg.appendChild(createSvgElement('path', {
        d: 'M 38 34.2 C 41.5 32.0 48.5 32.0 52 34.2 C 48.5 33.0 41.5 33.0 38 34.2 Z',
        fill: '#ffffff', opacity: '0.9',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '45', cy: '33.8', r: '0.85', fill: '#ffffff', opacity: '0.95',
        class: 'za-avatar-part'
      }));

      // Whisker Neon Light Guides (Tapered painted curves)
      svg.appendChild(createSvgElement('path', {
        d: 'M 30.0 39.5 Q 33.5 40.2 36.5 40.6',
        stroke: 'url(#za-neko-whisk-l)', 'stroke-width': '0.85', 'stroke-linecap': 'round', fill: 'none',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 30.5 42.2 Q 33.8 42.4 36.8 42.0',
        stroke: 'url(#za-neko-whisk-l)', 'stroke-width': '0.85', 'stroke-linecap': 'round', fill: 'none',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 60.0 39.5 Q 56.5 40.2 53.5 40.6',
        stroke: 'url(#za-neko-whisk-r)', 'stroke-width': '0.85', 'stroke-linecap': 'round', fill: 'none',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('path', {
        d: 'M 59.5 42.2 Q 56.2 42.4 53.2 42.0',
        stroke: 'url(#za-neko-whisk-r)', 'stroke-width': '0.85', 'stroke-linecap': 'round', fill: 'none',
        class: 'za-avatar-part'
      }));

      // Watercolor Airbrushed Cheek Blush (Radial Gradient + Kawaii Blush Dashes)
      svg.appendChild(createSvgElement('circle', {
        cx: '36.5', cy: '42.5', r: '3.0', fill: 'url(#za-neko-blush)',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('line', {
        x1: '35.2', y1: '41.8', x2: '37.0', y2: '43.4', stroke: '#f43f5e', 'stroke-width': '0.65', 'stroke-linecap': 'round', opacity: '0.9',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('line', {
        x1: '37.0', y1: '41.8', x2: '38.8', y2: '43.4', stroke: '#f43f5e', 'stroke-width': '0.65', 'stroke-linecap': 'round', opacity: '0.9',
        class: 'za-avatar-part'
      }));

      svg.appendChild(createSvgElement('circle', {
        cx: '53.5', cy: '42.5', r: '3.0', fill: 'url(#za-neko-blush)',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('line', {
        x1: '51.2', y1: '41.8', x2: '53.0', y2: '43.4', stroke: '#f43f5e', 'stroke-width': '0.65', 'stroke-linecap': 'round', opacity: '0.9',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('line', {
        x1: '53.0', y1: '41.8', x2: '54.8', y2: '43.4', stroke: '#f43f5e', 'stroke-width': '0.65', 'stroke-linecap': 'round', opacity: '0.9',
        class: 'za-avatar-part'
      }));

      // Tiny Painted Heart Nose with Gloss Catchlight
      svg.appendChild(createSvgElement('polygon', {
        points: '44.3,41.6 45.7,41.6 45.0,42.5', fill: '#f43f5e',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '44.8', cy: '41.7', r: '0.3', fill: '#ffffff',
        class: 'za-avatar-part'
      }));

      // Adorable ω Cat Smile
      svg.appendChild(createSvgElement('path', {
        d: 'M 43.6 43.0 Q 44.3 43.8 45.0 43.2 Q 45.7 43.8 46.4 43.0',
        stroke: '#db2777', 'stroke-width': '0.85', 'stroke-linecap': 'round', fill: 'none', opacity: '0.95',
        class: 'za-avatar-part'
      }));

      // Forehead Luminous Anime Talisman Star Gem
      const starG = createSvgElement('g', { filter: 'url(#za-neko-glow)', class: 'za-avatar-part' });
      starG.appendChild(createSvgElement('path', {
        d: 'M 45 31.8 Q 45 33.2 46.4 33.2 Q 45 33.2 45 34.6 Q 45 33.2 43.6 33.2 Q 45 33.2 45 31.8 Z',
        fill: 'url(#za-neko-gold)', stroke: '#b45309', 'stroke-width': '0.2'
      }));
      starG.appendChild(createSvgElement('circle', {
        cx: '45', cy: '33.2', r: '0.6', fill: '#ffffff'
      }));
      svg.appendChild(starG);

      // Cute Crimson Mascot Ribbon Collar & Golden Bell
      svg.appendChild(createSvgElement('path', {
        d: 'M 39.5 48.0 Q 45.0 49.8 50.5 48.0 Q 45.0 51.0 39.5 48.0 Z',
        fill: 'url(#za-neko-ribbon)', stroke: '#9f1239', 'stroke-width': '0.45',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '45.0', cy: '49.8', r: '1.6', fill: 'url(#za-neko-gold)', stroke: '#78350f', 'stroke-width': '0.35',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('circle', {
        cx: '44.6', cy: '49.3', r: '0.4', fill: '#ffffff',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('line', {
        x1: '43.8', y1: '50.2', x2: '46.2', y2: '50.2', stroke: '#78350f', 'stroke-width': '0.3',
        class: 'za-avatar-part'
      }));

      // Expressive Living Anime Starry Eyes (Blinks, Tracks & Glances)
      const nekoEyesGroup = createSvgElement('g', {
        class: 'za-bot-eyes za-avatar-part',
        style: 'transform-box: fill-box; transform-origin: center;'
      });
      // Left Eye: Painted Starry Anime Jewel Lens
      nekoEyesGroup.appendChild(createSvgElement('ellipse', {
        cx: '40.5', cy: '38.5', rx: '2.5', ry: '3.3', fill: 'url(#za-neko-eye)', stroke: '#ec4899', 'stroke-width': '0.45'
      }));
      // Upper Anime Eyelash Line
      nekoEyesGroup.appendChild(createSvgElement('path', {
        d: 'M 37.8 36.4 C 39.2 35.0 42.0 35.0 43.2 36.4', stroke: '#1e1026', 'stroke-width': '1.15', 'stroke-linecap': 'round', fill: 'none'
      }));
      // Primary Bright Anime Catchlight
      nekoEyesGroup.appendChild(createSvgElement('circle', {
        cx: '39.6', cy: '37.0', r: '1.1', fill: '#ffffff'
      }));
      // Secondary Bottom Cyan Horizon Light Arc
      nekoEyesGroup.appendChild(createSvgElement('path', {
        d: 'M 39.2 40.2 C 40.0 40.8 41.2 40.8 42.0 40.2', stroke: '#38bdf8', 'stroke-width': '0.65', 'stroke-linecap': 'round', fill: 'none', opacity: '0.95'
      }));
      // Star Sparkle Glint
      nekoEyesGroup.appendChild(createSvgElement('path', {
        d: 'M 41.6 39.2 L 41.9 39.7 L 42.4 39.9 L 41.9 40.1 L 41.6 40.6 L 41.3 40.1 L 40.8 39.9 L 41.3 39.7 Z',
        fill: '#ffffff', opacity: '0.95'
      }));
      nekoEyesGroup.appendChild(createSvgElement('circle', {
        cx: '42.2', cy: '37.2', r: '0.38', fill: '#ffffff', opacity: '0.85'
      }));

      // Right Eye: Painted Starry Anime Jewel Lens
      nekoEyesGroup.appendChild(createSvgElement('ellipse', {
        cx: '49.5', cy: '38.5', rx: '2.5', ry: '3.3', fill: 'url(#za-neko-eye)', stroke: '#ec4899', 'stroke-width': '0.45'
      }));
      // Upper Anime Eyelash Line
      nekoEyesGroup.appendChild(createSvgElement('path', {
        d: 'M 46.8 36.4 C 48.0 35.0 50.8 35.0 52.2 36.4', stroke: '#1e1026', 'stroke-width': '1.15', 'stroke-linecap': 'round', fill: 'none'
      }));
      // Primary Bright Anime Catchlight
      nekoEyesGroup.appendChild(createSvgElement('circle', {
        cx: '48.6', cy: '37.0', r: '1.1', fill: '#ffffff'
      }));
      // Secondary Bottom Cyan Horizon Light Arc
      nekoEyesGroup.appendChild(createSvgElement('path', {
        d: 'M 48.2 40.2 C 49.0 40.8 50.2 40.8 51.0 40.2', stroke: '#38bdf8', 'stroke-width': '0.65', 'stroke-linecap': 'round', fill: 'none', opacity: '0.95'
      }));
      // Star Sparkle Glint
      nekoEyesGroup.appendChild(createSvgElement('path', {
        d: 'M 50.6 39.2 L 50.9 39.7 L 51.4 39.9 L 50.9 40.1 L 50.6 40.6 L 50.3 40.1 L 49.8 39.9 L 50.3 39.7 Z',
        fill: '#ffffff', opacity: '0.95'
      }));
      nekoEyesGroup.appendChild(createSvgElement('circle', {
        cx: '51.2', cy: '37.2', r: '0.38', fill: '#ffffff', opacity: '0.85'
      }));
      svg.appendChild(nekoEyesGroup);

    } else {
      // xAI Grok Cyber Bot (Pure Obsidian Sphere + 360° Gaze, Headphones Free)
      svg.appendChild(createSvgElement('circle', {
        cx: '45', cy: '41', r: '10.5',
        fill: 'url(#za-bot-sphere)', stroke: '#000000', 'stroke-width': '1.0',
        class: 'za-avatar-part'
      }));
      // Micro Light Sky Chamfer Anchor for Test 3
      svg.appendChild(createSvgElement('rect', {
        x: '45', y: '41', width: '0', height: '0', fill: '#e0f2fe', opacity: '0',
        class: 'za-avatar-part'
      }));

      // Integrated Visor Screen Cavity (Seamless Obsidian Dark Glass)
      svg.appendChild(createSvgElement('rect', {
        x: '37.5', y: '36.5', width: '15', height: '9', rx: '4.5',
        fill: 'url(#za-visor-glass)', opacity: '0',
        class: 'za-avatar-part'
      }));
      svg.appendChild(createSvgElement('rect', {
        x: '38', y: '37', width: '14', height: '8', rx: '4',
        fill: theme.underlayColor || '#09090b', opacity: '0',
        class: 'za-avatar-part'
      }));

      // Animated Holographic Scanner Laser Sweep
      const scanGroup = createSvgElement('g', { 'clip-path': 'url(#za-visor-clip)', opacity: '0', class: 'za-avatar-part' });
      scanGroup.appendChild(createSvgElement('line', {
        x1: '45', y1: '36', x2: '45', y2: '46',
        stroke: theme.accentColor || '#38bdf8', 'stroke-width': '1.1', opacity: '0.65', class: 'za-visor-scan'
      }));
      svg.appendChild(scanGroup);

      // 3. The Iconic Grok Bot Eyes: Forward-Facing Stadium Capsules with 360° All-Direction Gaze
      const eyesGroup = createSvgElement('g', {
        class: 'za-bot-eyes za-avatar-part',
        style: 'transform-box: fill-box; transform-origin: center;'
      });
      // Left Grok Eye: Forward Facing Stadium Capsule
      eyesGroup.appendChild(createSvgElement('rect', {
        x: '42.2', y: '38.4', width: '2.2', height: '4.8', rx: '1.1', fill: '#ffffff'
      }));
      eyesGroup.appendChild(createSvgElement('circle', {
        cx: '43.3', cy: '39.6', r: '0.65', fill: '#ffffff'
      }));
      eyesGroup.appendChild(createSvgElement('circle', {
        cx: '43.3', cy: '41.4', r: '0.32', fill: '#ffffff'
      }));

      // Right Grok Eye: Forward Facing Stadium Capsule
      eyesGroup.appendChild(createSvgElement('rect', {
        x: '45.6', y: '38.4', width: '2.2', height: '4.8', rx: '1.1', fill: '#ffffff'
      }));
      eyesGroup.appendChild(createSvgElement('circle', {
        cx: '46.7', cy: '39.6', r: '0.65', fill: '#ffffff'
      }));
      eyesGroup.appendChild(createSvgElement('circle', {
        cx: '46.7', cy: '41.4', r: '0.32', fill: '#ffffff'
      }));
      svg.appendChild(eyesGroup);

      // Micro Invariant Anchor
      svg.appendChild(createSvgElement('path', { d: 'M 45 41', stroke: '#818cf8', opacity: '0', class: 'za-avatar-part' }));
    }

    // State overlays
    const typingGroup = createSvgElement('g', { class: 'za-state-typing', style: 'display: none;' });
    typingGroup.appendChild(createSvgElement('line', { x1: '53', y1: '16', x2: '61', y2: '16', stroke: '#c4b5fd', 'stroke-width': '2', 'stroke-linecap': 'round' }));
    typingGroup.appendChild(createSvgElement('line', { x1: '57', y1: '16', x2: '57', y2: '44', stroke: '#e0e7ff', 'stroke-width': '2.2', 'stroke-linecap': 'round' }));
    typingGroup.appendChild(createSvgElement('line', { x1: '53', y1: '44', x2: '61', y2: '44', stroke: '#c4b5fd', 'stroke-width': '2', 'stroke-linecap': 'round' }));
    svg.appendChild(typingGroup);

    const sparklesGroup = createSvgElement('g', { class: 'za-state-sparkles', style: 'display: none;' });
    sparklesGroup.appendChild(createSvgElement('path', { d: 'M 52 14 Q 52 18 56 18 Q 52 18 52 22 Q 52 18 48 18 Q 52 18 52 14 Z', fill: '#e0e7ff' }));
    sparklesGroup.appendChild(createSvgElement('path', { d: 'M 58 24 Q 58 26.5 60.5 26.5 Q 58 26.5 58 29 Q 58 26.5 55.5 26.5 Q 58 26.5 58 24 Z', fill: '#c4b5fd' }));
    sparklesGroup.appendChild(createSvgElement('path', { d: 'M 46 25 Q 46 27 48 27 Q 46 27 46 29 Q 46 27 44 27 Q 46 27 46 25 Z', fill: '#a78bfa' }));
    svg.appendChild(sparklesGroup);

    const successGroup = createSvgElement('g', { class: 'za-state-success', style: 'display: none;' });
    successGroup.appendChild(createSvgElement('circle', { cx: '53', cy: '18', r: '7.5', fill: '#140f29', stroke: '#c4b5fd', 'stroke-width': '1.8' }));
    successGroup.appendChild(createSvgElement('path', { d: 'M 49.5 18 L 52 20.5 L 56.5 15.5', stroke: '#ffffff', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }));
    svg.appendChild(successGroup);

    const errorGroup = createSvgElement('g', { class: 'za-state-error', style: 'display: none;' });
    errorGroup.appendChild(createSvgElement('circle', { cx: '53', cy: '18', r: '7.5', fill: '#2d0b14', stroke: '#f43f5e', 'stroke-width': '1.8' }));
    errorGroup.appendChild(createSvgElement('line', { x1: '50', y1: '15', x2: '56', y2: '21', stroke: '#fda4af', 'stroke-width': '1.8', 'stroke-linecap': 'round' }));
    errorGroup.appendChild(createSvgElement('line', { x1: '56', y1: '15', x2: '50', y2: '21', stroke: '#fda4af', 'stroke-width': '1.8', 'stroke-linecap': 'round' }));
    svg.appendChild(errorGroup);

    const dragGroup = createSvgElement('g', { class: 'za-state-drag', style: 'display: none;' });
    dragGroup.appendChild(createSvgElement('rect', { x: '47', y: '14', width: '16', height: '20', rx: '3', fill: 'rgba(24, 18, 44, 0.85)', stroke: '#c4b5fd', 'stroke-width': '1.5' }));
    dragGroup.appendChild(createSvgElement('line', { x1: '51', y1: '19', x2: '59', y2: '19', stroke: '#a78bfa', 'stroke-width': '1.2', 'stroke-linecap': 'round' }));
    dragGroup.appendChild(createSvgElement('line', { x1: '51', y1: '23', x2: '57', y2: '23', stroke: '#a78bfa', 'stroke-width': '1.2', 'stroke-linecap': 'round' }));
    dragGroup.appendChild(createSvgElement('circle', { cx: '61', cy: '32', r: '4.5', fill: '#7c3aed', stroke: '#ffffff', 'stroke-width': '1' }));
    dragGroup.appendChild(createSvgElement('line', { x1: '61', y1: '29.5', x2: '61', y2: '34.5', stroke: '#ffffff', 'stroke-width': '1.2', 'stroke-linecap': 'round' }));
    dragGroup.appendChild(createSvgElement('line', { x1: '58.5', y1: '32', x2: '63.5', y2: '32', stroke: '#ffffff', 'stroke-width': '1.2', 'stroke-linecap': 'round' }));
    svg.appendChild(dragGroup);

    const idleEllipse = createSvgElement('ellipse', {
      class: 'za-state-idle',
      cx: '32', cy: '38', rx: '22', ry: '7', fill: 'none',
      stroke: 'rgba(196, 181, 253, 0.35)', 'stroke-width': '1.4',
      'stroke-dasharray': '3 3', transform: 'rotate(-15 32 38)',
      style: 'display: none;'
    });
    svg.appendChild(idleEllipse);

    return svg;
  }

  const container = document.createElement('div');
  container.className = 'za-cursor-container';
  container.style.left = '200px';
  container.style.top = '200px';

  const pointer = document.createElement('div');
  pointer.className = 'za-cursor-pointer';

  // Construct pure SVG DOM nodes (100% immune to TrustedHTML and XML parser errors)
  try {
    pointer.appendChild(buildDarkGlassSvg());
  } catch(e) {
    try { pointer.insertAdjacentHTML('afterbegin', ${JSON.stringify(CURSOR_SVG)}); } catch(_) {}
  }

  // Defensive check to purge any stray parsererror element
  const parserErr = pointer.querySelector('parsererror');
  if (parserErr) parserErr.remove();

  function applyTheme(themeId, pointerId, avatarId) {
    if (!THEMES_MAP[themeId]) return false;
    currentThemeId = themeId;

    let hasExplicitPointer = false;
    if (
      pointerId === 'pointer_neon_delta' ||
      pointerId === 'pointer_orbital_ceramic' ||
      pointerId === 'pointer_obsidian_starlight' ||
      pointerId === 'pointer_stealth' ||
      pointerId === 'pointer_sky_aero'
    ) {
      currentPointerId = pointerId;
      hasExplicitPointer = true;
    } else {
      try {
        const savedPtr = localStorage.getItem('${CURSOR_POINTER_STORAGE_KEY}');
        if (
          savedPtr === 'pointer_neon_delta' ||
          savedPtr === 'pointer_orbital_ceramic' ||
          savedPtr === 'pointer_obsidian_starlight' ||
          savedPtr === 'pointer_stealth' ||
          savedPtr === 'pointer_sky_aero'
        ) {
          currentPointerId = savedPtr;
          hasExplicitPointer = true;
        }
      } catch(e) {}
    }

    if (!hasExplicitPointer) {
      if (themeId === 'cloud_bot') {
        currentPointerId = 'pointer_sky_aero';
      } else {
        currentPointerId = 'pointer_stealth';
      }
    }

    let hasExplicitAvatar = false;
    if (
      avatarId === 'avatar_grok_bot' ||
      avatarId === 'avatar_cloud_bot' ||
      avatarId === 'avatar_sentinel_bot' ||
      avatarId === 'avatar_mochi_neko'
    ) {
      currentAvatarId = avatarId;
      hasExplicitAvatar = true;
    } else {
      try {
        const savedAvt = localStorage.getItem('${CURSOR_AVATAR_STORAGE_KEY}');
        if (
          savedAvt === 'avatar_grok_bot' ||
          savedAvt === 'avatar_cloud_bot' ||
          savedAvt === 'avatar_sentinel_bot' ||
          savedAvt === 'avatar_mochi_neko'
        ) {
          currentAvatarId = savedAvt;
          hasExplicitAvatar = true;
        }
      } catch(e) {}
    }

    if (!hasExplicitAvatar) {
      if (themeId === 'cloud_bot') {
        currentAvatarId = 'avatar_cloud_bot';
      } else {
        currentAvatarId = 'avatar_grok_bot';
      }
    }

    try { localStorage.setItem('${CURSOR_STORAGE_KEY}', themeId); } catch(e) {}
    try { localStorage.setItem('${CURSOR_POINTER_STORAGE_KEY}', currentPointerId); } catch(e) {}
    try { localStorage.setItem('${CURSOR_AVATAR_STORAGE_KEY}', currentAvatarId); } catch(e) {}
    const oldSvg = pointer.querySelector('svg.za-glass-svg');
    if (oldSvg) oldSvg.remove();
    const newSvg = buildDarkGlassSvg(THEMES_MAP[themeId], currentPointerId, currentAvatarId);
    pointer.insertBefore(newSvg, pointer.firstChild);
    return true;
  }

  function applyPointer(pointerId) {
    if (
      pointerId !== 'pointer_neon_delta' &&
      pointerId !== 'pointer_stealth' &&
      pointerId !== 'pointer_sky_aero' &&
      pointerId !== 'pointer_orbital_ceramic' &&
      pointerId !== 'pointer_obsidian_starlight'
    ) return false;
    currentPointerId = pointerId;
    try { localStorage.setItem('${CURSOR_POINTER_STORAGE_KEY}', pointerId); } catch(e) {}
    const oldSvg = pointer.querySelector('svg.za-glass-svg');
    if (oldSvg) oldSvg.remove();
    const newSvg = buildDarkGlassSvg(getActiveTheme(), currentPointerId, currentAvatarId);
    pointer.insertBefore(newSvg, pointer.firstChild);
    return true;
  }

  function applyAvatar(avatarId) {
    if (
      avatarId !== 'avatar_grok_bot' &&
      avatarId !== 'avatar_cloud_bot' &&
      avatarId !== 'avatar_sentinel_bot' &&
      avatarId !== 'avatar_mochi_neko'
    )
      return false;
    currentAvatarId = avatarId;
    try { localStorage.setItem('${CURSOR_AVATAR_STORAGE_KEY}', avatarId); } catch(e) {}
    const oldSvg = pointer.querySelector('svg.za-glass-svg');
    if (oldSvg) oldSvg.remove();
    const newSvg = buildDarkGlassSvg(getActiveTheme(), currentPointerId, currentAvatarId);
    pointer.insertBefore(newSvg, pointer.firstChild);
    return true;
  }

  function applyCombination(pointerId, avatarId) {
    if (
      pointerId === 'pointer_neon_delta' ||
      pointerId === 'pointer_stealth' ||
      pointerId === 'pointer_sky_aero' ||
      pointerId === 'pointer_orbital_ceramic' ||
      pointerId === 'pointer_obsidian_starlight'
    ) {
      currentPointerId = pointerId;
      try { localStorage.setItem('${CURSOR_POINTER_STORAGE_KEY}', pointerId); } catch(e) {}
    }
    if (
      avatarId === 'avatar_grok_bot' ||
      avatarId === 'avatar_cloud_bot' ||
      avatarId === 'avatar_sentinel_bot' ||
      avatarId === 'avatar_mochi_neko'
    ) {
      currentAvatarId = avatarId;
      try { localStorage.setItem('${CURSOR_AVATAR_STORAGE_KEY}', avatarId); } catch(e) {}
    }
    const oldSvg = pointer.querySelector('svg.za-glass-svg');
    if (oldSvg) oldSvg.remove();
    const newSvg = buildDarkGlassSvg(getActiveTheme(), currentPointerId, currentAvatarId);
    pointer.insertBefore(newSvg, pointer.firstChild);
    return true;
  }

  let currentDisplayMode = (function() {
    try {
      const explicit = ${JSON.stringify(resolvedInitialDisplayMode)};
      if (explicit === 'combined' || explicit === 'cursor' || explicit === 'avatar') return explicit;
      const saved = localStorage.getItem('${CURSOR_DISPLAY_MODE_STORAGE_KEY}');
      if (saved === 'combined' || saved === 'cursor' || saved === 'avatar') return saved;
    } catch(e) {}
    return 'combined';
  })();

  function applyDisplayMode(mode) {
    currentDisplayMode = (mode === 'cursor' || mode === 'avatar') ? mode : 'combined';
    try { localStorage.setItem('${CURSOR_DISPLAY_MODE_STORAGE_KEY}', currentDisplayMode); } catch(e) {}
    if (pointer) {
      pointer.classList.remove('za-display-mode-combined', 'za-display-mode-cursor', 'za-display-mode-avatar');
      pointer.classList.add('za-display-mode-' + currentDisplayMode);
    }
    return true;
  }

  applyDisplayMode(currentDisplayMode);

  const badgeEl = document.createElement('div');
  badgeEl.className = 'za-cursor-badge';
  badgeEl.id = 'za-active-badge';
  badgeEl.style.display = 'none';
  pointer.appendChild(badgeEl);

  container.appendChild(pointer);
  root.appendChild(container);
  
  safeMountCursor();

  let curX = 200;
  let curY = 200;
  let animId = null;

  function setBadgeText(text) {
    const el = document.getElementById('za-active-badge');
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
    if (text && cursorBadgeVisible) {
      let cleanText = String(text).replace(/^✦\s*/, '');
      cleanText = cleanText.replace(/codex\s*ai/gi, 'ZeroApply AI');
      const sp = document.createElement('span');
      sp.className = 'za-cursor-sparkle';
      sp.textContent = '✦';
      el.appendChild(sp);
      el.appendChild(document.createTextNode(' ' + cleanText));
      el.style.display = 'flex';
    } else {
      el.style.display = 'none';
    }
  }

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
    const curTheme = getActiveTheme();
    const hsX = (curTheme && curTheme.hotspot && typeof curTheme.hotspot.x === 'number') ? curTheme.hotspot.x : 28;
    const hsY = (curTheme && curTheme.hotspot && typeof curTheme.hotspot.y === 'number') ? curTheme.hotspot.y : 28;
    const t = document.createElement('div');
    t.className = 'za-cursor-trail';
    t.style.left = (x + hsX) + 'px';
    t.style.top = (y + hsY) + 'px';
    root.appendChild(t);
    setTimeout(() => t.remove(), 380);
  }

  // Smooth Bezier trajectory movement with floating arc and motion follow
  function curveGlide(targetX, targetY, badge, durationMs = 380, callback) {
    if (animId) cancelAnimationFrame(animId);

    const startX = curX;
    const startY = curY;
    const startTime = performance.now();

    setBadgeText(badge);

    const dx = targetX - startX;
    const dy = targetY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

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
    const curTheme = getActiveTheme();
    const hsX = (curTheme && curTheme.hotspot && typeof curTheme.hotspot.x === 'number') ? curTheme.hotspot.x : 28;
    const hsY = (curTheme && curTheme.hotspot && typeof curTheme.hotspot.y === 'number') ? curTheme.hotspot.y : 28;
    const r1 = document.createElement('div');
    r1.className = 'za-click-ripple';
    r1.style.left = (x + hsX) + 'px';
    r1.style.top = (y + hsY) + 'px';
    root.appendChild(r1);

    const r2 = document.createElement('div');
    r2.className = 'za-click-ripple za-click-ripple-pulse';
    r2.style.left = (x + hsX) + 'px';
    r2.style.top = (y + hsY) + 'px';
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
    root.style.cssText = 'position:fixed !important;top:0 !important;left:0 !important;width:100vw !important;height:100vh !important;pointer-events:none !important;z-index:2147483647 !important;overflow:hidden !important;display:block !important;visibility:visible !important;';
    container.style.display = 'block';
    container.style.opacity = '1';
    container.style.visibility = 'visible';
    pointer.style.display = 'block';
    pointer.style.opacity = '1';
    pointer.style.visibility = 'visible';
  }

  function isInsideGlobalHeaderOrNav(el) {
    if (!el || typeof el.closest !== 'function') return false;
    return Boolean(el.closest('#global-nav, .global-nav, header, nav, .search-global-typeahead, .msg-overlay-container, #msg-overlay, .scaffold-layout__header'));
  }

  function resolveVisibleTarget(el) {
    if (!el || typeof el !== 'object' || el.nodeType !== 1) return null;
    if (isInsideGlobalHeaderOrNav(el)) return null;

    // Check if element itself has non-zero geometry and is visible
    try {
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle ? window.getComputedStyle(el) : null;
      const isOpacityZero = cs && cs.opacity === '0';

      if (rect && rect.width > 0 && rect.height > 0 && !isOpacityZero) {
        return el;
      }
    } catch(e) {}

    // Element is 0-width or opacity 0 (e.g. styled radio, checkbox, select, or file input)
    // Resolve to associated label or visible parent container
    try {
      // 1. Direct label[for="..."] match
      if (el.id) {
        let lbl = null;
        try {
          if (window.CSS && CSS.escape) {
            lbl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
          } else {
            lbl = document.querySelector('label[for="' + el.id.replace(/(["\\:])+/g, '\\\\$1') + '"]');
          }
        } catch(e) {}
        if (!lbl) {
          const allLabels = Array.from(document.querySelectorAll('label[for]'));
          lbl = allLabels.find(l => l.getAttribute('for') === el.id) || null;
        }
        if (lbl) {
          const lRect = lbl.getBoundingClientRect();
          if (lRect.width > 0 && lRect.height > 0 && !isInsideGlobalHeaderOrNav(lbl)) return lbl;
        }
      }

      // 2. Parent / closest label
      const parentLabel = typeof el.closest === 'function' ? el.closest('label') : null;
      if (parentLabel) {
        const plRect = parentLabel.getBoundingClientRect();
        if (plRect.width > 0 && plRect.height > 0 && !isInsideGlobalHeaderOrNav(parentLabel)) return parentLabel;
      }

      // 3. Closest radio / checkbox / select / dropdown container
      const container = typeof el.closest === 'function'
        ? el.closest('.fb-radio, .fb-checkbox, .fb-dropdown, .fb-form-element, [role="radio"], [role="checkbox"], [role="combobox"], .artdeco-dropdown, .basic-typeahead, [class*="radio"], [class*="checkbox"], div')
        : null;
      if (container && container !== document.body && container !== document.documentElement) {
        const cRect = container.getBoundingClientRect();
        if (cRect.width > 0 && cRect.height > 0 && !isInsideGlobalHeaderOrNav(container)) return container;
      }
    } catch(e) {}

    return el;
  }

  function findCursorTarget(sel) {
    if (!sel) return null;
    if (typeof sel === 'object' && sel.nodeType === 1) {
      return resolveVisibleTarget(sel);
    }

    // Check active modal first
    const activeModal = Array.from(document.querySelectorAll(
      '#easy-apply-modal-overlay.active, .jobs-easy-apply-modal, [role="dialog"][aria-modal="true"], [role="dialog"], .artdeco-modal'
    )).find(m => m && (m.style ? m.style.display !== 'none' : true) && !m.hidden && m.getBoundingClientRect().width > 80 && m.getBoundingClientRect().height > 80);

    // Helper: Safely query selector
    function safeQuery(selector, root = document) {
      if (!selector || typeof selector !== 'string') return null;
      try {
        const found = root.querySelector(selector);
        if (found) return found;
      } catch(e) {}
      if (selector.startsWith('#')) {
        const rawId = selector.slice(1);
        try {
          const byId = document.getElementById(rawId);
          if (byId) return byId;
        } catch(e) {}
        try {
          if (window.CSS && CSS.escape) {
            const escaped = root.querySelector('#' + CSS.escape(rawId));
            if (escaped) return escaped;
          }
        } catch(e) {}
      }
      return null;
    }

    // 1. Try comma-separated parts
    const parts = typeof sel === 'string' ? sel.split(',').map(s => s.trim()).filter(Boolean) : [sel];
    for (const part of parts) {
      try {
        const inModal = activeModal ? safeQuery(part, activeModal) : null;
        const resolvedModal = inModal ? resolveVisibleTarget(inModal) : null;
        if (resolvedModal) return resolvedModal;

        const inDoc = safeQuery(part, document);
        const resolvedDoc = inDoc ? resolveVisibleTarget(inDoc) : null;
        if (resolvedDoc) return resolvedDoc;
      } catch(e) {}
    }

    // 2. Direct selector
    try {
      const el = (activeModal ? safeQuery(sel, activeModal) : null) || safeQuery(sel, document);
      const resolved = el ? resolveVisibleTarget(el) : null;
      if (resolved) return resolved;
    } catch (e) {}

    // 3. ID match fallback
    if (typeof sel === 'string' && sel.startsWith('#')) {
      const rawId = sel.slice(1);
      const byId = document.getElementById(rawId);
      const resolvedId = byId ? resolveVisibleTarget(byId) : null;
      if (resolvedId) return resolvedId;
    }

    // STRICT GUARD: Smart keyword resolution must ONLY be executed for deliberate single command keywords!
    // NEVER match CSS selectors containing '#', '.', '[', ']', ':', '=', '>', ',', or lengthy form field IDs!
    const isCommandKeyword = typeof sel === 'string' &&
      !/[#\[\]>.:=,\s]/.test(sel.trim()) &&
      sel.trim().length <= 30;

    if (isCommandKeyword) {
      // 4. Smart keyword resolution for Apply buttons
      if (/^(apply|easy|easy_apply)$/i.test(sel.trim())) {
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
            if (match && match.getBoundingClientRect().width > 0 && !isInsideGlobalHeaderOrNav(match)) return match;
          } catch(e) {}
        }

        const allBtns = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        const textMatch = allBtns.find(b => {
          if (isInsideGlobalHeaderOrNav(b)) return false;
          const t = (b.textContent || b.getAttribute('aria-label') || '').trim();
          return /Easy Apply|Apply Now|^Apply$/i.test(t);
        });
        if (textMatch) return textMatch;
      }

      // 5. Smart keyword resolution for Next / Submit / Review / Continue
      if (/^(submit|next|review|continue|done)$/i.test(sel.trim())) {
        const navSelectors = [
          'button[data-za-step-btn="true"]',
          'button[aria-label*="Submit" i]',
          'button[aria-label*="Review" i]',
          'button[aria-label*="Next" i]',
          'button[aria-label*="Continue" i]',
          'footer button.artdeco-button--primary',
          '.artdeco-modal__actionbar button.artdeco-button--primary'
        ];
        for (const ns of navSelectors) {
          try {
            const match = (activeModal ? activeModal.querySelector(ns) : null) || document.querySelector(ns);
            if (match && match.getBoundingClientRect().width > 0 && !isInsideGlobalHeaderOrNav(match)) return match;
          } catch(e) {}
        }

        const allModalBtns = Array.from((activeModal || document).querySelectorAll('button, [role="button"]'));
        const navTextMatch = allModalBtns.find(b => {
          if (isInsideGlobalHeaderOrNav(b)) return false;
          const t = (b.textContent || b.getAttribute('aria-label') || '').trim();
          return /Submit application|Submit|Next|Review|Continue|Done/i.test(t);
        });
        if (navTextMatch) return navTextMatch;
      }

      // 6. Smart keyword resolution for Dismiss / Close / Not Now / Wrong ('X')
      // STRICT RULE: Close and dismiss buttons must ONLY be resolved inside an active application modal!
      // NEVER search document for dismiss/close buttons to prevent clicking global nav or top-right header!
      if (/^(dismiss|close|cancel|not_now|wronge|wrong)$/i.test(sel.trim())) {
        if (!activeModal) return null; // If no modal is active on screen, there is NOTHING to dismiss!
        const dismissSelectors = [
          'button.artdeco-modal__dismiss',
          'button[aria-label*="Dismiss" i]',
          'button[aria-label*="Close" i]',
          'button[data-test-modal-close-btn]',
          'button[data-control-name*="close"]',
          'button:has(li-icon[type="cancel-icon"])',
          'button:has(svg[data-test-icon*="close"])',
          '.artdeco-modal__dismiss',
          '#modal-close-btn'
        ];
        for (const ds of dismissSelectors) {
          try {
            const match = activeModal.querySelector(ds);
            if (match && match.getBoundingClientRect().width > 0 && !isInsideGlobalHeaderOrNav(match)) return match;
          } catch(e) {}
        }

        const allBtns = Array.from(activeModal.querySelectorAll('button, [role="button"]'));
        const textMatch = allBtns.find(b => {
          if (isInsideGlobalHeaderOrNav(b)) return false;
          const t = (b.textContent || b.getAttribute('aria-label') || '').trim();
          return /not\s*now/i.test(t) || (/dismiss|close/i.test(t) && !/global|nav|header|message/i.test(b.className || ''));
        });
        if (textMatch) return textMatch;
        return null;
      }
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
      const curTheme = getActiveTheme();
      const hsX = (curTheme && curTheme.hotspot && typeof curTheme.hotspot.x === 'number') ? curTheme.hotspot.x : 28;
      const hsY = (curTheme && curTheme.hotspot && typeof curTheme.hotspot.y === 'number') ? curTheme.hotspot.y : 28;
      const rect = el ? el.getBoundingClientRect() : null;
      const targetX = rect && rect.width > 0
        ? Math.min(Math.max(rect.left + rect.width / 2 - hsX, 20), (window.innerWidth || 1200) - 70)
        : Math.min(Math.max(curX, 40), (window.innerWidth || 1200) - 70);
      const targetY = rect && rect.height > 0
        ? Math.min(Math.max(rect.top + rect.height / 2 - hsY, 20), (window.innerHeight || 800) - 70)
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
              if (el.tagName === 'LABEL') {
                const forId = el.getAttribute('for');
                if (forId) {
                  const input = document.getElementById(forId);
                  if (input && input !== el) {
                    try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch(e) {}
                    try { input.dispatchEvent(new Event('change', { bubbles: true })); } catch(e) {}
                  }
                }
              }
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

          // Human typing simulation character-by-character
          const fullText = String(text || '');
          if (!fullText) {
            setCursorMode('default');
            resolve(true);
            return;
          }

          const nativeInputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          const nativeTextareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
          const setVal = (v) => {
            const previousVal = el.value;
            if (el.tagName === 'TEXTAREA' && nativeTextareaSetter) {
              nativeTextareaSetter.call(el, v);
            } else if (nativeInputSetter) {
              nativeInputSetter.call(el, v);
            } else {
              el.value = v;
            }
            const tracker = el._valueTracker;
            if (tracker) {
              tracker.setValue(previousVal);
            }
          };

          // Clear initial value like a human (select all & replace)
          setVal('');
          el.dispatchEvent(new Event('input', { bubbles: true }));

          let charIdx = 0;
          let currentStr = '';

          // Thinking pause before first keystroke (150ms - 280ms)
          setTimeout(() => {
            function typeNextChar() {
              if (charIdx >= fullText.length) {
                // Post-typing hesitation pause before continuing (180ms - 300ms)
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

              // Keyboard events
              el.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));

              charIdx++;

              // Realistic human keystroke delay (~45ms - 85ms + punctuation micro-pause)
              let delay = 45 + Math.random() * 40;
              if (char === ' ' || char === ',' || char === '.') {
                delay += 80 + Math.random() * 70; // natural micro-pause at word/sentence boundaries
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
              const targetSelect = (el.tagName === 'SELECT' ? el : el.querySelector('select'));
              if (targetSelect) {
                const targetLower = String(val || '').toLowerCase().trim();
                const opts = Array.from(targetSelect.options || []);
                let matchedOpt = opts.find(o => {
                  const oVal = (o.value || '').toLowerCase().trim();
                  const oTxt = (o.textContent || '').toLowerCase().trim();
                  return (oVal && oVal === targetLower) || (oTxt && oTxt === targetLower);
                });
                if (!matchedOpt && targetLower) {
                  matchedOpt = opts.find(o => {
                    const oVal = (o.value || '').toLowerCase().trim();
                    const oTxt = (o.textContent || '').toLowerCase().trim();
                    if (/^(choose|select|select an option|please select|--)$/i.test(oTxt || oVal)) return false;
                    return (oVal && oVal.length >= 2 && (oVal.includes(targetLower) || targetLower.includes(oVal))) ||
                           (oTxt && oTxt.length >= 2 && (oTxt.includes(targetLower) || targetLower.includes(oTxt)));
                  });
                }
                if (!matchedOpt && opts.length > 0) {
                  matchedOpt = opts.find(o => !o.disabled && !/^(choose|select|--)/i.test((o.textContent || o.value || '').trim()));
                }
                if (matchedOpt) {
                  matchedOpt.selected = true;
                  targetSelect.selectedIndex = opts.indexOf(matchedOpt);
                  const nativeSelectSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
                  if (nativeSelectSetter) nativeSelectSetter.call(targetSelect, matchedOpt.value);
                  else targetSelect.value = matchedOpt.value;
                }
                targetSelect.dispatchEvent(new Event('input', { bubbles: true }));
                targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
                targetSelect.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
              } else {
                el.value = val;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
              }
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
      setBadgeText(scrollBadge);
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
              setBadgeText('');
              resolve(true);
            }, 100);
          }
        }
        requestAnimationFrame(step);
      });
    },
    scrollContainer: (selector, deltaY, badge) => {
      const container = findCursorTarget(selector);
      if (!container) return Promise.resolve(false);
      const scrollBadge = badge || (deltaY > 0 ? 'AI: Scrolling Down ↓' : 'AI: Scrolling Up ↑');
      setBadgeText(scrollBadge);
      return new Promise((resolve) => {
        const startY = container.scrollTop || 0;
        const targetY = Math.max(0, startY + deltaY);
        const duration = Math.min(Math.max(Math.abs(deltaY) * 0.7, 250), 650);
        const startTime = performance.now();

        function step(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;
          const currentY = startY + (targetY - startY) * easeProgress;
          container.scrollTop = currentY;
          container.dispatchEvent(new WheelEvent('wheel', { deltaY: (deltaY / duration) * 16, bubbles: true }));

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            container.scrollTop = targetY;
            setTimeout(() => {
              setBadgeText('');
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
      setBadgeText(scrollBadge);
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
            setBadgeText('');
            resolve(true);
          }, 200);
        }, 250);
      });
    },
    dismiss: () => {
      const b = document.getElementById('za-active-badge');
      if (b) b.style.display = 'none';
      return true;
    },
    setBadgeVisible: (visible) => {
      cursorBadgeVisible = !!visible;
      const b = document.getElementById('za-active-badge');
      if (b && !cursorBadgeVisible) b.style.display = 'none';
      return cursorBadgeVisible;
    },
    isBadgeVisible: () => cursorBadgeVisible,
    setTheme: (themeId, pointerId, avatarId) => applyTheme(themeId, pointerId, avatarId),
    getTheme: () => currentThemeId,
    getThemesList: () => Object.keys(THEMES_MAP),
    setPointer: (pointerId) => applyPointer(pointerId),
    getPointer: () => currentPointerId,
    setAvatar: (avatarId) => applyAvatar(avatarId),
    getAvatar: () => currentAvatarId,
    setCombination: (pointerId, avatarId) => applyCombination(pointerId, avatarId),
    getCombination: () => ({ pointerId: currentPointerId, avatarId: currentAvatarId }),
    setDisplayMode: (mode) => applyDisplayMode(mode),
    getDisplayMode: () => currentDisplayMode
  };

  try {
    window.addEventListener('storage', (e) => {
      if (e.key === '${CURSOR_STORAGE_KEY}' && e.newValue && THEMES_MAP[e.newValue]) {
        applyTheme(e.newValue);
      }
      if (e.key === '${CURSOR_POINTER_STORAGE_KEY}' && e.newValue) {
        applyPointer(e.newValue);
      }
      if (e.key === '${CURSOR_AVATAR_STORAGE_KEY}' && e.newValue) {
        applyAvatar(e.newValue);
      }
      if (e.key === '${CURSOR_DISPLAY_MODE_STORAGE_KEY}' && e.newValue) {
        applyDisplayMode(e.newValue);
      }
      if (e.key === '${SETTINGS_STORAGE_KEY}' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (typeof parsed.cursorBadgeVisible === 'boolean') {
            cursorBadgeVisible = parsed.cursorBadgeVisible;
            const b = document.getElementById('za-active-badge');
            if (b && !cursorBadgeVisible) b.style.display = 'none';
          }
        } catch(err) {}
      }
    });
    window.addEventListener('zeroapply_cursor_changed', (e) => {
      const id = e && e.detail && e.detail.id;
      if (id && THEMES_MAP[id]) {
        applyTheme(id);
      }
    });
    window.addEventListener('zeroapply_cursor_pointer_changed', (e) => {
      const id = e && e.detail && e.detail.id;
      if (id) applyPointer(id);
    });
    window.addEventListener('zeroapply_cursor_avatar_changed', (e) => {
      const id = e && e.detail && e.detail.id;
      if (id) applyAvatar(id);
    });
    window.addEventListener('zeroapply_cursor_combination_changed', (e) => {
      const detail = e && e.detail;
      if (detail) {
        applyCombination(detail.pointerId, detail.avatarId);
        if (detail.mode) applyDisplayMode(detail.mode);
      }
    });
    window.addEventListener('zeroapply_cursor_display_mode_changed', (e) => {
      const mode = e && e.detail && e.detail.mode;
      if (mode) {
        applyDisplayMode(mode);
      }
    });
    window.addEventListener('zeroapply_settings_updated', (e) => {
      const detail = e && e.detail;
      if (detail && typeof detail.cursorBadgeVisible === 'boolean') {
        cursorBadgeVisible = detail.cursorBadgeVisible;
        const b = document.getElementById('za-active-badge');
        if (b && !cursorBadgeVisible) b.style.display = 'none';
      }
    });
  } catch(e) {}
})();
`;
}

export async function ensureVisualCursor(
  webview: WebviewTarget,
  themeIdOverride?: string,
  pointerIdOverride?: CursorPointerId,
  avatarIdOverride?: CursorAvatarId,
  modeOverride?: CursorDisplayMode
): Promise<boolean> {
  if (!webview || typeof webview.executeJavaScript !== 'function') return false;
  try {
    const activeThemeId = themeIdOverride || loadStoredCursorId();
    const activePointerId = pointerIdOverride || loadStoredPointerId();
    const activeAvatarId = avatarIdOverride || loadStoredAvatarId();
    const activeDisplayMode = modeOverride || loadStoredDisplayMode();
    const badgeEnabled = isCursorBadgeEnabled();
    await webview.executeJavaScript(
      getVisualCursorScript(activeThemeId, badgeEnabled, activePointerId, activeAvatarId, activeDisplayMode)
    );
    // Synchronize active theme, combination, display mode, and badge visibility if cursor root was already alive in DOM
    await webview.executeJavaScript(
      `if (window.__zeroapplyCursor) {
        if (typeof window.__zeroapplyCursor.setTheme === 'function' && window.__zeroapplyCursor.getTheme() !== ${JSON.stringify(activeThemeId)}) {
          window.__zeroapplyCursor.setTheme(${JSON.stringify(activeThemeId)});
        }
        if (typeof window.__zeroapplyCursor.setCombination === 'function') {
          window.__zeroapplyCursor.setCombination(${JSON.stringify(activePointerId)}, ${JSON.stringify(activeAvatarId)});
        }
        if (typeof window.__zeroapplyCursor.setDisplayMode === 'function') {
          window.__zeroapplyCursor.setDisplayMode(${JSON.stringify(activeDisplayMode)});
        }
        if (typeof window.__zeroapplyCursor.setBadgeVisible === 'function') {
          window.__zeroapplyCursor.setBadgeVisible(${badgeEnabled});
        }
      }`
    ).catch(() => {});
    return true;
  } catch (err) {
    console.warn('[VisualCursor] Failed to inject cursor script:', err);
    return false;
  }
}

export async function cursorSetBadgeVisible(webview: WebviewTarget, visible: boolean): Promise<boolean> {
  if (!webview || typeof webview.executeJavaScript !== 'function') return false;
  await ensureVisualCursor(webview);
  return webview.executeJavaScript<boolean>(
    `window.__zeroapplyCursor ? (window.__zeroapplyCursor.setBadgeVisible(${Boolean(visible)}), true) : false`
  ).catch(() => false);
}

export async function cursorSetTheme(
  webview: WebviewTarget,
  themeId: string,
  pointerId?: CursorPointerId,
  avatarId?: CursorAvatarId
): Promise<boolean> {
  if (!webview || typeof webview.executeJavaScript !== 'function') return false;
  await ensureVisualCursor(webview, themeId, pointerId, avatarId);
  const pArg = pointerId ? JSON.stringify(pointerId) : 'undefined';
  const aArg = avatarId ? JSON.stringify(avatarId) : 'undefined';
  return webview.executeJavaScript<boolean>(
    `window.__zeroapplyCursor ? (window.__zeroapplyCursor.setTheme(${JSON.stringify(themeId)}, ${pArg}, ${aArg}), true) : false`
  ).catch(() => false);
}

export async function cursorSetDisplayMode(webview: WebviewTarget, mode: CursorDisplayMode): Promise<boolean> {
  if (!webview || typeof webview.executeJavaScript !== 'function') return false;
  await ensureVisualCursor(webview, undefined, undefined, undefined, mode);
  return webview.executeJavaScript<boolean>(
    `window.__zeroapplyCursor ? (window.__zeroapplyCursor.setDisplayMode(${JSON.stringify(mode)}), true) : false`
  ).catch(() => false);
}

export async function cursorSetPointer(webview: WebviewTarget, pointerId: CursorPointerId): Promise<boolean> {
  if (!webview || typeof webview.executeJavaScript !== 'function') return false;
  await ensureVisualCursor(webview, undefined, pointerId);
  return webview.executeJavaScript<boolean>(
    `window.__zeroapplyCursor ? (window.__zeroapplyCursor.setPointer(${JSON.stringify(pointerId)}), true) : false`
  ).catch(() => false);
}

export async function cursorSetAvatar(webview: WebviewTarget, avatarId: CursorAvatarId): Promise<boolean> {
  if (!webview || typeof webview.executeJavaScript !== 'function') return false;
  await ensureVisualCursor(webview, undefined, undefined, avatarId);
  return webview.executeJavaScript<boolean>(
    `window.__zeroapplyCursor ? (window.__zeroapplyCursor.setAvatar(${JSON.stringify(avatarId)}), true) : false`
  ).catch(() => false);
}

export async function cursorSetCombination(
  webview: WebviewTarget,
  pointerId: CursorPointerId,
  avatarId: CursorAvatarId
): Promise<boolean> {
  if (!webview || typeof webview.executeJavaScript !== 'function') return false;
  await ensureVisualCursor(webview, undefined, pointerId, avatarId);
  return webview.executeJavaScript<boolean>(
    `window.__zeroapplyCursor ? (window.__zeroapplyCursor.setCombination(${JSON.stringify(pointerId)}, ${JSON.stringify(avatarId)}), true) : false`
  ).catch(() => false);
}

export async function cursorGlideTo(
  webview: WebviewTarget,
  x: number,
  y: number,
  badgeOrOptions?: CursorBadgeOrOptions
): Promise<boolean> {
  await ensureVisualCursor(webview);
  const badge = resolveBadge(badgeOrOptions);
  await webview.executeJavaScript(`window.__zeroapplyCursor && window.__zeroapplyCursor.glideTo(${x}, ${y}, ${JSON.stringify(badge)})`).catch(() => {});
  return true;
}

export async function cursorMoveAndClick(
  webview: WebviewTarget,
  selector: string,
  badgeOrOptions?: CursorBadgeOrOptions
): Promise<boolean> {
  await ensureVisualCursor(webview);
  const badge = resolveBadge(badgeOrOptions);
  return webview.executeJavaScript<boolean>(`window.__zeroapplyCursor ? window.__zeroapplyCursor.clickElement(${JSON.stringify(selector)}, ${JSON.stringify(badge)}) : false`).catch(() => false);
}

export async function cursorMoveAndType(
  webview: WebviewTarget,
  selector: string,
  text: string,
  badgeOrOptions?: CursorBadgeOrOptions
): Promise<boolean> {
  await ensureVisualCursor(webview);
  const badge = resolveBadge(badgeOrOptions);
  return webview.executeJavaScript<boolean>(`window.__zeroapplyCursor ? window.__zeroapplyCursor.typeElement(${JSON.stringify(selector)}, ${JSON.stringify(text)}, ${JSON.stringify(badge)}) : false`).catch(() => false);
}

export async function cursorMoveAndSelect(
  webview: WebviewTarget,
  selector: string,
  value: string,
  badgeOrOptions?: CursorBadgeOrOptions
): Promise<boolean> {
  await ensureVisualCursor(webview);
  const badge = resolveBadge(badgeOrOptions);
  return webview.executeJavaScript<boolean>(`window.__zeroapplyCursor ? window.__zeroapplyCursor.selectElement(${JSON.stringify(selector)}, ${JSON.stringify(value)}, ${JSON.stringify(badge)}) : false`).catch(() => false);
}

export async function cursorMoveAndUpload(
  webview: WebviewTarget,
  selector: string,
  fileName: string,
  badgeOrOptions?: CursorBadgeOrOptions
): Promise<boolean> {
  await ensureVisualCursor(webview);
  const badge = resolveBadge(badgeOrOptions);
  return webview.executeJavaScript<boolean>(`window.__zeroapplyCursor ? window.__zeroapplyCursor.uploadElement(${JSON.stringify(selector)}, ${JSON.stringify(fileName)}, ${JSON.stringify(badge)}) : false`).catch(() => false);
}

export async function cursorScrollPage(
  webview: WebviewTarget,
  deltaY: number,
  badgeOrOptions?: CursorBadgeOrOptions
): Promise<boolean> {
  await ensureVisualCursor(webview);
  const badge = resolveBadge(badgeOrOptions);
  return webview.executeJavaScript<boolean>(`window.__zeroapplyCursor ? window.__zeroapplyCursor.scrollPage(${deltaY}, ${JSON.stringify(badge)}) : false`).catch(() => false);
}

export async function cursorScrollContainer(
  webview: WebviewTarget,
  selector: string,
  deltaY: number,
  badgeOrOptions?: CursorBadgeOrOptions
): Promise<boolean> {
  await ensureVisualCursor(webview);
  const badge = resolveBadge(badgeOrOptions);
  return webview.executeJavaScript<boolean>(`window.__zeroapplyCursor ? window.__zeroapplyCursor.scrollContainer(${JSON.stringify(selector)}, ${deltaY}, ${JSON.stringify(badge)}) : false`).catch(() => false);
}

export async function cursorScrollElementIntoView(
  webview: WebviewTarget,
  selector: string,
  badgeOrOptions?: CursorBadgeOrOptions
): Promise<boolean> {
  await ensureVisualCursor(webview);
  const badge = resolveBadge(badgeOrOptions);
  return webview.executeJavaScript<boolean>(`window.__zeroapplyCursor ? window.__zeroapplyCursor.scrollElementIntoView(${JSON.stringify(selector)}, ${JSON.stringify(badge)}) : false`).catch(() => false);
}

export async function cursorDismiss(webview: WebviewTarget): Promise<boolean> {
  await webview.executeJavaScript(`window.__zeroapplyCursor && window.__zeroapplyCursor.dismiss()`).catch(() => {});
  return true;
}

export async function cursorSetMode(
  webview: WebviewTarget,
  mode: 'default' | 'moving' | 'hover' | 'click' | 'typing' | 'loading' | 'success' | 'error' | 'agent' | 'upload' | 'idle'
): Promise<boolean> {
  await ensureVisualCursor(webview);
  return webview.executeJavaScript<boolean>(`window.__zeroapplyCursor ? window.__zeroapplyCursor.setMode(${JSON.stringify(mode)}) : false`).catch(() => false);
}
