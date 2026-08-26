export type PointerStyle = 'pro-cursor' | 'minimal-dot' | 'agent-arrow';

export interface PointerConfig {
  enabled: boolean;
  style: PointerStyle;
  showClickRipple: boolean;
  showAgentTag: boolean;
  tagLabel: string;
  cursorColor: string;
  rippleColor: string;
  size: number;
  smoothnessMs: number;
}

export interface PointerPosition {
  x: number;
  y: number;
}

export interface PointerActionState {
  position: PointerPosition;
  isClicking: boolean;
  isTyping: boolean;
  actionText?: string;
}

export const DEFAULT_POINTER_CONFIG: PointerConfig = {
  enabled: true,
  style: 'pro-cursor',
  showClickRipple: true,
  showAgentTag: true,
  tagLabel: 'ZeroApply',
  cursorColor: '#09090b',
  rippleColor: 'rgba(9, 9, 11, 0.25)',
  size: 20,
  smoothnessMs: 180,
};
