import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

const PRELOAD_POPUP_PATH = path.join(__dirname, 'preload-popup.cjs');
const AUTH_PARTITION = 'persist:zeroapply_auth';
const configuredSessions = new WeakSet();

app.name = 'ZeroApply';

// Set dedicated login session directory
const loginSessionDir = path.join(app.getPath('appData'), 'ZeroApply_Login_Sessions');
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

function configureSession(targetSession) {
  if (configuredSessions.has(targetSession)) return targetSession;

  const chromeUserAgent = app.userAgentFallback.replace(/\sElectron\/[^\s]+/i, '');
  targetSession.setUserAgent(chromeUserAgent);
  targetSession.cookies.on('changed', () => {
    targetSession.cookies.flushStore().catch(() => {});
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

const TRUSTED_AUTH_HOSTS = [
  'accounts.google.com',
  'appleid.apple.com',
  'login.microsoftonline.com',
  'github.com',
  'linkedin.com',
];

const handleWindowOpen = ({ url }) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    const isAuth = TRUSTED_AUTH_HOSTS.some(h => host === h || host.endsWith('.' + h));
    if (isAuth) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 600,
          height: 720,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        },
      };
    }
  } catch {}
  return { action: 'deny' };
};

function createWindow() {
  const customSession = getAuthSession();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'ZeroApply | High-Output Persona Management',
    icon: path.join(__dirname, 'public/favicon.svg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      webviewTag: true,
      session: customSession,
      preload: PRELOAD_POPUP_PATH,
    },
  });

  const devServerUrl = process.env.ELECTRON_RENDERER_URL;
  const distIndexPath = path.join(__dirname, 'dist/index.html');

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else if (fs.existsSync(distIndexPath)) {
    mainWindow.loadFile(distIndexPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.webContents.setWindowOpenHandler(handleWindowOpen);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(handleWindowOpen);

  contents.on('will-attach-webview', (event, webPreferences) => {
    // The React app creates the only supported webview. Remote pages must not
    // inherit a preload script or gain Node capabilities.
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
  });

  if (contents.getType() === 'webview') {
    contents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (isMainFrame && errorCode === -21) {
        console.warn('Webview transient navigation fail-load recovered:', errorDescription, validatedURL);
        setTimeout(() => {
          if (!contents.isDestroyed() && validatedURL) {
            contents.loadURL(validatedURL).catch(() => {});
          }
        }, 1000);
      }
    });

    contents.on('did-finish-load', () => {
      getAuthSession().cookies.flushStore().catch(() => {});
    });
  }
});

app.whenReady().then(() => {
  configureSession(session.defaultSession);
  getAuthSession();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', async () => {
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
