// Preload bridge for app renderer & auth popups
const { contextBridge, ipcRenderer } = require('electron');

try {
  contextBridge.exposeInMainWorld('zeroApply', {
    isDesktop: true,
    getDesktopUpdateStatus: () => ipcRenderer.invoke('desktop-update-status'),
    checkDesktopUpdates: () => ipcRenderer.invoke('desktop-update-check'),
    downloadDesktopUpdate: () => ipcRenderer.invoke('desktop-update-download'),
    installDesktopUpdate: () => ipcRenderer.invoke('desktop-update-install'),
    setAutoApplyActive: (active) => ipcRenderer.invoke('desktop-autoapply-active', active),
    onDesktopUpdateState: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const listener = (_event, state) => callback(state);
      ipcRenderer.on('desktop-update-state', listener);
      return () => ipcRenderer.removeListener('desktop-update-state', listener);
    },
    startEmbeddedLlm: () => ipcRenderer.invoke('embedded-llm-start'),
    getEmbeddedLlmStatus: () => ipcRenderer.invoke('embedded-llm-status'),
    generateEmbeddedLlm: (payload) => ipcRenderer.invoke('embedded-llm-generate', payload),
    stopEmbeddedLlm: () => ipcRenderer.invoke('embedded-llm-stop'),
    onEmbeddedLlmState: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const listener = (_event, state) => callback(state);
      ipcRenderer.on('embedded-llm-state', listener);
      return () => ipcRenderer.removeListener('embedded-llm-state', listener);
    },
    // Chrome agent (legacy)
    launchChromeAgent: (url) => ipcRenderer.invoke('chrome-agent-launch', url),
    chromeAgentNavigate: (url) => ipcRenderer.invoke('chrome-agent-navigate', url),
    chromeAgentEvaluate: (script) => ipcRenderer.invoke('chrome-agent-evaluate', script),
    chromeAgentSelectActiveTarget: () => ipcRenderer.invoke('chrome-agent-select-active-target'),
    // Camoufox anti-detect Firefox agent
    launchCamoufox: (url) => ipcRenderer.invoke('camoufox-launch', url),
    camoufoxNavigate: (url) => ipcRenderer.invoke('camoufox-navigate', url),
    camoufoxEvaluate: (script) => ipcRenderer.invoke('camoufox-evaluate', script),
    camoufoxClose: () => ipcRenderer.invoke('camoufox-close'),
    secureGet: (key) => ipcRenderer.sendSync('secure-storage-get', key),
    secureSet: (key, value) => ipcRenderer.invoke('secure-storage-set', key, value),
    secureRemove: (key) => ipcRenderer.invoke('secure-storage-remove', key),
    onBrowserEvent: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('zeroapply-browser-event', listener);
      return () => ipcRenderer.removeListener('zeroapply-browser-event', listener);
    },
    onOpenTab: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('zeroapply-open-tab', listener);
      return () => ipcRenderer.removeListener('zeroapply-open-tab', listener);
    },
    onBrowserCommand: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('zeroapply-browser-command', listener);
      return () => ipcRenderer.removeListener('zeroapply-browser-command', listener);
    },
  });

} catch (error) {
  console.error('ZeroApply preload bridge failed:', error);
}
