import type { CursorTheme } from './types';

/**
 * 02. Cloud Companion Bot (Nimbus Style Pointer)
 * Cute dual-tone white/blue arrow pointer resting on a soft cumulus cloud with dark pebble bot face & wide cyan ring eyes.
 */
export const cloudBot: CursorTheme = {
  id: 'cloud_bot',
  name: 'Cloud Companion Bot',
  tag: 'CLOUD BOT',
  shapeType: 'cloud',
  category: 'flagship',
  description: 'Dual-tone sky blue pointer with cozy cumulus cloud pod, midnight pebble bot face & expressive wide circular eyes.',
  accentColor: '#38bdf8',
  underlayColor: '#0f172a',
  sheenColor: 'rgba(56, 189, 248, 0.4)',
  glintColor: '#ffffff',
  logoRimColor: '#38bdf8',
  bodyGradient: [
    { offset: '0%', color: '#ffffff', opacity: 0.98 },
    { offset: '50%', color: '#f0f9ff', opacity: 0.98 },
    { offset: '100%', color: '#e0f2fe', opacity: 0.98 },
  ],
  rimGradient: [
    { offset: '0%', color: '#38bdf8' },
    { offset: '50%', color: '#60a5fa' },
    { offset: '100%', color: '#2563eb' },
  ],
  badgeBg: 'rgba(15, 23, 42, 0.92)',
  badgeBorder: 'rgba(56, 189, 248, 0.5)',
  badgeTextColor: '#e0f2fe',
  hotspot: { x: 16, y: 8 },
};
