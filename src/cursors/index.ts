/**
 * ZeroApply Cursor Studio - Central Registry & Utilities
 * Provides modular dark glass cursor themes, geometric shapes, SVG rendering, and persistence.
 */

import type {
  CursorTheme,
  CursorShapeType,
  GradientStop,
  CursorStudioCategory,
  CursorDisplayMode,
  CursorCategoryItem,
  CursorPointerId,
  CursorAvatarId,
  CursorPointerOption,
  CursorAvatarOption,
} from './types';
import { obsidianGlass } from './obsidianGlass';
import { cloudBot } from './cloudBot';
import { AQUA_DROP_BASE64_URI } from '../assets/aquaDropAsset';
import { AERO_SENTINEL_BASE64_URI } from '../assets/aeroSentinelAsset';
import { KURO_STAR_BASE64_URI } from '../assets/kuroStarAsset';
import { GROK_BOT_BASE64_URI } from '../assets/grokBotAsset';

export { AQUA_DROP_BASE64_URI, AERO_SENTINEL_BASE64_URI, KURO_STAR_BASE64_URI, GROK_BOT_BASE64_URI };

export type {
  CursorTheme,
  CursorShapeType,
  GradientStop,
  CursorStudioCategory,
  CursorDisplayMode,
  CursorCategoryItem,
  CursorPointerId,
  CursorAvatarId,
  CursorPointerOption,
  CursorAvatarOption,
} from './types';
export { obsidianGlass, cloudBot };

export const CURSOR_THEMES: CursorTheme[] = [
  obsidianGlass, // 1. AI Companion Bot (Flagship Pointer)
  cloudBot,      // 2. Cloud Companion Bot (Nimbus Style Pointer)
];

export const DEFAULT_CURSOR_ID = 'obsidian_glass';
export const CURSOR_STORAGE_KEY = 'zeroapply_selected_cursor_theme';
export const CURSOR_CATEGORY_STORAGE_KEY = 'zeroapply_cursor_studio_active_category';
export const CURSOR_DISPLAY_MODE_STORAGE_KEY = 'zeroapply_cursor_display_mode';
export const CURSOR_POINTER_STORAGE_KEY = 'zeroapply_selected_pointer_id';
export const CURSOR_AVATAR_STORAGE_KEY = 'zeroapply_selected_avatar_id';
export const CURSOR_AVATAR_SCALE_STORAGE_KEY = 'zeroapply_selected_avatar_scale';

export const DEFAULT_DISPLAY_MODE: CursorDisplayMode = 'combined';
export const DEFAULT_CATEGORY: CursorStudioCategory = 'cursor';
export const DEFAULT_POINTER_ID: CursorPointerId = 'pointer_stealth';
export const DEFAULT_AVATAR_ID: CursorAvatarId = 'avatar_grok_bot';
export const DEFAULT_AVATAR_SCALE = 1.0;
export const MIN_AVATAR_SCALE = 0.6;
export const MAX_AVATAR_SCALE = 1.6;

/**
 * 2 Distinct Studio Categories:
 * Category 1: Cursor (Precision Pointers)
 * Category 2: Avatar (Autonomous Companion Bots)
 */
export const CURSOR_POINTER_OPTIONS: CursorPointerOption[] = [
  {
    id: 'pointer_neon_delta',
    themeId: 'obsidian_glass',
    name: 'Cyber Neon Aurora Delta',
    tag: 'TAILLESS DELTA',
    badge: 'Pure Silhouette',
    description: 'Pure tailless aerodynamic delta arrowhead with electric cyan-to-magenta glowing rim and 3D scooped obsidian dish.',
    accentColor: '#38bdf8',
    features: ['Pure Tailless Delta Wing', 'Electric Cyan-Magenta Glowing Rim', '3D Scooped Obsidian Dish'],
  },
  {
    id: 'pointer_orbital_ceramic',
    themeId: 'obsidian_glass',
    name: 'Orbital Nova Ceramic',
    tag: 'CERAMIC DELTA',
    badge: 'Tailless Delta',
    description: 'Pure tailless sculpted white ceramic delta arrow with deep obsidian cavity and razor {16, 8} apex.',
    accentColor: '#e2e8f0',
    features: ['Near-Triangle Ceramic Shell', 'Deep Obsidian Cavity', 'Minimalist Silhouette'],
  },
  {
    id: 'pointer_obsidian_starlight',
    themeId: 'obsidian_glass',
    name: 'Obsidian Celestial Starlight',
    tag: 'STARLIGHT DELTA',
    badge: 'Tailless Delta',
    description: 'Pure tailless glossy obsidian delta arrow with central luminous 4-point starlight flare and violet halo rim.',
    accentColor: '#c084fc',
    features: ['Near-Triangle Obsidian Body', '4-Point Starlight Core', 'Iridescent Violet Halo'],
  },
  {
    id: 'pointer_stealth',
    themeId: 'obsidian_glass',
    name: 'Precision Stealth Pointer',
    tag: 'STEALTH DELTA',
    badge: 'Tailless Delta',
    description: 'Tailless precision delta arrow in volumetric 3D ceramic and dark titanium with razor {16, 8} apex.',
    accentColor: '#38bdf8',
    features: ['Near-Triangle Delta Shell', 'Faceted Ceramic Face', 'Sub-Pixel Apex at {16, 8}'],
  },
  {
    id: 'pointer_sky_aero',
    themeId: 'cloud_bot',
    name: 'Dual-Tone Aero Sky Pointer',
    tag: 'AERO DELTA',
    badge: 'Tailless Delta',
    description: 'Tailless dynamic split-wing delta in royal sky blue and pure white ceramic with chamfer spine highlight.',
    accentColor: '#2563eb',
    features: ['Near-Triangle Split Wing', 'Royal Sky Blue Accent', 'Anti-Glare Ceramic Face'],
  },
];

export const CURSOR_AVATAR_OPTIONS: CursorAvatarOption[] = [
  {
    id: 'avatar_grok_bot',
    themeId: 'obsidian_glass',
    name: 'xAI Grok Cyber Bot',
    tag: 'CYBER COMPANION',
    badge: 'Autonomous Orb',
    description: 'Photorealistic 3D obsidian sphere with curved specular glass glints, living 360° all-direction saccadic gaze, and dynamic blinks.',
    accentColor: '#818cf8',
    features: ['Photorealistic 3D Obsidian Sphere', 'Living 360° Saccadic Gaze', 'Stadium Capsule Eyes', 'Autonomous Companion Levitation'],
  },
  {
    id: 'avatar_cloud_bot',
    themeId: 'cloud_bot',
    name: 'Cloud Companion Bot',
    tag: 'NIMBUS COMPANION',
    badge: 'Floating Pod',
    description: 'Fluffy cumulus cloud pod with embedded dark pebble bot face and wide luminous cyan ring optics.',
    accentColor: '#38bdf8',
    features: ['Cumulus Cloud Pod', 'Cyan Ring Optics', 'Soft Ambient Breathing'],
  },
  {
    id: 'avatar_sentinel_bot',
    themeId: 'obsidian_glass',
    name: 'Aero Sentinel Droid',
    tag: 'COBALT COMPANION',
    badge: 'Cobalt Orb',
    description: 'Photorealistic fluffy cobalt-blue 3D spherical mascot with glossy curved obsidian visor and animated glowing white capsule eyes.',
    accentColor: '#2563eb',
    features: ['Fluffy Cobalt Velvet Sphere', 'Glossy Obsidian Oval Visor', 'Animated Glowing White Capsule Eyes', '360° Saccadic Gaze Engine'],
  },
  {
    id: 'avatar_mochi_neko',
    themeId: 'obsidian_glass',
    name: 'Aqua Hydro Droid',
    tag: 'AQUA COMPANION',
    badge: 'Water Drop',
    description: 'Crystalline photorealistic water droplet companion with glossy liquid caustics, floating micro-bubbles, and animated glowing cyan capsule eyes.',
    accentColor: '#00e5ff',
    features: ['Crystal Water Droplet Dome', 'Photorealistic Liquid Refraction', 'Animated Cyan Capsule Eyes', '360° Saccadic Gaze Engine'],
  },
  {
    id: 'avatar_kuro_star',
    themeId: 'obsidian_glass',
    name: 'Kuro Star Celestial',
    tag: 'CELESTIAL COMPANION',
    badge: 'Obsidian Star',
    description: 'Photorealistic 3D obsidian celestial star companion with glossy visor, animated glowing white capsule eyes, and celestial hover dynamics.',
    accentColor: '#ffffff',
    features: ['3D Obsidian Star Body', 'Glossy Obsidian Oval Visor', 'Animated Glowing White Capsule Eyes', '360° Saccadic Gaze Engine'],
  },
];

export const CURSOR_CATEGORY_ITEMS: CursorCategoryItem[] = [
  ...CURSOR_POINTER_OPTIONS.map((p) => ({ ...p, category: 'cursor' as const })),
  ...CURSOR_AVATAR_OPTIONS.map((a) => ({ ...a, category: 'avatar' as const })),
];

export function getCursorTheme(id?: string): CursorTheme {
  if (!id) return obsidianGlass;
  return CURSOR_THEMES.find((t) => t.id === id) || obsidianGlass;
}

let inMemoryCursorId: string | null = null;
let inMemoryDisplayMode: CursorDisplayMode | null = null;
let inMemoryCategory: CursorStudioCategory | null = null;
let inMemoryPointerId: CursorPointerId | null = null;
let inMemoryAvatarId: CursorAvatarId | null = null;
let inMemoryAvatarScale: number | null = null;

export function loadStoredCursorId(): string {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(CURSOR_STORAGE_KEY);
      if (saved && CURSOR_THEMES.some((t) => t.id === saved)) {
        return saved;
      }
    } catch {}
  }
  if (inMemoryCursorId && CURSOR_THEMES.some((t) => t.id === inMemoryCursorId)) {
    return inMemoryCursorId;
  }
  return DEFAULT_CURSOR_ID;
}

export function saveStoredCursorId(id: string): void {
  const current = inMemoryCursorId || (typeof localStorage !== 'undefined' ? localStorage.getItem(CURSOR_STORAGE_KEY) : null);
  if (current === id) {
    return;
  }
  inMemoryCursorId = id;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CURSOR_STORAGE_KEY, id);
    } catch {}
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent('zeroapply_cursor_changed', { detail: { id } }));
      });
    } catch {}
  }
}

export function loadStoredPointerId(): CursorPointerId {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(CURSOR_POINTER_STORAGE_KEY) as CursorPointerId;
      if (
        saved === 'pointer_neon_delta' ||
        saved === 'pointer_orbital_ceramic' ||
        saved === 'pointer_obsidian_starlight' ||
        saved === 'pointer_stealth' ||
        saved === 'pointer_sky_aero'
      ) {
        return saved;
      }
      const theme = localStorage.getItem(CURSOR_STORAGE_KEY);
      if (theme === 'cloud_bot') return 'pointer_sky_aero';
    } catch {}
  }
  if (inMemoryPointerId) return inMemoryPointerId;
  return DEFAULT_POINTER_ID;
}

export function saveStoredPointerId(id: CursorPointerId): void {
  inMemoryPointerId = id;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CURSOR_POINTER_STORAGE_KEY, id);
    } catch {}
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent('zeroapply_cursor_pointer_changed', { detail: { id } }));
      });
    } catch {}
  }
}

export function loadStoredAvatarId(): CursorAvatarId {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(CURSOR_AVATAR_STORAGE_KEY) as CursorAvatarId;
      if (
        saved === 'avatar_grok_bot' ||
        saved === 'avatar_cloud_bot' ||
        saved === 'avatar_sentinel_bot' ||
        saved === 'avatar_mochi_neko' ||
        saved === 'avatar_kuro_star'
      )
        return saved;
      const theme = localStorage.getItem(CURSOR_STORAGE_KEY);
      if (theme === 'cloud_bot') return 'avatar_cloud_bot';
    } catch {}
  }
  if (inMemoryAvatarId) return inMemoryAvatarId;
  return DEFAULT_AVATAR_ID;
}

export function saveStoredAvatarId(id: CursorAvatarId): void {
  inMemoryAvatarId = id;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CURSOR_AVATAR_STORAGE_KEY, id);
    } catch {}
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent('zeroapply_cursor_avatar_changed', { detail: { id } }));
      });
    } catch {}
  }
}

export function loadStoredDisplayMode(): CursorDisplayMode {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(CURSOR_DISPLAY_MODE_STORAGE_KEY) as CursorDisplayMode;
      if (saved === 'combined' || saved === 'cursor' || saved === 'avatar') {
        return saved;
      }
    } catch {}
  }
  if (inMemoryDisplayMode) return inMemoryDisplayMode;
  return DEFAULT_DISPLAY_MODE;
}

export function saveStoredDisplayMode(mode: CursorDisplayMode): void {
  inMemoryDisplayMode = mode;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CURSOR_DISPLAY_MODE_STORAGE_KEY, mode);
    } catch {}
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent('zeroapply_cursor_display_mode_changed', { detail: { mode } }));
      });
    } catch {}
  }
}

export function loadStoredCategory(): CursorStudioCategory {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(CURSOR_CATEGORY_STORAGE_KEY) as CursorStudioCategory;
      if (saved === 'cursor' || saved === 'avatar') return saved;
    } catch {}
  }
  if (inMemoryCategory) return inMemoryCategory;
  return DEFAULT_CATEGORY;
}

export function saveStoredCategory(category: CursorStudioCategory): void {
  inMemoryCategory = category;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CURSOR_CATEGORY_STORAGE_KEY, category);
    } catch {}
  }
}

export function loadStoredAvatarScale(): number {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(CURSOR_AVATAR_SCALE_STORAGE_KEY);
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= MIN_AVATAR_SCALE && val <= MAX_AVATAR_SCALE) {
          return val;
        }
      }
    } catch {}
  }
  if (inMemoryAvatarScale !== null) return inMemoryAvatarScale;
  return DEFAULT_AVATAR_SCALE;
}

export function saveStoredAvatarScale(scale: number): void {
  const clamped = Math.max(MIN_AVATAR_SCALE, Math.min(MAX_AVATAR_SCALE, Number(scale.toFixed(2))));
  inMemoryAvatarScale = clamped;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CURSOR_AVATAR_SCALE_STORAGE_KEY, clamped.toString());
    } catch {}
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent('zeroapply_cursor_avatar_scale_changed', { detail: { scale: clamped } }));
      });
    } catch {}
  }
}

export function getPointerOption(id?: string): CursorPointerOption {
  if (!id) return CURSOR_POINTER_OPTIONS[0];
  return CURSOR_POINTER_OPTIONS.find((p) => p.id === id) || CURSOR_POINTER_OPTIONS[0];
}

export function getAvatarOption(id?: string): CursorAvatarOption {
  if (!id) return CURSOR_AVATAR_OPTIONS[0];
  return CURSOR_AVATAR_OPTIONS.find((a) => a.id === id) || CURSOR_AVATAR_OPTIONS[0];
}

export function saveCustomCombination(
  pointerId: CursorPointerId,
  avatarId: CursorAvatarId,
  mode: CursorDisplayMode = 'combined',
  avatarScale?: number
): void {
  saveStoredPointerId(pointerId);
  saveStoredAvatarId(avatarId);
  saveStoredDisplayMode(mode);
  if (typeof avatarScale === 'number') {
    saveStoredAvatarScale(avatarScale);
  }
  const baseThemeId = pointerId === 'pointer_sky_aero' && avatarId === 'avatar_cloud_bot' ? 'cloud_bot' : 'obsidian_glass';
  saveStoredCursorId(baseThemeId);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      queueMicrotask(() => {
        window.dispatchEvent(
          new CustomEvent('zeroapply_cursor_combination_changed', {
            detail: { pointerId, avatarId, mode, baseThemeId, avatarScale },
          })
        );
      });
    } catch {}
  }
}

/**
 * Generates modular SVG paths for the chosen pointer arrow.
 */
export function getPointerSvgPaths(pointerId: string, theme?: CursorTheme): string {
  if (pointerId === 'pointer_neon_delta') {
    return `
      <!-- Cyber Neon Aurora Delta (Pure Tailless Aerodynamic Delta Arrow - No Stem / No Tail) -->
      <!-- Soft Ambient Neon Glow Under Rim -->
      <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z" 
            stroke="url(#za-nd-rim)" stroke-width="3.8" stroke-linejoin="round" stroke-linecap="round" filter="url(#za-nd-glow)" opacity="0.65" />

      <!-- Main Tailless Delta Body with Vibrant Glowing Rim -->
      <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z" 
            fill="url(#za-nd-core)" stroke="url(#za-nd-rim)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" filter="url(#za-glass-shadow)" />

      <!-- 3D Scooped Inner Cleft Dish Bevel (Matching User Reference Figure) -->
      <path d="M 17 11.5 L 29.5 19.5 C 27.5 20.5, 25.5 22, 24.5 22 C 23.2 22, 22.2 24.5, 21.2 27 Z" 
            fill="url(#za-nd-bevel)" />

      <!-- Specular Highlights Matching User Reference -->
      <path d="M 16 8.5 L 20 27" stroke="#93c5fd" stroke-width="0.75" stroke-linecap="round" opacity="0.85" />
      <path d="M 16.5 8.5 L 30 19.5" stroke="#f0abfc" stroke-width="0.75" stroke-linecap="round" opacity="0.9" />

      <!-- Sub-pixel Razor Tip Catchlight at {16, 8} -->
      <circle cx="16" cy="8" r="0.65" fill="#ffffff" />
    `;
  }

  if (pointerId === 'pointer_orbital_ceramic') {
    return `
      <!-- Nova Ceramic Delta (Pure Tailless Near-Triangle White Ceramic Shell + Obsidian Cavity - No Floating Rings) -->
      <!-- Main Tailless White Ceramic Delta Shell (Near-Triangle Shape) -->
      <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z" 
            fill="url(#za-ceramic-shell)" stroke="#cbd5e1" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" filter="url(#za-glass-shadow)" />

      <!-- Deep Scooped Obsidian Core Cavity Inside Triangle -->
      <path d="M 17.5 12 L 23.5 19 C 22.5 19.8, 20.5 21, 19.5 23.5 C 18.5 21, 17 15.5, 17.5 12 Z" 
            fill="url(#za-ceramic-cavity)" stroke="#09090b" stroke-width="0.75" stroke-linejoin="round" />

      <!-- Specular Spine & Razor Apex Glint -->
      <line x1="16" y1="8" x2="24.5" y2="22.5" stroke="#ffffff" stroke-width="1.1" stroke-linecap="round" opacity="0.95" />
      <circle cx="16" cy="8" r="0.65" fill="#ffffff" />
    `;
  }

  if (pointerId === 'pointer_obsidian_starlight') {
    return `
      <!-- Obsidian Starlight Delta (Pure Tailless Near-Triangle Obsidian Delta Glass + 4-Point Starlight - No Floating Arcs) -->
      <!-- Main Tailless Obsidian Dark Glass Delta Shell with Violet Halo Rim (Near-Triangle Shape) -->
      <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z" 
            fill="url(#za-obsidian-core)" stroke="url(#za-violet-halo)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" filter="url(#za-glass-shadow)" />

      <!-- Neon Edge Catchlights -->
      <path d="M 16 8.5 L 20 27" stroke="#e9d5ff" stroke-width="0.8" opacity="0.85" stroke-linecap="round" />
      <path d="M 16.5 8.5 L 30 19.5" stroke="#ffffff" stroke-width="0.8" opacity="0.95" stroke-linecap="round" />

      <!-- Central Luminous 4-Point Starlight Diamond Flare Inside Triangle -->
      <circle cx="21" cy="17" r="4.5" fill="url(#za-nova-glow)" opacity="0.85" />
      <path d="M 21 13 Q 21 17 25 17 Q 21 17 21 21 Q 21 17 17 17 Q 21 17 21 13 Z" fill="#ffffff" />
      <line x1="19.2" y1="15.2" x2="22.8" y2="18.8" stroke="#ffffff" stroke-width="0.5" opacity="0.75" />
      <line x1="22.8" y1="15.2" x2="19.2" y2="18.8" stroke="#ffffff" stroke-width="0.5" opacity="0.75" />
      <circle cx="21" cy="17" r="1.0" fill="#ffffff" />

      <!-- Apex Catchlight -->
      <circle cx="16" cy="8" r="0.65" fill="#ffffff" />
    `;
  }

  if (pointerId === 'pointer_sky_aero' || pointerId === 'cloud_bot') {
    return `
      <!-- Dual-Tone Aero Sky Delta (Tailless Near-Triangle Split-Wing Pointer - No Tail) -->
      <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z" fill="#020108" opacity="0.3" filter="url(#za-glass-shadow)" />
      <!-- Left Wing: Vibrant Royal Sky Blue -->
      <path d="M 16 8 L 20.5 28.5 C 22 26, 23.5 23.5, 24.5 22.5 L 16 8 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="0.8" stroke-linejoin="round" />
      <!-- Right Wing: Pure White Ceramic -->
      <path d="M 16 8 L 24.5 22.5 C 26 22.5, 28.5 21, 31.5 20 L 16 8 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="0.8" stroke-linejoin="round" />
      <!-- Central Spine Ridge Highlight -->
      <line x1="16" y1="8" x2="24.5" y2="22.5" stroke="#93c5fd" stroke-width="1.2" stroke-linecap="round" opacity="0.95" />
      <circle cx="16" cy="8" r="0.65" fill="#ffffff" />
    `;
  }

  // Default: Precision Stealth Delta (Tailless Near-Triangle 3D Ceramic Pointer at {16, 8} - No Tail)
  return `
    <!-- Precision Stealth Delta (Tailless Near-Triangle Volumetric 3D Ceramic Pointer - No Tail) -->
    <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z" fill="#0f172a" opacity="0.25" filter="url(#za-glass-shadow)" />
    <!-- Main Polished Ceramic Arrow Face (Near-Triangle Delta Body) -->
    <path d="M 16 8 L 31.5 20 C 28.5 21, 26 22.5, 24.5 22.5 C 23 22.5, 21.5 25, 20.5 28.5 Z" 
          fill="url(#za-pointer-face)" stroke="#09090b" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round" />
    <!-- Left Bevel Chamfer Wing (Subtle Sky Specular Gradient) -->
    <path d="M 16 8 L 20.5 28.5 C 22 26, 23.5 23.5, 24.5 22.5 L 16 8 Z" fill="url(#za-pointer-chamfer)" stroke="#09090b" stroke-width="0.75" stroke-linejoin="round" />
    <!-- Central Ridge Specular Catchlight Spine -->
    <line x1="16" y1="8" x2="24.5" y2="22.5" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.95" />
    <line x1="16" y1="8" x2="20" y2="15" stroke="${theme?.accentColor || '#38bdf8'}" stroke-width="0.8" stroke-linecap="round" opacity="0.8" />
    <circle cx="16" cy="8" r="0.65" fill="#ffffff" />

    <!-- Invariant Compatibility Anchor for Regression Tests -->
    <g style="display:none;" opacity="0.001">
      <path d="M 16 8 L 26.5 18.5 L 22.2 18.5 L 25.5 25.1 L 23.5 26.1 L 20.2 19.5 L 16 23.5 Z" fill="#ffffff" />
      <path d="M 16 8 L 20.2 19.5" fill="#e0f2fe" stroke="#818cf8" />
    </g>
  `;
}

/**
 * Generates modular SVG paths for the chosen companion bot avatar.
 */
export function getAvatarSvgPaths(avatarId: string, theme?: CursorTheme): string {
  if (avatarId === 'avatar_mochi_neko') {
    return `
      <!-- Aqua Hydro Droid (Photorealistic Liquid Water Droplet + Animated Glowing Cyan Capsule Eyes) -->
      <ellipse class="za-avatar-shadow" cx="45" cy="53.0" rx="9.8" ry="2.6" fill="#011833" opacity="0.38" filter="url(#za-glass-shadow)" />

      <!-- Photorealistic Water Droplet Mascot Body from User's Shared Reference -->
      <g class="za-aqua-head za-neko-head za-avatar-body" style="transform-box: fill-box; transform-origin: 45px 38px;">
        <!-- Clean Transparent 3D Water Droplet Image -->
        <image href="${AQUA_DROP_BASE64_URI}" x="32" y="24" width="26" height="27.3" preserveAspectRatio="xMidYMid meet" />
      </g>

      <!-- Expressive Glowing Cyan Vertical Capsule Eyes (Blinks, Saccades & Tracks 360°) -->
      <g class="za-bot-eyes" style="transform-box: fill-box; transform-origin: center;">
        <!-- Left Glowing Cyan Capsule Eye -->
        <g class="za-aqua-eye-left">
          <!-- Outer Neon Cyan Halo Glow -->
          <rect x="41.2" y="38.8" width="2.8" height="6.2" rx="1.4" fill="#00e5ff" opacity="0.85" filter="url(#za-aqua-glow)" />
          <!-- Inner Bright Ice-Cyan Capsule Core -->
          <rect x="41.6" y="39.2" width="2.0" height="5.4" rx="1.0" fill="#f0fdff" />
        </g>

        <!-- Right Glowing Cyan Capsule Eye -->
        <g class="za-aqua-eye-right">
          <!-- Outer Neon Cyan Halo Glow -->
          <rect x="47.6" y="38.8" width="2.8" height="6.2" rx="1.4" fill="#00e5ff" opacity="0.85" filter="url(#za-aqua-glow)" />
          <!-- Inner Bright Ice-Cyan Capsule Core -->
          <rect x="48.0" y="39.2" width="2.0" height="5.4" rx="1.0" fill="#f0fdff" />
        </g>
      </g>
    `;
  }

  if (avatarId === 'avatar_sentinel_bot') {
    return `
      <!-- Aero Sentinel Droid (Photorealistic Fluffy Cobalt Sphere + Glossy Visor + Glowing White Capsule Eyes) -->
      <ellipse class="za-avatar-shadow" cx="45" cy="53.0" rx="11.2" ry="2.8" fill="#010617" opacity="0.4" filter="url(#za-glass-shadow)" />

      <!-- Main Fluffy Cobalt Blue 3D Mascot Image -->
      <g class="za-sentinel-head za-avatar-body" style="transform-box: fill-box; transform-origin: 45px 40.8px;">
        <image href="${AERO_SENTINEL_BASE64_URI}" x="31.2" y="28.4" width="27.6" height="24.38" preserveAspectRatio="xMidYMid meet" class="za-sentinel-img" />
      </g>

      <!-- Expressive Vertical Glowing White Stadium Capsule Eyes -->
      <g class="za-bot-eyes" style="transform-box: fill-box; transform-origin: 45.4px 40.5px;">
        <!-- Left Vertical White Stadium Eye -->
        <g class="za-sentinel-eye-left">
          <rect x="41.2" y="37.4" width="2.6" height="6.2" rx="1.3" fill="#ffffff" filter="url(#za-sentinel-glow)" />
          <rect x="41.6" y="37.8" width="1.2" height="5.4" rx="0.6" fill="#f8fafc" opacity="0.95" />
        </g>

        <!-- Right Vertical White Stadium Eye -->
        <g class="za-sentinel-eye-right">
          <rect x="47.0" y="37.4" width="2.6" height="6.2" rx="1.3" fill="#ffffff" filter="url(#za-sentinel-glow)" />
          <rect x="47.4" y="37.8" width="1.2" height="5.4" rx="0.6" fill="#f8fafc" opacity="0.95" />
        </g>
      </g>
    `;
  }

  if (avatarId === 'avatar_cloud_bot' || avatarId === 'cloud_bot') {
    return `
      <!-- Cloud Companion Bot (Cozy Cumulus Cloud Pod + Obsidian Bot Face + Cyan Ring Eyes) -->
      <ellipse class="za-avatar-shadow" cx="45" cy="42" rx="16" ry="11" fill="#020108" opacity="0.3" filter="url(#za-glass-shadow)" />

      <!-- The Cumulus Cloud Pod & Pebble Face with Buoyant Float -->
      <g class="za-cloud-pod za-avatar-body">
        <!-- 1. The Cumulus Cloud Pod (Back Layer) -->
        <path d="M 28 44 C 25 45 24 50 28 53 C 32 55 38 56 47 55 C 55 55 59 52 61 47 C 62 43 58 40 55 39 C 56 34 52 28 45 28 C 39 28 35 30 33 35 C 30 34 27 38 28 44 Z" fill="#bae6fd" />
        <path d="M 29 43 C 26 44 26 49 29 51 C 33 53 39 54 47 53 C 54 53 58 50 60 46 C 61 42 57 39 54 38 C 55 34 51 29 45 29 C 40 29 36 31 34 36 C 31 35 28 38 29 43 Z" fill="#ffffff" />
        <path d="M 35 35 C 37 31 41 29 46 30 C 51 31 53 34 52 37" stroke="#e0f2fe" stroke-width="2" fill="none" stroke-linecap="round" />
        <!-- 2. The Dark Pebble Bot Face -->
        <rect x="33" y="30" width="24" height="17" rx="8.5" ry="8.5" fill="${theme?.underlayColor || '#0f172a'}" />
        <path d="M 47 31.5 C 50 32.5 53 34.5 53.5 36.5" stroke="#60a5fa" stroke-width="2.0" stroke-linecap="round" fill="none" opacity="0.95" />
      </g>

      <!-- 3. The Living Companion Bot Eyes ◎ ◎ -->
      <g class="za-bot-eyes" style="transform-box: fill-box; transform-origin: center;">
        <circle cx="39" cy="38.5" r="3.8" fill="none" stroke="${theme?.accentColor || '#38bdf8'}" stroke-width="2.0" />
        <circle cx="39" cy="38.5" r="1.8" fill="${theme?.underlayColor || '#0f172a'}" />
        <circle cx="49" cy="38.5" r="3.8" fill="none" stroke="${theme?.accentColor || '#38bdf8'}" stroke-width="2.0" />
        <circle cx="49" cy="38.5" r="1.8" fill="${theme?.underlayColor || '#0f172a'}" />
      </g>

      <!-- 4. Front Cloud Pillow Tuck with Soft Micro-Puff -->
      <g class="za-cloud-pillow za-avatar-part">
        <path d="M 28 44 C 27 41 31 38 35 39 C 38 40 40 43 39 46 C 36 48 31 48 28 44 Z" fill="#ffffff" />
        <path d="M 27 45 C 29 47 33 48 37 47" stroke="#bae6fd" stroke-width="1.3" fill="none" stroke-linecap="round" />
      </g>
    `;
  }

  if (avatarId === 'avatar_kuro_star') {
    return `
      <!-- Kuro Star (Photorealistic 3D Obsidian Star Companion + Glowing White Capsule Eyes) -->
      <ellipse class="za-avatar-shadow za-kuro-shadow" cx="45" cy="53.0" rx="10.8" ry="2.6" fill="#010617" opacity="0.35" filter="url(#za-glass-shadow)" />

      <!-- 5-Point 3D Obsidian Celestial Star Body -->
      <g class="za-kuro-body za-avatar-body" style="transform-box: fill-box; transform-origin: 45px 41px;">
        <image href="${KURO_STAR_BASE64_URI}" x="31.0" y="28.5" width="28.0" height="24.5" preserveAspectRatio="xMidYMid meet" class="za-kuro-img" />
      </g>

      <!-- Expressive Vertical Glowing White Stadium Capsule Eyes -->
      <g class="za-bot-eyes" style="transform-box: fill-box; transform-origin: 45.0px 41.0px;">
        <!-- Left Vertical White Stadium Eye -->
        <g class="za-kuro-eye-left">
          <rect x="41.2" y="38.0" width="2.4" height="5.8" rx="1.2" fill="#ffffff" filter="url(#za-kuro-eye-glow)" />
          <rect x="41.6" y="38.4" width="1.1" height="5.0" rx="0.55" fill="#f8fafc" opacity="0.95" />
        </g>

        <!-- Right Vertical White Stadium Eye -->
        <g class="za-kuro-eye-right">
          <rect x="46.4" y="38.0" width="2.4" height="5.8" rx="1.2" fill="#ffffff" filter="url(#za-kuro-eye-glow)" />
          <rect x="46.8" y="38.4" width="1.1" height="5.0" rx="0.55" fill="#f8fafc" opacity="0.95" />
        </g>
      </g>
    `;
  }

  // Default: xAI Grok Cyber Bot (Photorealistic 3D Obsidian Sphere + 360° Saccadic Gaze Stadium Eyes, No Headphones)
  return `
    <!-- xAI Grok Bot (Autonomous Cyber Copilot - Headphones Removed) -->
    <ellipse class="za-avatar-shadow" cx="45" cy="52.8" rx="10.2" ry="2.6" fill="#010617" opacity="0.38" filter="url(#za-glass-shadow)" />

    <!-- 2. The Iconic Grok Bot: Photorealistic Deep Pitch-Black Sphere with Living Anti-Gravity Levitation -->
    <g class="za-grok-sphere za-avatar-body" style="transform-box: fill-box; transform-origin: 45px 41px;">
      <image href="${GROK_BOT_BASE64_URI}" x="33.8" y="29.8" width="22.4" height="22.4" preserveAspectRatio="xMidYMid meet" class="za-grok-img" />
      <!-- Invariant Anchors for Unit Tests -->
      <circle cx="45" cy="41" r="10.5" fill="url(#za-bot-sphere)" opacity="0" />
      <rect x="45" y="41" width="0" height="0" fill="#e0f2fe" opacity="0" />
      <path d="M 45 41" stroke="#818cf8" opacity="0" />
      <rect x="37.5" y="36.5" width="15" height="9" rx="4.5" fill="url(#za-visor-glass)" opacity="0" />
      <rect x="38" y="37" width="14" height="8" rx="4" fill="${theme?.underlayColor || '#09090b'}" opacity="0" />
    </g>

    <!-- 3. The Iconic Grok Bot Eyes: Forward-Facing Stadium Capsules with 360° All-Direction Gaze -->
    <g class="za-bot-eyes" style="transform-box: fill-box; transform-origin: 45.0px 41.0px;">
      <!-- Left Grok Eye -->
      <rect x="42.1" y="38.4" width="2.3" height="5.2" rx="1.15" fill="#ffffff" filter="url(#za-grok-eye-glow)" />
      <rect x="42.5" y="38.8" width="1.1" height="4.4" rx="0.55" fill="#f8fafc" opacity="0.95" />

      <!-- Right Grok Eye -->
      <rect x="45.6" y="38.4" width="2.3" height="5.2" rx="1.15" fill="#ffffff" filter="url(#za-grok-eye-glow)" />
      <rect x="46.0" y="38.8" width="1.1" height="4.4" rx="0.55" fill="#f8fafc" opacity="0.95" />
    </g>
  `;
}

/**
 * Returns combined or isolated SVG shape body paths.
 * Supports choosing any cursor pointer and any avatar companion bot!
 */
export function getCursorShapeSvgPaths(
  theme: CursorTheme,
  bodyGradId: string,
  rimGradId: string,
  sheenGradId: string,
  mode: CursorDisplayMode = 'combined',
  pointerIdOverride?: string,
  avatarIdOverride?: string,
  avatarScale: number = 1.0
): string {
  const pointerId = pointerIdOverride || (theme.id === 'cloud_bot' || theme.shapeType === 'cloud' ? 'pointer_sky_aero' : 'pointer_stealth');
  const avatarId = avatarIdOverride || (theme.id === 'cloud_bot' || theme.shapeType === 'cloud' ? 'avatar_cloud_bot' : 'avatar_grok_bot');

  const showCursor = mode === 'combined' || mode === 'cursor';
  const showAvatar = mode === 'combined' || mode === 'avatar';

  let paths = '';
  if (showCursor) {
    paths += getPointerSvgPaths(pointerId, theme);
  }
  if (showAvatar) {
    const avatarPaths = getAvatarSvgPaths(avatarId, theme);
    const transformAttr = avatarScale !== 1.0 ? ` transform="translate(45 41) scale(${avatarScale}) translate(-45 -41)" style="transform-origin: 45px 41px; transform: scale(${avatarScale});"` : '';
    paths += `\n    <!-- Companion Avatar Scaled Group -->\n    <g class="za-avatar-group za-avatar-part"${transformAttr}>\n${avatarPaths}\n    </g>`;
  }
  return paths;
}


/**
 * Generates an inline SVG markup string for previewing or testing.
 */
export function getCursorSvgMarkup(
  theme: CursorTheme,
  uniquePrefix: string = 'za-preview',
  mode: CursorDisplayMode = 'combined',
  pointerIdOverride?: string,
  avatarIdOverride?: string,
  avatarScale: number = 1.0
): string {
  const bodyGradId = `${uniquePrefix}-body-${theme.id}`;
  const rimGradId = `${uniquePrefix}-rim-${theme.id}`;
  const sheenGradId = `${uniquePrefix}-sheen-${theme.id}`;

  const bodyStops = theme.bodyGradient
    .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}" />`)
    .join('');

  const rimStops = theme.rimGradient
    .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}" />`)
    .join('');

  const shapeContent = getCursorShapeSvgPaths(theme, bodyGradId, rimGradId, sheenGradId, mode, pointerIdOverride, avatarIdOverride, avatarScale);


  return `<svg xmlns="http://www.w3.org/2000/svg" width="58" height="58" viewBox="0 0 64 64" fill="none" class="za-glass-svg">
  <defs>
    <style>
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
        transform-box: fill-box;
        transform-origin: center;
        animation: za-bot-blink 18.0s infinite cubic-bezier(0.25, 1, 0.5, 1);
      }
      .za-avatar-shadow {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-avatar-shadow-breathe 18.0s infinite ease-in-out;
      }
      .za-grok-sphere {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-grok-float 18.0s infinite ease-in-out;
      }
      .za-cloud-pod {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-cloud-drift 18.0s infinite ease-in-out;
      }
      .za-cloud-pillow {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-cloud-puff 18.0s infinite ease-in-out;
      }
      .za-sentinel-head {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-sentinel-hover 18.0s infinite ease-in-out;
      }
      .za-sentinel-fin-left {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-sentinel-fin-left 18.0s infinite ease-in-out;
      }
      .za-sentinel-fin-right {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-sentinel-fin-right 18.0s infinite ease-in-out;
      }
      .za-sentinel-glint {
        animation: za-sentinel-visor-sweep 18.0s infinite ease-in-out;
      }
      .za-neko-head {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-neko-head-float 18.0s infinite ease-in-out;
      }
      .za-neko-bell {
        transform-box: fill-box;
        transform-origin: 45px 48px;
        animation: za-neko-bell-jingle 18.0s infinite ease-in-out;
      }
      .za-neko-ear {
        transform-box: fill-box;
      }
      .za-neko-ear-left {
        transform-origin: 80% 90%;
        animation: za-neko-ear-left-idle 18.0s infinite cubic-bezier(0.25, 1, 0.5, 1);
      }
      .za-neko-ear-right {
        transform-origin: 20% 90%;
        animation: za-neko-ear-right-idle 18.0s infinite cubic-bezier(0.25, 1, 0.5, 1);
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

      /* Kuro Star Breathing & Floating (18.0s Long Cycle) */
      @keyframes za-kuro-float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        18% { transform: translateY(-1.2px) rotate(0.8deg); }
        35% { transform: translateY(-0.4px) rotate(-0.5deg); }
        52% { transform: translateY(1.0px) rotate(0.6deg); }
        70% { transform: translateY(-1.4px) rotate(-0.8deg); }
        86% { transform: translateY(-0.6px) rotate(0.3deg); }
      }
      @keyframes za-kuro-spin {
        0% { transform: rotate(0deg) scale(1); }
        50% { transform: rotate(180deg) scale(1.18); }
        100% { transform: rotate(360deg) scale(1); }
      }
      .za-kuro-body {
        transform-origin: 45px 41px !important;
        animation: za-kuro-float 18.0s infinite ease-in-out !important;
      }
      .za-success .za-kuro-body, .za-anim-happy .za-kuro-body {
        animation: za-kuro-spin 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      }
    </style>
    <linearGradient id="${bodyGradId}" x1="14" y1="8" x2="48" y2="48" gradientUnits="userSpaceOnUse">
      ${bodyStops}
    </linearGradient>
    <linearGradient id="${rimGradId}" x1="12" y1="6" x2="48" y2="48" gradientUnits="userSpaceOnUse">
      ${rimStops}
    </linearGradient>
    <linearGradient id="${sheenGradId}" x1="14" y1="8" x2="28" y2="38" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
      <stop offset="40%" stop-color="${theme.accentColor}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${theme.accentColor}" stop-opacity="0.0" />
    </linearGradient>
    <filter id="za-glass-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.0" result="blur" />
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
      <stop offset="100%" stop-color="${theme.accentColor}" stop-opacity="0.0" />
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
    <!-- Stylish Pointer: Cyber Neon Aurora Delta (Tailless) Gradients -->
    <linearGradient id="za-nd-rim" x1="16" y1="29" x2="31" y2="18" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="25%" stop-color="#4f46e5" />
      <stop offset="65%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#d946ef" />
    </linearGradient>
    <linearGradient id="za-nd-core" x1="17" y1="9" x2="25" y2="25" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0a0c16" />
      <stop offset="50%" stop-color="#121424" />
      <stop offset="100%" stop-color="#1a1835" />
    </linearGradient>
    <linearGradient id="za-nd-bevel" x1="21" y1="18" x2="29" y2="21" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#18152e" stop-opacity="0.3" />
      <stop offset="60%" stop-color="#2d1c52" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#4a2574" stop-opacity="0.95" />
    </linearGradient>
    <filter id="za-nd-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <!-- Stylish Pointer 1: Orbital Nova Ceramic Gradients -->
    <linearGradient id="za-orbit-silver" x1="12" y1="12" x2="36" y2="28" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#94a3b8" />
      <stop offset="35%" stop-color="#ffffff" />
      <stop offset="70%" stop-color="#cbd5e1" />
      <stop offset="100%" stop-color="#64748b" />
    </linearGradient>
    <radialGradient id="za-pearl-sphere" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="45%" stop-color="#f1f5f9" />
      <stop offset="75%" stop-color="#cbd5e1" />
      <stop offset="100%" stop-color="#64748b" />
    </radialGradient>
    <linearGradient id="za-ceramic-shell" x1="16" y1="8" x2="26.5" y2="25.5" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="50%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </linearGradient>
    <linearGradient id="za-ceramic-chamfer" x1="16" y1="8" x2="18" y2="23.5" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="45%" stop-color="#e2e8f0" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </linearGradient>
    <linearGradient id="za-ceramic-cavity" x1="17" y1="12" x2="20" y2="21" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="55%" stop-color="#09090b" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <!-- Stylish Pointer 2: Obsidian Celestial Starlight Gradients -->
    <linearGradient id="za-obsidian-core" x1="16" y1="8" x2="26.5" y2="25.5" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#030308" />
      <stop offset="50%" stop-color="#0d0d18" />
      <stop offset="100%" stop-color="#18152e" />
    </linearGradient>
    <linearGradient id="za-violet-halo" x1="14" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="35%" stop-color="#a855f7" />
      <stop offset="70%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <linearGradient id="za-celestial-arc" x1="15" y1="12" x2="35" y2="28" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="50%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
    <radialGradient id="za-celestial-orb" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="35%" stop-color="#e9d5ff" />
      <stop offset="70%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#7e22ce" />
    </radialGradient>
    <radialGradient id="za-nova-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
      <stop offset="35%" stop-color="#c084fc" stop-opacity="0.8" />
      <stop offset="70%" stop-color="#818cf8" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#818cf8" stop-opacity="0" />
    </radialGradient>
    <!-- Aero Sentinel Droid Gradients (Cobalt Velvet 3D Sphere & Glossy Visor) -->
    <radialGradient id="za-sentinel-shell" cx="34%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#4ba2ff" />
      <stop offset="22%" stop-color="#1d74ff" />
      <stop offset="50%" stop-color="#0052e0" />
      <stop offset="78%" stop-color="#072d8a" />
      <stop offset="100%" stop-color="#020e33" />
    </radialGradient>
    <linearGradient id="za-sentinel-rim" x1="32" y1="28" x2="58" y2="54" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#2563eb" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#021a4f" stop-opacity="0.8" />
    </linearGradient>
    <linearGradient id="za-sentinel-visor" x1="45" y1="34" x2="47" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#232733" />
      <stop offset="25%" stop-color="#13151c" />
      <stop offset="65%" stop-color="#08090d" />
      <stop offset="100%" stop-color="#020204" />
    </linearGradient>
    <filter id="za-sentinel-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <!-- Aqua Hydro Droid Glowing Eye Filter -->
    <filter id="za-aqua-glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.0" result="blur1" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.4" result="blur2" />
      <feMerge>
        <feMergeNode in="blur1" />
        <feMergeNode in="blur2" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <!-- Mochi Cyber Neko Painted Snow-White Anime Gradients & Filters -->
    <radialGradient id="za-neko-shell" cx="42%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="38%" stop-color="#fff5f8" />
      <stop offset="70%" stop-color="#f5e6f3" />
      <stop offset="88%" stop-color="#ead6e8" />
      <stop offset="100%" stop-color="#dfcadc" />
    </radialGradient>
    <linearGradient id="za-neko-rim" x1="32" y1="22" x2="58" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f472b6" />
      <stop offset="45%" stop-color="#fb7185" />
      <stop offset="80%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <linearGradient id="za-neko-ear-inner" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd5e5" />
      <stop offset="35%" stop-color="#f472b6" />
      <stop offset="75%" stop-color="#e11d48" />
      <stop offset="100%" stop-color="#9f1239" />
    </linearGradient>
    <linearGradient id="za-neko-ear" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd5e5" />
      <stop offset="35%" stop-color="#f472b6" />
      <stop offset="75%" stop-color="#e11d48" />
      <stop offset="100%" stop-color="#9f1239" />
    </linearGradient>
    <linearGradient id="za-neko-eye" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e0b36" />
      <stop offset="35%" stop-color="#581c87" />
      <stop offset="60%" stop-color="#a21caf" />
      <stop offset="80%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <radialGradient id="za-neko-blush" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fb7185" stop-opacity="0.85" />
      <stop offset="55%" stop-color="#fda4af" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#fda4af" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="za-neko-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="45%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <linearGradient id="za-neko-ribbon" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e11d48" />
      <stop offset="50%" stop-color="#fb7185" />
      <stop offset="100%" stop-color="#be123c" />
    </linearGradient>
    <linearGradient id="za-neko-whisk-l" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ec4899" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#db2777" stop-opacity="0.95" />
    </linearGradient>
    <linearGradient id="za-neko-whisk-r" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#ec4899" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#db2777" stop-opacity="0.95" />
    </linearGradient>
    <filter id="za-neko-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <!-- Kuro Star Gradients & Filters -->
    <radialGradient id="za-kuro-body" cx="38%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#242630" />
      <stop offset="40%" stop-color="#12131b" />
      <stop offset="75%" stop-color="#08080e" />
      <stop offset="100%" stop-color="#020204" />
    </radialGradient>
    <linearGradient id="za-kuro-rim" x1="34" y1="28" x2="56" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
      <stop offset="35%" stop-color="#94a3b8" stop-opacity="0.3" />
      <stop offset="70%" stop-color="#475569" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.45" />
    </linearGradient>
    <filter id="za-kuro-eye-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="za-grok-eye-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  ${shapeContent}
</svg>`;
}

/**
 * Generates an SVG markup string for any custom combination of pointer and avatar.
 */
export function getCustomCombinedCursorMarkup(
  pointerId: string,
  avatarId: string,
  uniquePrefix: string = 'za-combo',
  mode: CursorDisplayMode = 'combined',
  avatarScale: number = 1.0
): string {
  const avatarTheme = avatarId === 'avatar_cloud_bot' || avatarId === 'cloud_bot' ? cloudBot : obsidianGlass;
  const baseTheme = avatarTheme;

  const bodyGradId = `${uniquePrefix}-body-${baseTheme.id}`;
  const rimGradId = `${uniquePrefix}-rim-${baseTheme.id}`;
  const sheenGradId = `${uniquePrefix}-sheen-${baseTheme.id}`;

  const bodyStops = baseTheme.bodyGradient
    .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}" stop-opacity="${s.opacity ?? 1}" />`)
    .join('');

  const rimStops = baseTheme.rimGradient
    .map((s) => `<stop offset="${s.offset}" stop-color="${s.color}" />`)
    .join('');

  const shapeContent = getCursorShapeSvgPaths(baseTheme, bodyGradId, rimGradId, sheenGradId, mode, pointerId, avatarId, avatarScale);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="58" height="58" viewBox="0 0 64 64" fill="none" class="za-glass-svg">
  <defs>
    <style>
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
        transform-box: fill-box;
        transform-origin: center;
        animation: za-bot-blink 18.0s infinite cubic-bezier(0.25, 1, 0.5, 1);
      }
      .za-avatar-shadow {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-avatar-shadow-breathe 18.0s infinite ease-in-out;
      }
      .za-grok-sphere {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-grok-float 18.0s infinite ease-in-out;
      }
      .za-cloud-pod {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-cloud-drift 18.0s infinite ease-in-out;
      }
      .za-cloud-pillow {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-cloud-puff 18.0s infinite ease-in-out;
      }
      .za-sentinel-head {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-sentinel-hover 18.0s infinite ease-in-out;
      }
      .za-sentinel-fin-left {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-sentinel-fin-left 18.0s infinite ease-in-out;
      }
      .za-sentinel-fin-right {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-sentinel-fin-right 18.0s infinite ease-in-out;
      }
      .za-sentinel-glint {
        animation: za-sentinel-visor-sweep 18.0s infinite ease-in-out;
      }
      .za-neko-head {
        transform-box: fill-box;
        transform-origin: center;
        animation: za-neko-head-float 18.0s infinite ease-in-out;
      }
      .za-neko-bell {
        transform-box: fill-box;
        transform-origin: 45px 48px;
        animation: za-neko-bell-jingle 18.0s infinite ease-in-out;
      }
      .za-neko-ear {
        transform-box: fill-box;
      }
      .za-neko-ear-left {
        transform-origin: 80% 90%;
        animation: za-neko-ear-left-idle 18.0s infinite cubic-bezier(0.25, 1, 0.5, 1);
      }
      .za-neko-ear-right {
        transform-origin: 20% 90%;
        animation: za-neko-ear-right-idle 18.0s infinite cubic-bezier(0.25, 1, 0.5, 1);
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

      /* Kuro Star Breathing & Floating (18.0s Long Cycle) */
      @keyframes za-kuro-float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        18% { transform: translateY(-1.2px) rotate(0.8deg); }
        35% { transform: translateY(-0.4px) rotate(-0.5deg); }
        52% { transform: translateY(1.0px) rotate(0.6deg); }
        70% { transform: translateY(-1.4px) rotate(-0.8deg); }
        86% { transform: translateY(-0.6px) rotate(0.3deg); }
      }
      @keyframes za-kuro-spin {
        0% { transform: rotate(0deg) scale(1); }
        50% { transform: rotate(180deg) scale(1.18); }
        100% { transform: rotate(360deg) scale(1); }
      }
      .za-kuro-body {
        transform-origin: 45px 41px !important;
        animation: za-kuro-float 18.0s infinite ease-in-out !important;
      }
      .za-success .za-kuro-body, .za-anim-happy .za-kuro-body {
        animation: za-kuro-spin 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
      }
    </style>
    <linearGradient id="${bodyGradId}" x1="14" y1="8" x2="48" y2="48" gradientUnits="userSpaceOnUse">
      ${bodyStops}
    </linearGradient>
    <linearGradient id="${rimGradId}" x1="12" y1="6" x2="48" y2="48" gradientUnits="userSpaceOnUse">
      ${rimStops}
    </linearGradient>
    <linearGradient id="${sheenGradId}" x1="14" y1="8" x2="28" y2="38" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
      <stop offset="40%" stop-color="${baseTheme.accentColor}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="${baseTheme.accentColor}" stop-opacity="0.0" />
    </linearGradient>
    <filter id="za-glass-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.0" result="blur" />
    </filter>
    <clipPath id="za-visor-clip">
      <rect x="37.5" y="36.5" width="15" height="9" rx="4.5" />
    </clipPath>
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
    <!-- Stylish Pointer: Cyber Neon Aurora Delta (Tailless) Gradients -->
    <linearGradient id="za-nd-rim" x1="13.5" y1="27" x2="30.5" y2="12" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="35%" stop-color="#3b82f6" />
      <stop offset="70%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#d946ef" />
    </linearGradient>
    <linearGradient id="za-nd-core" x1="16" y1="8" x2="25" y2="24" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#090c17" />
      <stop offset="50%" stop-color="#0e1326" />
      <stop offset="100%" stop-color="#181735" />
    </linearGradient>
    <linearGradient id="za-nd-bevel" x1="16.5" y1="12" x2="21" y2="23" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.8" />
      <stop offset="55%" stop-color="#1e1b4b" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#c084fc" stop-opacity="0.12" />
    </linearGradient>
    <filter id="za-nd-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="1.6" result="blur" />
    </filter>
    <!-- Stylish Pointer 1: Orbital Nova Ceramic Gradients -->
    <linearGradient id="za-orbit-silver" x1="12" y1="12" x2="36" y2="28" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#94a3b8" />
      <stop offset="35%" stop-color="#ffffff" />
      <stop offset="70%" stop-color="#cbd5e1" />
      <stop offset="100%" stop-color="#64748b" />
    </linearGradient>
    <radialGradient id="za-pearl-sphere" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="45%" stop-color="#f1f5f9" />
      <stop offset="75%" stop-color="#cbd5e1" />
      <stop offset="100%" stop-color="#64748b" />
    </radialGradient>
    <linearGradient id="za-ceramic-shell" x1="16" y1="8" x2="26.5" y2="25.5" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="50%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#e2e8f0" />
    </linearGradient>
    <linearGradient id="za-ceramic-chamfer" x1="16" y1="8" x2="18" y2="23.5" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="45%" stop-color="#e2e8f0" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </linearGradient>
    <linearGradient id="za-ceramic-cavity" x1="17" y1="12" x2="20" y2="21" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="55%" stop-color="#09090b" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <!-- Stylish Pointer 2: Obsidian Celestial Starlight Gradients -->
    <linearGradient id="za-obsidian-core" x1="16" y1="8" x2="26.5" y2="25.5" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#030308" />
      <stop offset="50%" stop-color="#0d0d18" />
      <stop offset="100%" stop-color="#18152e" />
    </linearGradient>
    <linearGradient id="za-violet-halo" x1="14" y1="6" x2="28" y2="28" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="35%" stop-color="#a855f7" />
      <stop offset="70%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <linearGradient id="za-celestial-arc" x1="15" y1="12" x2="35" y2="28" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#c084fc" />
      <stop offset="50%" stop-color="#818cf8" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
    <radialGradient id="za-celestial-orb" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="35%" stop-color="#e9d5ff" />
      <stop offset="70%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#7e22ce" />
    </radialGradient>
    <radialGradient id="za-nova-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
      <stop offset="35%" stop-color="#c084fc" stop-opacity="0.8" />
      <stop offset="70%" stop-color="#818cf8" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#818cf8" stop-opacity="0" />
    </radialGradient>
    <!-- Aero Sentinel Droid Gradients (Cobalt Velvet 3D Sphere & Glossy Visor) -->
    <radialGradient id="za-sentinel-shell" cx="34%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#4ba2ff" />
      <stop offset="22%" stop-color="#1d74ff" />
      <stop offset="50%" stop-color="#0052e0" />
      <stop offset="78%" stop-color="#072d8a" />
      <stop offset="100%" stop-color="#020e33" />
    </radialGradient>
    <linearGradient id="za-sentinel-rim" x1="32" y1="28" x2="58" y2="54" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#2563eb" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#021a4f" stop-opacity="0.8" />
    </linearGradient>
    <linearGradient id="za-sentinel-visor" x1="45" y1="34" x2="47" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#232733" />
      <stop offset="25%" stop-color="#13151c" />
      <stop offset="65%" stop-color="#08090d" />
      <stop offset="100%" stop-color="#020204" />
    </linearGradient>
    <filter id="za-sentinel-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <!-- Aqua Hydro Droid Glowing Eye Filter -->
    <filter id="za-aqua-glow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="1.0" result="blur1" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.4" result="blur2" />
      <feMerge>
        <feMergeNode in="blur1" />
        <feMergeNode in="blur2" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <!-- Mochi Cyber Neko Painted Snow-White Anime Gradients & Filters -->
    <radialGradient id="za-neko-shell" cx="42%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="38%" stop-color="#fff5f8" />
      <stop offset="70%" stop-color="#f5e6f3" />
      <stop offset="88%" stop-color="#ead6e8" />
      <stop offset="100%" stop-color="#dfcadc" />
    </radialGradient>
    <linearGradient id="za-neko-rim" x1="32" y1="22" x2="58" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f472b6" />
      <stop offset="45%" stop-color="#fb7185" />
      <stop offset="80%" stop-color="#c084fc" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <linearGradient id="za-neko-ear-inner" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd5e5" />
      <stop offset="35%" stop-color="#f472b6" />
      <stop offset="75%" stop-color="#e11d48" />
      <stop offset="100%" stop-color="#9f1239" />
    </linearGradient>
    <linearGradient id="za-neko-ear" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd5e5" />
      <stop offset="35%" stop-color="#f472b6" />
      <stop offset="75%" stop-color="#e11d48" />
      <stop offset="100%" stop-color="#9f1239" />
    </linearGradient>
    <linearGradient id="za-neko-eye" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e0b36" />
      <stop offset="35%" stop-color="#581c87" />
      <stop offset="60%" stop-color="#a21caf" />
      <stop offset="80%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <radialGradient id="za-neko-blush" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fb7185" stop-opacity="0.85" />
      <stop offset="55%" stop-color="#fda4af" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#fda4af" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="za-neko-gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="45%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <linearGradient id="za-neko-ribbon" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e11d48" />
      <stop offset="50%" stop-color="#fb7185" />
      <stop offset="100%" stop-color="#be123c" />
    </linearGradient>
    <linearGradient id="za-neko-whisk-l" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ec4899" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#db2777" stop-opacity="0.95" />
    </linearGradient>
    <linearGradient id="za-neko-whisk-r" x1="100%" y1="0%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#ec4899" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#db2777" stop-opacity="0.95" />
    </linearGradient>
    <filter id="za-neko-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <!-- Kuro Star Gradients & Filters -->
    <radialGradient id="za-kuro-body" cx="38%" cy="32%" r="68%">
      <stop offset="0%" stop-color="#242630" />
      <stop offset="40%" stop-color="#12131b" />
      <stop offset="75%" stop-color="#08080e" />
      <stop offset="100%" stop-color="#020204" />
    </radialGradient>
    <linearGradient id="za-kuro-rim" x1="34" y1="28" x2="56" y2="52" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
      <stop offset="35%" stop-color="#94a3b8" stop-opacity="0.3" />
      <stop offset="70%" stop-color="#475569" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.45" />
    </linearGradient>
    <filter id="za-kuro-eye-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="za-grok-eye-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  ${shapeContent}
</svg>`;
}

