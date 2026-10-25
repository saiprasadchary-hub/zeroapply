import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const main = fs.readFileSync('main.js', 'utf8');
const workflow = fs.readFileSync('src/agent/easyApply/workflow.ts', 'utf8');
const navigator = fs.readFileSync('src/agent/stateMachine/stepNavigator.ts', 'utf8');
const browser = fs.readFileSync('AgentBrowser/AgentBrowser.tsx', 'utf8');
const browserSession = fs.readFileSync('AgentBrowser/browserSession.ts', 'utf8');
const browserFeatures = fs.readFileSync('AgentBrowser/electron-browser-features.js', 'utf8');
const webviewPreload = fs.readFileSync('AgentBrowser/preload-webview.cjs', 'utf8');
const appPreload = fs.readFileSync('preload-popup.cjs', 'utf8');
const autoApply = fs.readFileSync('src/agent/autoApply/autoApplyEngine.ts', 'utf8');
const releaseWorkflow = fs.readFileSync('.github/workflows/release.yml', 'utf8');
const installer = fs.readFileSync('scripts/zeroapply.iss', 'utf8');

// Execute the actual sender guard with frame identities, including a same-origin iframe.
const senderGuard = main.slice(main.indexOf('function isTrustedIpcSender('), main.indexOf('const SECURE_STORAGE_KEY'));
const trustedFrame = { url: 'http://localhost:5173/index.html' };
const trustedContents = { mainFrame: trustedFrame, getURL: () => trustedFrame.url };
const guardContext = vm.createContext({
  rendererUrlInUse: trustedFrame.url, URL,
  mainWindow: { isDestroyed: () => false, webContents: trustedContents },
  isLocalAppUrl: (url: string) => url === trustedFrame.url,
});
vm.runInContext(senderGuard, guardContext);
const checkSender = (sender: unknown, senderFrame: unknown): boolean => {
  guardContext.event = { sender, senderFrame };
  return vm.runInContext('isTrustedIpcSender(event)', guardContext) as boolean;
};
assert.equal(checkSender(trustedContents, trustedFrame), true);
assert.equal(checkSender(trustedContents, { url: trustedFrame.url }), false);
assert.equal(checkSender(trustedContents, undefined), false);
assert.equal(checkSender({ mainFrame: trustedFrame }, trustedFrame), false);
guardContext.rendererUrlInUse = 'http://localhost:9999';
assert.equal(checkSender(trustedContents, trustedFrame), false, 'Other local servers cannot use privileged IPC');

const webviewGuard = main.slice(main.indexOf("contents.on('will-attach-webview'"), main.indexOf("if (contents.getType() === 'webview')"));
for (const preference of ['webSecurity = true', 'allowRunningInsecureContent = false', 'nodeIntegrationInSubFrames = false', 'nodeIntegrationInWorker = false', 'experimentalFeatures = false']) {
  assert.ok(webviewGuard.includes(preference), `Webview must enforce ${preference}`);
}

assert.match(main, /setPermissionRequestHandler/);
assert.match(main, /Website permission/);
assert.match(main, /Allow for this session/);
assert.match(main, /defaultId: 1/);
assert.match(main, /requireTrustedIpcSender\(event\)/);
assert.match(main, /webPreferences\.preload = PRELOAD_WEBVIEW_PATH/);
assert.match(main, /partition: AUTH_PARTITION/);
for (const portal of ['linkedin.com', 'indeed.com', 'glassdoor.com', 'naukri.com', 'unstop.com']) {
  assert.match(main, new RegExp(`'${portal.replace('.', '\\.')}('|,)`));
}
assert.match(navigator, /action === 'submit' && !allowSubmit/);
assert.match(workflow, /const confirmed = await checkSubmissionConfirmed/);
assert.doesNotMatch(browser, /console-message/);
assert.doesNotMatch(autoApply, /includes\(expectedHost\)/);
assert.match(autoApply, /hostname === expectedHost \|\| hostname\.endsWith/);
assert.match(main, /did-create-window/);
assert.match(main, /isDeferredPopupUrl/);
assert.match(main, /isLinkedInTrackerUrl/);
assert.match(main, /show: false/);
assert.match(main, /childWindow\.webContents\.on\('will-redirect', routeChildNavigation\)/);
assert.match(main, /20_000/);
assert.match(main, /function sendOpenTab/);
assert.match(main, /mainWindow\.webContents\.send\('zeroapply-open-tab'/);
assert.match(main, /resolvePopupDestination/);
assert.match(main, /LinkedIn did not provide a usable destination/);
assert.match(main, /consumePopupGesture/);
assert.match(main, /BACKGROUND_POPUP_HOSTS = \['cs\.ns1p\.net'\]/);
assert.match(webviewPreload, /ipcRenderer\.sendToHost\('zeroapply-telemetry'/);
assert.match(webviewPreload, /zeroapply-webview-popup-gesture/);
assert.match(webviewPreload, /linkCandidatesFromEvent/);
assert.match(webviewPreload, /executeJavaScriptInIsolatedWorld\(0/);
assert.match(webviewPreload, /zeroapply-webview-window-open/);
assert.match(main, /ipcMain\.on\('zeroapply-webview-window-open'/);
assert.match(main, /zeroapply-linkedin-apply-click/);
assert.doesNotMatch(webviewPreload, /preventDefault|stopImmediatePropagation/);
assert.doesNotMatch(webviewPreload, /navigator\.webdriver|window\.chrome|navigator\.permissions\.query/);
assert.doesNotMatch(main, /requestHeaders\['sec-ch-ua/);
assert.match(main, /ns1p\.net/);
assert.match(main, /migrateBrowserCacheIfNeeded/);
assert.match(main, /\.clearCache\(\)/);
assert.doesNotMatch(main, /clearStorageData/);
const popupHandler = main.slice(main.indexOf('const handleWindowOpen'), main.indexOf('function initializeDesktopUpdates'));
assert.match(popupHandler, /sendOpenTab\(parsed\.toString\(\), sourceContents\)/);
assert.doesNotMatch(main, /\.sendToHost\(/);
assert.match(browserSession, /MAX_BROWSER_TABS = 20/);
assert.match(browser, /role="tablist"/);
assert.match(browser, /partition="persist:zeroapply_auth"/);
assert.match(browser, /src=\{initialUrl\.current\}/);
assert.doesNotMatch(browser, /src=\{tab\.url\}/);
assert.doesNotMatch(browser, /view\.loadURL/);
assert.match(browser, /did-fail-load/);
assert.match(browser, /render-process-gone/);
assert.match(browser, /addEventListener\('dom-ready', handleDomReady\)/);
assert.doesNotMatch(browser, /\n\s*onReady\(tab\.id, view\);\n\s*view\.addEventListener\('dom-ready'/);
assert.match(browser, /Retry page/);
assert.match(main, /targetSession\.on\('will-download'/);
assert.match(main, /dialog\.showSaveDialog/);
assert.match(main, /item\.pause\(\)/);
assert.match(appPreload, /zeroapply-browser-event/);
assert.match(appPreload, /zeroapply-browser-command/);
assert.match(main, /before-input-event/);
assert.match(main, /context-menu/);
assert.match(main, /savePage/);
assert.match(browserFeatures, /mailto:/);
assert.match(main, /rendererLoadAttempts > 3/);
assert.match(main, /webviewRecoveryState/);
assert.match(main, /process\.on\('unhandledRejection'/);
assert.match(main, /process\.on\('uncaughtException'/);
assert.match(main, /releaseInfo\.updatesEnabled === true/);
assert.match(main, /provider: 'github', owner: 'saiprasadchary-hub', repo: 'zeroapply', private: false/);
assert.match(releaseWorkflow, /contents: write/);
assert.match(releaseWorkflow, /gh release (create|upload)/);
assert.match(installer, /AppUpdatesURL=https:\/\/github\.com\/saiprasadchary-hub\/zeroapply\/releases\/latest/);

console.log('security policy tests passed');
