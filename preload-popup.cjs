// Preload bridge for app renderer & auth popups
const { contextBridge, ipcRenderer } = require('electron');

try {
  contextBridge.exposeInMainWorld('zeroApply', {
    isDesktop: true,
    autoInstallLLM: process.argv.includes('--auto-install-llm'),
    installOllama: () => ipcRenderer.invoke('install-ollama-engine'),
    startOllama: () => ipcRenderer.invoke('start-ollama-daemon'),
    launchChromeAgent: (url) => ipcRenderer.invoke('chrome-agent-launch', url),
    chromeAgentNavigate: (url) => ipcRenderer.invoke('chrome-agent-navigate', url),
    chromeAgentEvaluate: (script) => ipcRenderer.invoke('chrome-agent-evaluate', script),
    chromeAgentSelectActiveTarget: () => ipcRenderer.invoke('chrome-agent-select-active-target'),
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
