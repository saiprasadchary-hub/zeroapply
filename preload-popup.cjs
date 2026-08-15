// Preload bridge for app renderer & auth popups
const { contextBridge } = require('electron');

try {
  contextBridge.exposeInMainWorld('zeroApply', { isDesktop: true });
} catch {}
