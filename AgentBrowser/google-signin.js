/**
 * Returns true ONLY when the user is already on a Google-owned page and the
 * destination is Google's direct account sign-in (ServiceLogin / AccountChooser).
 *
 * Third-party OAuth flows (e.g. LinkedIn → "Continue with Google") must NOT be
 * redirected to external Chrome — they need to open as in-app popup windows so
 * the existing Google session cookies on persist:zeroapply_auth are used and the
 * user sees the one-tap account picker without re-entering credentials.
 */
export function shouldOpenGoogleSignInInChrome(destination, source) {
  try {
    const target = new URL(destination);
    const origin = new URL(source);
    const sourceHost = origin.hostname.toLowerCase();

    // Only intercept when we are already inside a Google-owned page.
    // If the source is LinkedIn, Indeed, or any other third-party site the
    // Google OAuth popup must stay in-app.
    if (origin.protocol !== 'https:' || origin.username || origin.password) return false;
    const isSourceGoogle = sourceHost === 'google.com' || sourceHost.endsWith('.google.com')
      || sourceHost === 'googleusercontent.com' || sourceHost.endsWith('.googleusercontent.com');
    if (!isSourceGoogle) return false;

    // Destination must be Google's own account sign-in endpoints.
    if (target.protocol !== 'https:' || target.hostname !== 'accounts.google.com'
      || target.username || target.password || (target.port && target.port !== '443')) return false;
    return /^\/(?:ServiceLogin|AddSession|AccountChooser|InteractiveLogin)(?:\/|$)/i.test(target.pathname);
  } catch { return false; }
}
