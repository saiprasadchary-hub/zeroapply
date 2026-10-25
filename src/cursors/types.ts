/**
 * ZeroApply Cursor Studio - Type Definitions
 * Data models and interfaces for customizable visual agent cursors.
 */

export type CursorDisplayMode = 'combined' | 'cursor' | 'avatar';

export type CursorShapeType =
  | 'arrow'
  | 'cloud'
  | 'crosshair'
  | 'halo'
  | 'wand'
  | 'pen'
  | 'chevron'
  | 'loupe'
  | 'ibeam';

export interface GradientStop {
  offset: string;
  color: string;
  opacity?: number;
}

export interface CursorTheme {
  id: string;
  name: string;
  tag: string;
  shapeType: CursorShapeType;
  category: 'flagship' | 'stealth' | 'cyber' | 'turbo' | 'minimal' | 'precision' | 'ai' | 'executive';
  description: string;
  accentColor: string;
  underlayColor: string;
  sheenColor: string;
  glintColor: string;
  bodyGradient: GradientStop[];
  rimGradient: GradientStop[];
  logoRimColor?: string;
  badgeBg: string;
  badgeBorder: string;
  badgeTextColor: string;
  hotspot: { x: number; y: number };
  previewClass?: string;
}

export type CursorStudioCategory = 'cursor' | 'avatar';
export type CursorPointerId =
  | 'pointer_stealth'
  | 'pointer_sky_aero'
  | 'pointer_neon_delta'
  | 'pointer_orbital_ceramic'
  | 'pointer_obsidian_starlight';
export type CursorAvatarId =
  | 'avatar_grok_bot'
  | 'avatar_cloud_bot'
  | 'avatar_sentinel_bot'
  | 'avatar_mochi_neko';

export interface CursorCategoryItem {
  id: string;
  themeId: string;
  category: CursorStudioCategory;
  name: string;
  tag: string;
  badge: string;
  description: string;
  accentColor: string;
  features: string[];
}

export interface CursorPointerOption {
  id: CursorPointerId;
  themeId: string;
  name: string;
  tag: string;
  badge: string;
  description: string;
  accentColor: string;
  features: string[];
}

export interface CursorAvatarOption {
  id: CursorAvatarId;
  themeId: string;
  name: string;
  tag: string;
  badge: string;
  description: string;
  accentColor: string;
  features: string[];
}


