import { app, BrowserWindow, session, ipcMain, dialog, safeStorage, shell, Menu, clipboard } from 'electron';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import net from 'net';
import { execFile, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import WebSocket from 'ws';
import { isDeferredPopupUrl, isLinkedInSafetyUrl, isLinkedInTrackerUrl, normalizeGestureCandidates, resolveGestureDestination, resolvePopupDestination } from './AgentBrowser/browser-navigation.js';
import { browserCommandForInput, isExternalProtocol, parseWebDestination, sanitizedPageFilename } from './AgentBrowser/electron-browser-features.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let rendererServer = null;
let updateCheckTimer = null;
let rendererUrlInUse = null;
let unresponsiveDialogOpen = false;
let handlingFatalError = false;
let chromeAgentProcess = null;
let chromeAgentPort = null;
let chromeAgentConnection = null;
const isSmokeTest = process.argv.includes('--smoke-test');

const PRELOAD_POPUP_PATH = path.join(__dirname, 'preload-popup.cjs');
const PRELOAD_WEBVIEW_PATH = path.join(__dirname, 'AgentBrowser', 'preload-webview.cjs');
const AUTH_PARTITION = 'persist:zeroapply_auth';
const configuredSessions = new WeakSet();
const topLevelAuthWindows = new Set();
const popupGestureTimes = new WeakMap();
const popupDestinationTimes = new WeakMap();
const applyClickTimers = new WeakMap();
const webviewRecoveryState = new WeakMap();
const BROWSER_CACHE_SCHEMA = 'native-chromium-v1';
const RELEASE_API_URL = 'https://api.github.com/repos/saiprasadchary-hub/zeroapply/releases/latest';
const RELEASES_URL_PREFIX = 'https://github.com/saiprasadchary-hub/zeroapply/releases/';
const CHROME_AGENT_PROFILE_PATH = path.join(app.getPath('appData'), 'ZeroApply_Chrome_Agent_Profile');

app.name = 'ZeroApply';

function describeError(value) {
  if (value instanceof Error) return value.stack || value.message;
  try {
    return typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    return 'Unknown error';
  }
}

function isSafeChromeAgentUrl(value) {
  if (typeof value !== 'string' || value.length > 4096) return false;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && !parsed.username
      && !parsed.password;
  } catch {
    return false;
  }
}

function findChromeExecutable() {
  const candidates = process.platform === 'win32'
    ? [
      process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
      process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ]
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/snap/bin/chromium'];
  return candidates.filter(Boolean).find((candidate) => fs.existsSync(candidate)) || null;
}

function reserveLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

function readLocalJson(port, pathname) {
  return new Promise((resolve, reject) => {
    const request = http.get({ hostname: '127.0.0.1', port, path: pathname, timeout: 1500 }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
        if (body.length > 2_000_000) request.destroy(new Error('Chrome response was too large.'));
      });
      response.on('end', () => {
        if (response.statusCode !== 200) {
          reject(new Error(`Chrome debugging endpoint returned ${response.statusCode || 'an error'}.`));
          return;
        }
        try { resolve(JSON.parse(body)); } catch { reject(new Error('Chrome returned invalid debugging data.')); }
      });
    });
    request.on('error', reject);
    request.on('timeout', () => request.destroy(new Error('Chrome debugging connection timed out.')));
  });
}

class ChromeDevToolsConnection {
  constructor(webSocketUrl) {
    this.socket = new WebSocket(webSocketUrl, { origin: 'http://127.0.0.1' });
    this.pending = new Map();
    this.nextId = 1;
    this.ready = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Chrome automation connection timed out.')), 5000);
      this.socket.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
      this.socket.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error('Chrome automation connection failed.'));
      }, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message || 'Chrome rejected an automation command.'));
      else pending.resolve(message.result || {});
    });
    this.socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) pending.reject(new Error('Chrome automation connection closed.'));
      this.pending.clear();
    });
  }

  async call(method, params = {}) {
    await this.ready;
    if (this.socket.readyState !== WebSocket.OPEN) throw new Error('Chrome automation is not connected.');
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Chrome command ${method} timed out.`));
      }, 30_000);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timeout); resolve(value); },
        reject: (error) => { clearTimeout(timeout); reject(error); },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try { this.socket.close(); } catch {}
  }
}

async function connectChromeAgentTarget(preferredUrl = '') {
  if (!chromeAgentPort) throw new Error('Chrome agent is not running.');
  const targets = await readLocalJson(chromeAgentPort, '/json/list');
  const pages = Array.isArray(targets)
    ? targets.filter((target) => target?.type === 'page' && typeof target.webSocketDebuggerUrl === 'string')
    : [];
  const preferred = pages.find((target) => preferredUrl && target.url === preferredUrl)
    || pages.find((target) => !String(target.url || '').startsWith('chrome://'))
    || pages[0];
  if (!preferred) throw new Error('Chrome opened, but no controllable page was found.');
  chromeAgentConnection?.close();
  chromeAgentConnection = new ChromeDevToolsConnection(preferred.webSocketDebuggerUrl);
  await chromeAgentConnection.ready;
  await chromeAgentConnection.call('Runtime.enable');
  await chromeAgentConnection.call('Page.enable');
  await chromeAgentConnection.call('Page.bringToFront');
  return preferred;
}

async function launchChromeAgent(startUrl) {
  if (!isSafeChromeAgentUrl(startUrl)) throw new Error('Chrome agent received an unsafe address.');
  const chromeExecutable = findChromeExecutable();
  if (!chromeExecutable) throw new Error('Google Chrome is not installed in a supported location.');

  if (chromeAgentConnection) {
    await chromeAgentConnection.call('Page.navigate', { url: startUrl });
    await chromeAgentConnection.call('Page.bringToFront');
    return { ok: true, url: startUrl };
  }

  fs.mkdirSync(CHROME_AGENT_PROFILE_PATH, { recursive: true });
  chromeAgentPort = await reserveLoopbackPort();
  chromeAgentProcess = spawn(chromeExecutable, [
    `--remote-debugging-port=${chromeAgentPort}`,
    '--remote-debugging-address=127.0.0.1',
    '--remote-allow-origins=http://127.0.0.1',
    `--user-data-dir=${CHROME_AGENT_PROFILE_PATH}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-mode',
    '--new-window',
    startUrl,
  ], { stdio: 'ignore', windowsHide: false });
  chromeAgentProcess.once('exit', () => {
    chromeAgentProcess = null;
    chromeAgentPort = null;
    chromeAgentConnection?.close();
    chromeAgentConnection = null;
  });

  let lastError = null;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const target = await connectChromeAgentTarget(startUrl);
      return { ok: true, url: target.url || startUrl };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw lastError || new Error('Google Chrome did not become ready for automation.');
}

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled desktop promise rejection:', describeError(reason));
  sendBrowserEvent('A desktop background operation failed safely. Retry the action; restart ZeroApply if it continues.');
});

process.on('uncaughtException', (error) => {
  console.error('Fatal desktop error:', describeError(error));
  if (handlingFatalError) return;
  handlingFatalError = true;
  if (app.isReady()) {
    dialog.showErrorBox(
      'ZeroApply recovered from a fatal error',
      'The desktop shell must restart to return to a safe state. Your saved profile and login session will remain available.',
    );
  }
  if (!process.argv.includes('--recovered-from-crash')) {
    app.relaunch({ args: [...process.argv.slice(1), '--recovered-from-crash'] });
  }
  app.exit(1);
});

// Set dedicated login session directory
const loginSessionDir = isSmokeTest
  ? path.join(app.getPath('temp'), 'ZeroApply_Smoke_Test')
  : path.join(app.getPath('appData'), 'ZeroApply_Login_Sessions');
try {
  if (!fs.existsSync(loginSessionDir)) {
    fs.mkdirSync(loginSessionDir, { recursive: true });
  }
  app.setPath('userData', loginSessionDir);
} catch (err) {
  console.warn('Could not set custom login session directory:', err);
}

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

function sanitizeDownloadFilename(value) {
  const basename = path.basename(value || 'download');
  let sanitized = Array.from(basename, (character) => {
    const codePoint = character.codePointAt(0) || 0;
    return codePoint < 32 || '<>:"/\\|?*'.includes(character) ? '_' : character;
  }).join('').replace(/[ .]+$/g, '').trim().slice(0, 180);
  if (!sanitized) sanitized = 'download';
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(sanitized)) sanitized = `_${sanitized}`;
  return sanitized;
}

function configureSession(targetSession) {
  if (configuredSessions.has(targetSession)) return targetSession;

  const chromeVersion = process.versions.chrome || '132.0.0.0';
  const chromeUserAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion} Safari/537.36`;
  targetSession.setUserAgent(chromeUserAgent, 'en-US,en;q=0.9');

  targetSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    delete requestHeaders['X-Electron-Version'];
    delete requestHeaders['x-electron-version'];
    if (!requestHeaders['Accept-Language']) {
      requestHeaders['Accept-Language'] = 'en-US,en;q=0.9';
    }
    callback({ requestHeaders });
  });

  targetSession.cookies.on('changed', () => {
    targetSession.cookies.flushStore().catch((error) => console.warn('Cookie flush failed:', error));
  });

  const permissionDecisions = new Map();
  const pendingPermissionPrompts = new Map();
  const promptablePermissions = new Set([
    'clipboard-read',
    'geolocation',
    'keyboardLock',
    'media',
    'notifications',
    'openExternal',
    'pointerLock',
    'speaker-selection',
  ]);
  const secureAutomaticPermissions = new Set([
    'clipboard-sanitized-write',
    'fullscreen',
    'mediaKeySystem',
    'storage-access',
    'top-level-storage-access',
  ]);
  const permissionLabel = (permission, details = {}) => {
    if (permission === 'media') {
      const requested = details.mediaTypes || (details.mediaType ? [details.mediaType] : []);
      if (requested.includes('video') && requested.includes('audio')) return 'your camera and microphone';
      if (requested.includes('video')) return 'your camera';
      if (requested.includes('audio')) return 'your microphone';
    }
    return ({
      'clipboard-read': 'read your clipboard',
      geolocation: 'use your location',
      keyboardLock: 'capture browser keyboard shortcuts',
      notifications: 'show notifications',
      openExternal: 'open another application',
      pointerLock: 'control the mouse pointer',
      'speaker-selection': 'choose an audio output device',
    })[permission] || `use the ${permission} permission`;
  };
  const permissionContext = (permission, requestingOrigin, details = {}) => {
    const requestUrl = details.requestingUrl || details.securityOrigin || requestingOrigin || '';
    try {
      const parsed = new URL(requestUrl);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
      const mediaType = Array.isArray(details.mediaTypes)
        ? details.mediaTypes.join(',')
        : String(details.mediaType || '');
      return {
        host: parsed.hostname,
        key: `${parsed.origin}|${permission}|${mediaType}`,
      };
    } catch {
      return null;
    }
  };
  targetSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details = {}) => {
    const requestUrl = details.requestingUrl || requestingOrigin || '';
    if (isLocalAppUrl(requestUrl)) return permission === 'notifications';
    const context = permissionContext(permission, requestingOrigin, details);
    if (!context) return false;
    if (secureAutomaticPermissions.has(permission)) return true;
    return permissionDecisions.get(context.key) === true;
  });
  targetSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const requestUrl = details?.requestingUrl || details?.securityOrigin || webContents.getURL();
    if (isLocalAppUrl(requestUrl)) {
      callback(permission === 'notifications');
      return;
    }
    const context = permissionContext(permission, requestUrl, details);
    if (!context) {
      callback(false);
      return;
    }
    if (secureAutomaticPermissions.has(permission)) {
      callback(true);
      return;
    }
    if (!promptablePermissions.has(permission)) {
      callback(false);
      return;
    }
    if (permissionDecisions.has(context.key)) {
      callback(permissionDecisions.get(context.key) === true);
      return;
    }

    let prompt = pendingPermissionPrompts.get(context.key);
    if (!prompt) {
      const owner = BrowserWindow.fromWebContents(webContents) || mainWindow;
      if (!owner || owner.isDestroyed()) {
        callback(false);
        return;
      }
      prompt = dialog.showMessageBox(owner, {
        type: 'question',
        title: 'Website permission',
        message: `${context.host} wants to ${permissionLabel(permission, details)}.`,
        detail: 'Allow only if you trust this website. This choice lasts until ZeroApply is closed.',
        buttons: ['Allow for this session', 'Block'],
        defaultId: 1,
        cancelId: 1,
        noLink: true,
      }).then((result) => result.response === 0);
      pendingPermissionPrompts.set(context.key, prompt);
      void prompt.then(
        () => pendingPermissionPrompts.delete(context.key),
        () => pendingPermissionPrompts.delete(context.key),
      );
    }
    void prompt.then((allowed) => {
      permissionDecisions.set(context.key, allowed);
      callback(allowed);
    }).catch((error) => {
      console.warn('Website permission prompt failed:', error);
      callback(false);
    });
  });
  targetSession.on('will-download', (_event, item) => {
    const safeName = sanitizeDownloadFilename(item.getFilename());
    const options = {
      title: 'Save download',
      defaultPath: path.join(app.getPath('downloads'), safeName || 'download'),
    };
    item.pause();
    item.once('done', (_downloadEvent, state) => {
      if (state === 'completed') sendBrowserEvent(`Downloaded ${safeName}.`);
      else if (state !== 'cancelled') sendBrowserEvent(`Download failed: ${safeName}.`);
    });
    const selection = mainWindow && !mainWindow.isDestroyed()
      ? dialog.showSaveDialog(mainWindow, options)
      : dialog.showSaveDialog(options);
    void selection.then((result) => {
      if (result.canceled || !result.filePath) {
        item.cancel();
        return;
      }
      item.setSavePath(result.filePath);
      item.resume();
    }).catch((error) => {
      item.cancel();
      console.warn('Download selection failed:', error);
    });
  });
  configuredSessions.add(targetSession);

  return targetSession;
}

function getAuthSession() {
  const authSession = session.fromPartition(AUTH_PARTITION, {
    cache: true,
  });
  return configureSession(authSession);
}

async function migrateBrowserCacheIfNeeded() {
  const markerPath = path.join(app.getPath('userData'), 'browser-cache-schema');
  let currentSchema = '';
  try {
    currentSchema = fs.readFileSync(markerPath, 'utf8').trim();
  } catch (error) {
    if (error?.code !== 'ENOENT') console.warn('Browser cache marker could not be read:', error);
  }
  if (currentSchema === BROWSER_CACHE_SCHEMA) return;

  await Promise.all([
    session.defaultSession.clearCache(),
    getAuthSession().clearCache(),
  ]);
  const temporaryPath = `${markerPath}.tmp`;
  fs.writeFileSync(temporaryPath, BROWSER_CACHE_SCHEMA, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporaryPath, markerPath);
}

const TRUSTED_AUTH_HOSTS = [
  'accounts.google.com',
  'accounts.googleusercontent.com',
  'zero-apply.firebaseapp.com',
  'zero-apply.web.app',
  'appleid.apple.com',
  'login.microsoftonline.com',
  'github.com',
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'naukri.com',
  'unstop.com',
];

const IDENTITY_POPUP_HOSTS = [
  'accounts.google.com',
  'accounts.googleusercontent.com',
  'zero-apply.firebaseapp.com',
  'zero-apply.web.app',
  'appleid.apple.com',
  'login.microsoftonline.com',
  'github.com',
];

const JOB_PORTAL_HOSTS = ['linkedin.com', 'indeed.com', 'glassdoor.com', 'naukri.com', 'unstop.com'];
const BACKGROUND_POPUP_HOSTS = ['cs.ns1p.net'];

const hostMatches = (host, expected) => host === expected || host.endsWith(`.${expected}`);
const isBackgroundPopup = (host) => BACKGROUND_POPUP_HOSTS.some((expected) => hostMatches(host, expected));
const consumePopupGesture = (contents) => {
  const gesture = popupGestureTimes.get(contents);
  popupGestureTimes.delete(contents);
  return gesture && Date.now() - gesture.timestamp <= 5_000 ? gesture : null;
};

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function startRendererServer(rootDir) {
  return new Promise((resolve, reject) => {
    const resolvedRoot = path.resolve(rootDir);
    const server = http.createServer((req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        res.end();
        return;
      }

      try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        let filePath = path.resolve(resolvedRoot, `.${pathname}`);
        if (filePath !== resolvedRoot && !filePath.startsWith(`${resolvedRoot}${path.sep}`)) {
          res.writeHead(403);
          res.end();
          return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          filePath = path.join(resolvedRoot, 'index.html');
        }

        const headers = {
          'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
          'Content-Security-Policy': "default-src 'self'; script-src 'self' https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com http://127.0.0.1:11434; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-src 'self' https://*.firebaseapp.com",
          'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
          'Referrer-Policy': 'no-referrer',
          'X-Content-Type-Options': 'nosniff',
        };
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          headers['Cache-Control'] = 'public, max-age=31536000, immutable';
        } else {
          headers['Cache-Control'] = 'no-store';
        }

        res.writeHead(200, headers);
        if (req.method === 'HEAD') res.end();
        else {
          const stream = fs.createReadStream(filePath);
          stream.on('error', () => res.destroy());
          stream.pipe(res);
        }
      } catch {
        res.writeHead(400);
        res.end();
      }
    });

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      rendererServer = server;
      const address = server.address();
      if (!address || typeof address === 'string') reject(new Error('Could not determine the local app port.'));
      else resolve(`http://localhost:${address.port}`);
    });
  });
}

function sendBrowserEvent(message) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('zeroapply-browser-event', { message: String(message).slice(0, 300) });
  }
}

function isLocalAppUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  } catch {
    return false;
  }
}

function isAllowedWebviewUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function sendOpenTab(value, sourceContents) {
  if (!mainWindow || mainWindow.isDestroyed() || !isAllowedWebviewUrl(value) || isLinkedInTrackerUrl(value)) return false;
  const parsed = new URL(value);
  if (isBackgroundPopup(parsed.hostname.toLowerCase())) return false;
  const sourceUrl = sourceContents && !sourceContents.isDestroyed?.()
    ? String(sourceContents.getURL?.() || '').slice(0, 8_192)
    : '';
  mainWindow.webContents.send('zeroapply-open-tab', {
    url: parsed.toString(),
    sourceUrl,
  });
  if (sourceContents) popupDestinationTimes.set(sourceContents, Date.now());
  return true;
}

function sendBrowserCommand(command) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('zeroapply-browser-command', { command });
  }
}

async function confirmOpenExternal(value) {
  if (!isExternalProtocol(value)) return;
  const parsed = new URL(value);
  const options = {
    type: 'question',
    title: 'Open external application?',
    message: `Allow this page to open a ${parsed.protocol === 'mailto:' ? 'mail' : 'phone'} application?`,
    detail: String(value).slice(0, 500),
    buttons: ['Open application', 'Cancel'],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  };
  const result = mainWindow && !mainWindow.isDestroyed()
    ? await dialog.showMessageBox(mainWindow, options)
    : await dialog.showMessageBox(options);
  if (result.response === 0) await shell.openExternal(value);
}

async function saveWebPage(contents) {
  if (!contents || contents.isDestroyed()) return;
  const defaultName = sanitizedPageFilename(contents.getTitle());
  const options = {
    title: 'Save webpage',
    defaultPath: path.join(app.getPath('downloads'), defaultName),
    filters: [{ name: 'Webpage, complete', extensions: ['html'] }],
  };
  const result = mainWindow && !mainWindow.isDestroyed()
    ? await dialog.showSaveDialog(mainWindow, options)
    : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return;
  await contents.savePage(result.filePath, 'HTMLComplete');
  sendBrowserEvent(`Saved ${path.basename(result.filePath)}.`);
}

function showWebviewContextMenu(contents, params) {
  const template = [];
  const link = parseWebDestination(params.linkURL || '');
  const source = parseWebDestination(params.srcURL || '');
  if (link) {
    template.push(
      { label: 'Open link in new tab', click: () => sendOpenTab(link.toString(), contents) },
      { label: 'Copy link address', click: () => clipboard.writeText(link.toString()) },
      { type: 'separator' },
    );
  }
  if (params.isEditable) {
    template.push(
      { role: 'undo', enabled: Boolean(params.editFlags?.canUndo) },
      { role: 'redo', enabled: Boolean(params.editFlags?.canRedo) },
      { type: 'separator' },
      { role: 'cut', enabled: Boolean(params.editFlags?.canCut) },
      { role: 'copy', enabled: Boolean(params.editFlags?.canCopy) },
      { role: 'paste', enabled: Boolean(params.editFlags?.canPaste) },
      { role: 'selectAll' },
    );
  } else {
    if (params.selectionText) template.push({ role: 'copy' });
    template.push({ role: 'selectAll' });
  }
  if (source) {
    template.push(
      { type: 'separator' },
      { label: 'Save image or media as…', click: () => contents.downloadURL(source.toString()) },
      { label: 'Copy media address', click: () => clipboard.writeText(source.toString()) },
    );
  }
  template.push(
    { type: 'separator' },
    { label: 'Back', enabled: contents.canGoBack(), click: () => contents.goBack() },
    { label: 'Forward', enabled: contents.canGoForward(), click: () => contents.goForward() },
    { label: 'Reload', click: () => contents.reload() },
    { label: 'Save page as…', click: () => void saveWebPage(contents).catch((error) => console.warn('Save page failed:', error)) },
  );
  if (!app.isPackaged) {
    template.push(
      { type: 'separator' },
      { label: 'Inspect element', click: () => contents.inspectElement(params.x, params.y) },
    );
  }
  Menu.buildFromTemplate(template).popup({ window: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined });
}

function isTrustedIpcSender(event) {
  return Boolean(
    mainWindow
    && !mainWindow.isDestroyed()
    && event.sender === mainWindow.webContents
    && isLocalAppUrl(event.senderFrame?.url || event.sender.getURL())
  );
}

function requireTrustedIpcSender(event) {
  if (!isTrustedIpcSender(event)) throw new Error('Unauthorized IPC request.');
}

const SECURE_STORAGE_KEY = /^zeroapply_[a-z0-9_.:-]{1,96}$/i;

function secureStorePath() {
  return path.join(app.getPath('userData'), 'secure-store.json');
}

function readSecureStore() {
  try {
    const value = JSON.parse(fs.readFileSync(secureStorePath(), 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (error) {
    if (error?.code !== 'ENOENT') console.warn('Secure store could not be read:', error);
    return {};
  }
}

function writeSecureStore(store) {
  const target = secureStorePath();
  const temporary = `${target}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(store), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, target);
}

function validateSecureStorageKey(key) {
  if (typeof key !== 'string' || !SECURE_STORAGE_KEY.test(key)) throw new Error('Invalid secure-storage key.');
}

function encryptSecureValue(value) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Operating-system encryption is unavailable.');
  return safeStorage.encryptString(value).toString('base64');
}

function decryptSecureValue(value) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Operating-system encryption is unavailable.');
  return safeStorage.decryptString(Buffer.from(value, 'base64'));
}

const handleWindowOpen = ({ url }, sourceContents) => {
  try {
    const isWebview = sourceContents?.getType?.() === 'webview';
    const gesture = isWebview ? consumePopupGesture(sourceContents) : null;
    if (isExternalProtocol(url)) {
      if (gesture) void confirmOpenExternal(url).catch((error) => console.warn('External application open failed:', error));
      return { action: 'deny' };
    }
    if (isWebview && gesture && isDeferredPopupUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          show: false,
          width: 1000,
          height: 760,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            partition: AUTH_PARTITION,
          },
        },
      };
    }
    let parsed = resolvePopupDestination(url);
    if ((!parsed || !['http:', 'https:'].includes(parsed.protocol)) && gesture) parsed = resolveGestureDestination(gesture);
    if (!parsed) {
      if (isWebview) sendBrowserEvent('LinkedIn did not provide a usable destination for this link. Reopen the job details and retry Apply.');
      return { action: 'deny' };
    }
    const host = parsed.hostname.toLowerCase();
    const isSecure = parsed.protocol === 'https:' && !parsed.username && !parsed.password;
    const isWeb = ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password;
    if (isBackgroundPopup(host)) return { action: 'deny' };
    if (isLinkedInTrackerUrl(parsed.toString())) {
      sendBrowserEvent('LinkedIn recorded the Apply click but did not provide the employer application form URL. Reopen the job details and retry Apply.');
      return { action: 'deny' };
    }
    const isIdentityPopup = IDENTITY_POPUP_HOSTS.some(h => host === h || host.endsWith('.' + h));
    if (isSecure && isIdentityPopup) {
      if (isWebview && !gesture) return { action: 'deny' };
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 600,
          height: 720,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            partition: AUTH_PARTITION,
          },
        },
      };
    }
    if (isWeb && isWebview) {
      sendOpenTab(parsed.toString(), sourceContents);
      return { action: 'deny' };
    }
  } catch {}
  return { action: 'deny' };
};

function compareVersions(left, right) {
  const parts = (value) => String(value).replace(/^v/i, '').split('.').map((part) => Number.parseInt(part, 10) || 0);
  const leftParts = parts(left);
  const rightParts = parts(right);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const request = https.get(RELEASE_API_URL, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `ZeroApply/${app.getVersion()}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`GitHub release check returned HTTP ${response.statusCode}.`));
        return;
      }
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
        if (body.length > 1_000_000) request.destroy(new Error('Release response exceeded the size limit.'));
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.setTimeout(10_000, () => request.destroy(new Error('Release check timed out.')));
    request.on('error', reject);
  });
}

async function checkForUpdates() {
  if (isSmokeTest || !app.isPackaged || !mainWindow || mainWindow.isDestroyed()) return;
  try {
    const release = await fetchLatestRelease();
    if (release?.draft || release?.prerelease || compareVersions(release?.tag_name, app.getVersion()) <= 0) return;
    const releaseUrl = String(release?.html_url || '');
    if (!releaseUrl.startsWith(RELEASES_URL_PREFIX)) throw new Error('The release URL was not trusted.');
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'ZeroApply update available',
      message: `ZeroApply ${String(release.tag_name).replace(/^v/i, '')} is available.`,
      detail: 'Open the signed GitHub release to install the latest production build.',
      buttons: ['Open update', 'Later'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });
    if (result.response === 0) await shell.openExternal(releaseUrl);
  } catch (error) {
    console.warn('Automatic update check failed:', error);
  }
}

function createWindow(rendererUrl) {
  const customSession = getAuthSession();

  mainWindow = new BrowserWindow({
    show: !isSmokeTest,
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'ZeroApply | High-Output Persona Management',
    icon: path.join(__dirname, 'public', 'logo.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: true,
      webviewTag: true,
      session: customSession,
      preload: PRELOAD_POPUP_PATH,
    },
  });

  mainWindow.webContents.on('console-message', (event, ...args) => {
    const level = event?.level ?? args[0];
    const message = event?.message ?? args[1] ?? (typeof args[0] === 'string' ? args[0] : '');
    if (level === 'error' || level === 3) {
      console.error('Renderer error:', String(message || 'Unknown renderer error').slice(0, 4_000));
    }
  });

  if (isSmokeTest) {
    const smokeTimeout = setTimeout(() => app.exit(1), 15000);
    mainWindow.webContents.once('did-finish-load', () => {
      clearTimeout(smokeTimeout);
      setTimeout(() => app.exit(0), 500);
    });
  }

  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  rendererUrlInUse = devServerUrl || rendererUrl || 'http://localhost:5173';
  let rendererLoadAttempts = 0;
  const loadRenderer = () => {
    if (!mainWindow || mainWindow.isDestroyed() || !rendererUrlInUse) return;
    mainWindow.loadURL(rendererUrlInUse).catch((error) => {
      console.warn('Renderer load attempt failed:', describeError(error));
    });
  };
  loadRenderer();

  mainWindow.webContents.on('did-finish-load', () => {
    rendererLoadAttempts = 0;
  });
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
    let isRendererTarget = false;
    try {
      isRendererTarget = Boolean(rendererUrlInUse && new URL(validatedUrl).origin === new URL(rendererUrlInUse).origin);
    } catch {
      isRendererTarget = false;
    }
    if (!isMainFrame || errorCode === -3 || !isRendererTarget) return;
    rendererLoadAttempts += 1;
    if (rendererLoadAttempts > 3) {
      dialog.showErrorBox('ZeroApply could not load', 'The local interface failed to load after three recovery attempts. Close and reopen ZeroApply.');
      return;
    }
    const delay = [500, 1_500, 3_000][rendererLoadAttempts - 1];
    console.warn(`Renderer failed to load (${errorDescription}); retrying in ${delay}ms.`);
    setTimeout(loadRenderer, delay);
  });
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Main renderer process stopped:', details.reason, details.exitCode);
    if (details.reason === 'clean-exit' || !mainWindow || mainWindow.isDestroyed()) return;
    setTimeout(loadRenderer, 500);
  });
  mainWindow.on('unresponsive', async () => {
    if (unresponsiveDialogOpen || !mainWindow || mainWindow.isDestroyed()) return;
    unresponsiveDialogOpen = true;
    try {
      const result = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'ZeroApply is not responding',
        message: 'The interface is taking longer than expected.',
        detail: 'Wait if a large page or resume is loading. Reload only if the app remains frozen.',
        buttons: ['Wait', 'Reload interface'],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      });
      if (result.response === 1 && mainWindow && !mainWindow.isDestroyed()) loadRenderer();
    } finally {
      unresponsiveDialogOpen = false;
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => handleWindowOpen(details, mainWindow?.webContents));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler((details) => handleWindowOpen(details, contents));

  contents.on('did-create-window', (childWindow, details) => {
    const startsDeferred = contents.getType() === 'webview' && isDeferredPopupUrl(details?.url || '');
    let destinationResolved = !startsDeferred;
    let registeredAsAuthWindow = false;

    const registerAuthWindow = () => {
      if (registeredAsAuthWindow) return;
      registeredAsAuthWindow = true;
      for (const existingWindow of topLevelAuthWindows) {
        if (!existingWindow.isDestroyed()) existingWindow.close();
      }
      topLevelAuthWindows.clear();
      topLevelAuthWindows.add(childWindow);
    };

    if (!startsDeferred && (contents === mainWindow?.webContents || contents.getType() === 'webview')) {
      registerAuthWindow();
    }
    const deferredTimeout = startsDeferred ? setTimeout(() => {
      if (destinationResolved || childWindow.isDestroyed()) return;
      childWindow.close();
      sendBrowserEvent('The website opened a blank tab but did not provide its destination. Retry the link once.');
    }, 20_000) : null;
    childWindow.once('closed', () => {
      if (deferredTimeout) clearTimeout(deferredTimeout);
      topLevelAuthWindows.delete(childWindow);
    });

    const routeChildNavigation = (navEvent, targetUrl) => {
      if (isDeferredPopupUrl(targetUrl)) return;
      if (isExternalProtocol(targetUrl)) {
        navEvent.preventDefault();
        destinationResolved = true;
        if (deferredTimeout) clearTimeout(deferredTimeout);
        if (!childWindow.isDestroyed()) childWindow.close();
        void confirmOpenExternal(targetUrl).catch((error) => console.warn('External application open failed:', error));
        return;
      }
      try {
        const parsed = resolvePopupDestination(targetUrl);
        if (parsed) {
          const host = parsed.hostname.toLowerCase();
          const isIdentityAuth = parsed.protocol === 'https:'
            && IDENTITY_POPUP_HOSTS.some((trustedHost) => host === trustedHost || host.endsWith(`.${trustedHost}`));
          if (isIdentityAuth) {
            destinationResolved = true;
            if (deferredTimeout) clearTimeout(deferredTimeout);
            registerAuthWindow();
            if (!childWindow.isDestroyed()) childWindow.show();
            return;
          }
          if (!isIdentityAuth && isAllowedWebviewUrl(parsed.toString())) {
            navEvent.preventDefault();
            destinationResolved = true;
            if (deferredTimeout) clearTimeout(deferredTimeout);
            if (!childWindow.isDestroyed()) childWindow.close();
            const opened = sendOpenTab(parsed.toString(), contents);
            if (!opened && isLinkedInTrackerUrl(parsed.toString())) {
              sendBrowserEvent('LinkedIn recorded the click, but the employer form URL was not exposed. Open the job details and retry Apply.');
            }
            return;
          }
        }
      } catch {}
      navEvent.preventDefault();
      destinationResolved = true;
      if (deferredTimeout) clearTimeout(deferredTimeout);
      if (!childWindow.isDestroyed()) childWindow.close();
      sendBrowserEvent('Blocked an invalid popup destination.');
    };

    childWindow.webContents.on('will-navigate', routeChildNavigation);
    childWindow.webContents.on('will-redirect', routeChildNavigation);
  });

  contents.on('will-attach-webview', (event, webPreferences, params) => {
    if (!isAllowedWebviewUrl(params.src) || params.partition !== AUTH_PARTITION) {
      event.preventDefault();
      console.warn('Blocked unsafe webview attachment:', params.src);
      return;
    }
    webPreferences.preload = PRELOAD_WEBVIEW_PATH;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
  });

  if (contents.getType() === 'webview') {
    contents.on('before-input-event', (event, input) => {
      const command = browserCommandForInput(input);
      if (!command) return;
      event.preventDefault();
      if (command === 'save-page') {
        void saveWebPage(contents).catch((error) => {
          console.warn('Save page failed:', error);
          sendBrowserEvent('The page could not be saved. Retry after it finishes loading.');
        });
      } else {
        sendBrowserCommand(command);
      }
    });

    contents.on('context-menu', (_contextEvent, params) => showWebviewContextMenu(contents, params));

    contents.on('will-navigate', (event, navigationUrl) => {
      if (isExternalProtocol(navigationUrl)) {
        event.preventDefault();
        const gesture = consumePopupGesture(contents);
        if (gesture) void confirmOpenExternal(navigationUrl).catch((error) => console.warn('External application open failed:', error));
        return;
      }
      if (isLinkedInTrackerUrl(navigationUrl)) {
        event.preventDefault();
        sendBrowserEvent('LinkedIn recorded the Apply click, but this tracker page is not the employer application form.');
        return;
      }
      if (!isAllowedWebviewUrl(navigationUrl)) {
        event.preventDefault();
        console.warn('Blocked unsafe webview navigation:', navigationUrl);
        return;
      }
      try {
        const currentHost = new URL(contents.getURL()).hostname.toLowerCase();
        let destination = resolvePopupDestination(navigationUrl);
        if (!destination && isLinkedInSafetyUrl(navigationUrl)) {
          const gesture = consumePopupGesture(contents);
          destination = resolveGestureDestination(gesture);
          event.preventDefault();
          if (destination) {
            sendOpenTab(destination.toString(), contents);
          } else {
            sendBrowserEvent('LinkedIn did not provide a usable destination for this link. Reopen the job details and retry Apply.');
          }
          return;
        }
        const sourcePortal = JOB_PORTAL_HOSTS.find((host) => hostMatches(currentHost, host));
        if (destination && sourcePortal && !hostMatches(destination.hostname.toLowerCase(), sourcePortal)) {
          if (isBackgroundPopup(destination.hostname.toLowerCase())) {
            event.preventDefault();
            consumePopupGesture(contents);
          } else {
            event.preventDefault();
            consumePopupGesture(contents);
            sendOpenTab(destination.toString(), contents);
          }
        }
      } catch {
        // The protocol policy above remains authoritative for malformed URLs.
      }
    });

    contents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (errorCode === -3) return; // Ignore normal user navigation cancellations / redirects
      if (isMainFrame && errorCode === -21) {
        const previous = webviewRecoveryState.get(contents);
        const attempt = previous?.url === validatedURL ? previous.attempt + 1 : 1;
        webviewRecoveryState.set(contents, { url: validatedURL, attempt });
        if (attempt > 2) {
          sendBrowserEvent('The network changed repeatedly while loading this page. Check your connection, then use Retry page.');
          return;
        }
        console.warn('Webview transient navigation fail-load recovered:', errorDescription, validatedURL);
        setTimeout(() => {
          if (!contents.isDestroyed() && validatedURL) {
            contents.loadURL(validatedURL).catch((error) => console.warn('Webview recovery failed:', error));
          }
        }, 1000);
      }
    });

    contents.on('did-finish-load', () => {
      webviewRecoveryState.delete(contents);
      getAuthSession().cookies.flushStore().catch((error) => console.warn('Cookie flush failed:', error));
    });
  } else if (contents.getType() === 'window') {
    contents.on('will-navigate', (event, navigationUrl) => {
      try {
        const parsed = new URL(navigationUrl);
        const host = parsed.hostname.toLowerCase();
        const isTrustedAuth = parsed.protocol === 'https:'
          && TRUSTED_AUTH_HOSTS.some((trustedHost) => host === trustedHost || host.endsWith(`.${trustedHost}`));
        if (isLocalAppUrl(navigationUrl) || isTrustedAuth) return;
      } catch {}
      event.preventDefault();
      console.warn('Blocked unsafe window navigation:', navigationUrl);
    });
  }
});

app.on('child-process-gone', (_event, details) => {
  console.error('Electron child process stopped:', details.type, details.reason, details.exitCode);
  sendBrowserEvent(`A ${details.type || 'browser'} process restarted after an error. Retry the current page if needed.`);
});

let ollamaDaemonProcess = null;

function isOllamaRunning() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:11434/api/tags', (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Enforce zero local history logging for LLM prompts & completions
process.env.OLLAMA_NOHISTORY = '1';

async function ensureOllamaRunning() {
  try {
    const running = await isOllamaRunning();
    if (running) {
      return;
    }

    const localAppData = process.env.LOCALAPPDATA || '';
    const ollamaAppPath = path.join(localAppData, 'Programs', 'Ollama', 'ollama app.exe');

    if (fs.existsSync(ollamaAppPath)) {
      // Launch standard Ollama tray application silently without any console window
      ollamaDaemonProcess = spawn(ollamaAppPath, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      if (ollamaDaemonProcess && typeof ollamaDaemonProcess.unref === 'function') {
        ollamaDaemonProcess.unref();
      }
      return;
    }

    // Launch headless hidden process with PowerShell Start-Process WindowStyle Hidden
    ollamaDaemonProcess = spawn('powershell.exe', [
      '-WindowStyle', 'Hidden',
      '-NoProfile',
      '-Command',
      'Start-Process -WindowStyle Hidden -FilePath "ollama" -ArgumentList "serve"'
    ], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    if (ollamaDaemonProcess && typeof ollamaDaemonProcess.unref === 'function') {
      ollamaDaemonProcess.unref();
    }
  } catch (err) {
    console.warn('[ZeroApply Desktop] Notice: Could not auto-spawn Ollama daemon:', err);
  }
}

ipcMain.on('zeroapply-webview-popup-gesture', (event, payload) => {
  if (event.sender.getType() === 'webview' && event.sender.session === getAuthSession()) {
    const candidates = normalizeGestureCandidates(payload?.candidates, event.sender.getURL());
    popupGestureTimes.set(event.sender, { timestamp: Date.now(), candidates });
  }
});

ipcMain.on('zeroapply-webview-window-open', (event, payload) => {
  if (event.sender.getType() !== 'webview' || event.sender.session !== getAuthSession()) return;
  const gesture = popupGestureTimes.get(event.sender);
  if (!gesture || Date.now() - gesture.timestamp > 5_000 || typeof payload?.url !== 'string') return;
  const destination = resolvePopupDestination(payload.url) || resolveGestureDestination(gesture);
  if (!destination || !isAllowedWebviewUrl(destination.toString()) || isLinkedInTrackerUrl(destination.toString())) return;
  sendOpenTab(destination.toString(), event.sender);
});

ipcMain.on('zeroapply-linkedin-apply-click', (event, payload) => {
  if (event.sender.getType() !== 'webview' || event.sender.session !== getAuthSession()) return;
  const previousTimer = applyClickTimers.get(event.sender);
  if (previousTimer) clearTimeout(previousTimer);
  const openedBeforeClick = popupDestinationTimes.get(event.sender) || 0;
  const timer = setTimeout(() => {
    applyClickTimers.delete(event.sender);
    if (event.sender.isDestroyed() || (popupDestinationTimes.get(event.sender) || 0) > openedBeforeClick) return;
    const jobId = typeof payload?.jobId === 'string' ? payload.jobId.replace(/\D/g, '').slice(0, 30) : '';
    sendBrowserEvent(`LinkedIn recorded Apply${jobId ? ` for job ${jobId}` : ''}, but did not expose the employer form URL. ZeroApply did not open the tracker page.`);
  }, 4_000);
  applyClickTimers.set(event.sender, timer);
});

ipcMain.handle('chrome-agent-launch', async (event, startUrl) => {
  requireTrustedIpcSender(event);
  try {
    return await launchChromeAgent(startUrl);
  } catch (error) {
    console.error('Chrome agent launch failed:', describeError(error));
    return { ok: false, error: error instanceof Error ? error.message : 'Google Chrome could not be started.' };
  }
});

ipcMain.handle('chrome-agent-navigate', async (event, targetUrl) => {
  requireTrustedIpcSender(event);
  if (!isSafeChromeAgentUrl(targetUrl)) throw new Error('Blocked an unsafe Chrome navigation address.');
  if (!chromeAgentConnection) throw new Error('Chrome agent is not connected.');
  await chromeAgentConnection.call('Page.navigate', { url: targetUrl });
  await chromeAgentConnection.call('Page.bringToFront');
  return true;
});

ipcMain.handle('chrome-agent-evaluate', async (event, script) => {
  requireTrustedIpcSender(event);
  if (typeof script !== 'string' || !script.trim() || Buffer.byteLength(script, 'utf8') > 2 * 1024 * 1024) {
    throw new Error('Chrome automation script is invalid or too large.');
  }
  if (!chromeAgentConnection) throw new Error('Chrome agent is not connected.');
  const evaluation = await chromeAgentConnection.call('Runtime.evaluate', {
    expression: script,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (evaluation.exceptionDetails) {
    const detail = evaluation.exceptionDetails.exception?.description
      || evaluation.exceptionDetails.text
      || 'The website rejected an automation action.';
    throw new Error(String(detail).slice(0, 1000));
  }
  return evaluation.result?.value;
});

ipcMain.handle('chrome-agent-select-active-target', async (event) => {
  requireTrustedIpcSender(event);
  await connectChromeAgentTarget();
  return true;
});

ipcMain.on('secure-storage-get', (event, key) => {
  try {
    requireTrustedIpcSender(event);
    validateSecureStorageKey(key);
    const encrypted = readSecureStore()[key];
    event.returnValue = typeof encrypted === 'string' ? decryptSecureValue(encrypted) : null;
  } catch (error) {
    console.warn('Secure storage read failed:', error);
    event.returnValue = null;
  }
});

ipcMain.handle('secure-storage-set', async (event, key, value) => {
  requireTrustedIpcSender(event);
  validateSecureStorageKey(key);
  if (typeof value !== 'string' || Buffer.byteLength(value, 'utf8') > 5 * 1024 * 1024) {
    throw new Error('Secure-storage value is invalid or too large.');
  }
  const store = readSecureStore();
  store[key] = encryptSecureValue(value);
  writeSecureStore(store);
  return true;
});

ipcMain.handle('secure-storage-remove', async (event, key) => {
  requireTrustedIpcSender(event);
  validateSecureStorageKey(key);
  const store = readSecureStore();
  delete store[key];
  writeSecureStore(store);
  return true;
});

ipcMain.handle('start-ollama-daemon', async (event) => {
  requireTrustedIpcSender(event);
  await ensureOllamaRunning();
  return isOllamaRunning();
});

ipcMain.handle('install-ollama-engine', async (event) => {
  requireTrustedIpcSender(event);
  return new Promise((resolve, reject) => {
    try {
      console.log('[ZeroApply Desktop] Starting 1-Click Ollama Engine automated setup...');
      const bundledInstaller = path.join(process.resourcesPath, 'OllamaSetup.exe');
      const tempInstaller = path.join(app.getPath('temp'), 'OllamaSetup.exe');

      const verifyInstaller = (installerPath) => new Promise((verifyResolve, verifyReject) => {
        const command = `$signature = Get-AuthenticodeSignature -LiteralPath '${installerPath.replaceAll("'", "''")}'; if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Ollama Inc') { exit 1 }`;
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], (error) => {
          if (error) verifyReject(new Error('The Ollama installer signature is invalid. Installation was cancelled.'));
          else verifyResolve();
        });
      });

      const runInstallerFile = async (installerPath) => {
        try {
          await verifyInstaller(installerPath);
          console.log(`[ZeroApply Desktop] Running ${installerPath} silently...`);
          const installer = spawn(installerPath, ['/silent'], {
            detached: true,
            stdio: 'ignore',
          });
          installer.unref();

          let pollCount = 0;
          const interval = setInterval(async () => {
            pollCount++;
            const running = await isOllamaRunning();
            if (running) {
              clearInterval(interval);
              resolve({ success: true });
            } else if (pollCount > 40) {
              clearInterval(interval);
              resolve({ success: false, error: 'Installation started. Please wait a few seconds and check status.' });
            }
          }, 1500);
        } catch (runErr) {
          reject(runErr);
        }
      };

      if (fs.existsSync(bundledInstaller)) {
        console.log('[ZeroApply Desktop] Using bundled local OllamaSetup.exe from resources...');
        runInstallerFile(bundledInstaller);
        return;
      }

      const downloadUrl = 'https://ollama.com/download/OllamaSetup.exe';
      const getFile = (url, redirects = 0) => {
        https.get(url, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            res.resume();
            if (redirects >= 5) {
              reject(new Error('Too many redirects while downloading Ollama.'));
              return;
            }
            const nextUrl = new URL(res.headers.location, url);
            if (nextUrl.protocol !== 'https:') {
              reject(new Error('Ollama download redirected to an insecure address.'));
              return;
            }
            getFile(nextUrl.href, redirects + 1);
            return;
          }
          if (res.statusCode !== 200) {
            res.resume();
            reject(new Error(`Ollama download failed with HTTP ${res.statusCode}.`));
            return;
          }
          const file = fs.createWriteStream(tempInstaller);
          res.pipe(file);
          file.on('error', (error) => {
            fs.unlink(tempInstaller, () => {});
            reject(error);
          });
          file.on('finish', () => {
            file.close(() => runInstallerFile(tempInstaller).catch(reject));
          });
        }).on('error', (err) => {
          fs.unlink(tempInstaller, () => {});
          reject(err);
        });
      };
      getFile(downloadUrl);
    } catch (err) {
      reject(err);
    }
  });
});

app.whenReady().then(async () => {
  if (!isSmokeTest) ensureOllamaRunning().catch((error) => console.warn('Ollama startup check failed:', error));
  configureSession(session.defaultSession);
  getAuthSession();
  try {
    await migrateBrowserCacheIfNeeded();
  } catch (error) {
    console.warn('One-time browser cache migration failed safely:', error);
  }

  let rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (!rendererUrl && process.argv.includes('--dev')) {
    rendererUrl = 'http://localhost:5173';
  }
  if (!rendererUrl) {
    const distPath = path.join(__dirname, 'dist');
    try {
      rendererUrl = await startRendererServer(distPath);
    } catch (error) {
      dialog.showErrorBox('ZeroApply could not start', `The secure local app server could not start. Reopen ZeroApply and try again.\n\n${error.message}`);
      if (isSmokeTest) app.exit(1);
      else app.quit();
      return;
    }
  }

  createWindow(rendererUrl);
  updateCheckTimer = setTimeout(() => {
    void checkForUpdates();
    updateCheckTimer = setInterval(() => void checkForUpdates(), 6 * 60 * 60 * 1000);
    updateCheckTimer.unref?.();
  }, 15_000);
  updateCheckTimer.unref?.();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(rendererUrl);
  });
});

app.on('before-quit', async () => {
  if (updateCheckTimer) clearTimeout(updateCheckTimer);
  if (chromeAgentConnection) {
    void chromeAgentConnection.call('Browser.close').catch(() => {});
    chromeAgentConnection = null;
  }
  for (const authWindow of topLevelAuthWindows) {
    if (!authWindow.isDestroyed()) authWindow.close();
  }
  topLevelAuthWindows.clear();
  rendererServer?.close();
  try {
    await getAuthSession().cookies.flushStore();
  } catch {
    // Ignore flush error on shutdown
  }
});

app.on('will-quit', async () => {
  try {
    await getAuthSession().cookies.flushStore();
  } catch {
    // Ignore flush error on shutdown
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
