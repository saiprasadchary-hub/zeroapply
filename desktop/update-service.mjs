export class DesktopUpdateService {
  constructor({ updater, currentVersion, enabled, canRestart = () => true, notify = () => {} }) {
    this.updater = updater;
    this.enabled = enabled;
    this.canRestart = canRestart;
    this.notify = notify;
    this.checking = null;
    this.downloading = null;
    this.installing = false;
    this.state = {
      phase: enabled ? 'idle' : 'disabled', currentVersion, progressPercent: 0,
      message: enabled ? 'Updates are checked automatically.' : 'Preview build. Public releases receive automatic update checks.',
    };
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowPrerelease = false;
    updater.allowDowngrade = false;
    updater.on('checking-for-update', () => this.update({ phase: 'checking', message: 'Checking for updates…', error: undefined }));
    updater.on('update-available', (info) => this.update({ phase: 'available', latestVersion: info.version, message: `ZeroApply ${info.version} is available.`, error: undefined }));
    updater.on('update-not-available', () => this.update({ phase: 'not-available', message: 'You have the latest ZeroApply.', error: undefined }));
    updater.on('download-progress', (progress) => this.update({ phase: 'downloading', progressPercent: Math.max(0, Math.min(100, Math.round(progress.percent))), message: 'Downloading update…' }));
    updater.on('update-downloaded', (info) => this.update({ phase: 'downloaded', latestVersion: info.version, progressPercent: 100, message: 'Update ready. Restart ZeroApply when you are finished.', error: undefined }));
    updater.on('error', () => {
      if (this.state.phase === 'downloaded') return;
      this.update({ phase: 'error', message: 'Updates are unavailable right now. Your installed app still works.', error: 'Try again when you are connected to the internet.' });
    });
  }
  status() { return { ...this.state, canRestart: this.canRestart() }; }
  update(updates) { this.state = { ...this.state, ...updates }; this.notify(this.status()); }
  activityChanged() { this.notify(this.status()); }

  check() {
    if (!this.enabled || this.state.phase === 'downloaded' || this.downloading) return Promise.resolve(this.status());
    if (this.checking) return this.checking;
    const operation = Promise.resolve().then(() => this.updater.checkForUpdates())
      .catch(() => {
        this.update({ phase: 'error', message: 'Updates are unavailable right now. Your installed app still works.', error: 'Try again when you are connected to the internet.' });
      }).then(() => this.status()).finally(() => { if (this.checking === operation) this.checking = null; });
    this.checking = operation;
    return operation;
  }

  download() {
    if (!this.enabled) return Promise.reject(new Error('Install a public ZeroApply release to enable updates.'));
    if (this.downloading) return this.downloading;
    if (this.state.phase === 'downloaded') return Promise.resolve(this.status());
    if (this.state.phase !== 'available') return Promise.reject(new Error('Check for an available update first.'));
    if (!this.canRestart()) return Promise.reject(new Error('Finish or stop AutoApply before downloading an update.'));
    this.update({ phase: 'downloading', progressPercent: 0, error: undefined, message: 'Downloading update…' });
    const operation = Promise.resolve().then(() => this.updater.downloadUpdate())
      .catch(() => {
        this.update({ phase: 'error', message: 'The update could not be downloaded. Your installed app still works.', error: 'Check your connection and available disk space, then try again.' });
      }).then(() => this.status()).finally(() => { if (this.downloading === operation) this.downloading = null; });
    this.downloading = operation;
    return operation;
  }

  install() {
    if (!this.enabled || this.state.phase !== 'downloaded') throw new Error('Download a verified update before restarting.');
    if (!this.canRestart()) throw new Error('Finish or stop AutoApply before restarting ZeroApply.');
    if (this.installing) return;
    this.installing = true;
    try { this.updater.quitAndInstall(false, true); }
    catch (error) { this.installing = false; throw error; }
  }
}
