import http from 'node:http';
import { randomBytes } from 'node:crypto';

/** One short-lived, origin-bound handoff; credentials never enter a URL. */
export class BrowserAuthHandoff {
  pending = null;

  async start(rendererUrl, openBrowser, focusApp) {
    this.cancel();
    const pageUrl = new URL(rendererUrl);
    if (pageUrl.protocol !== 'http:' || pageUrl.hostname !== 'localhost') {
      throw new Error('Browser sign-in requires the local ZeroApply app server.');
    }
    const state = randomBytes(32).toString('hex');
    const origin = pageUrl.origin;
    let finish;
    const result = new Promise((resolve, reject) => { finish = { resolve, reject }; });
    // Attach a handler while Chrome starts so cancellation cannot become unhandled.
    void result.catch(() => {});
    const server = http.createServer((req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      if (req.headers.origin !== origin || req.headers.host !== `localhost:${server.address()?.port}`) {
        res.writeHead(403).end();
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      if (req.url !== '/complete') { res.writeHead(404).end(); return; }
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.writeHead(204).end();
        return;
      }
      if (req.method !== 'POST' || req.headers['content-type'] !== 'application/json') {
        res.writeHead(405).end();
        return;
      }
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 32768) req.destroy();
      });
      req.on('error', () => {});
      req.on('end', () => {
        try {
          const payload = JSON.parse(body);
          if (this.pending?.state !== state || payload.state !== state
            || typeof payload.idToken !== 'string' || payload.idToken.length < 20 || payload.idToken.length > 16000) {
            res.writeHead(400).end();
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"ok":true}');
          this.pending = null;
          clearTimeout(timer);
          server.close();
          finish.resolve(payload.idToken);
          focusApp();
        } catch { res.writeHead(400).end(); }
      });
    });
    const timer = setTimeout(() => this.cancel('Sign-in timed out. Please try again.'), 5 * 60 * 1000);
    this.pending = { server, timer, finish, state };
    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      pageUrl.search = '?desktop-google-login=1';
      pageUrl.hash = new URLSearchParams({ state, callback: `http://localhost:${server.address().port}/complete` }).toString();
      await openBrowser(pageUrl.href);
    } catch (error) { this.cancel(error instanceof Error ? error.message : 'Could not open Chrome.'); }
    return result;
  }

  cancel(message = 'Sign-in was cancelled.') {
    const pending = this.pending;
    if (!pending) return;
    this.pending = null;
    clearTimeout(pending.timer);
    pending.server.close();
    pending.finish.reject(new Error(message));
  }
}
