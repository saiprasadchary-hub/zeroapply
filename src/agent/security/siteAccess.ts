import type { WebviewTarget } from '../domScanner/injectedScanner';

export const SITE_ACCESS_CHECK_SCRIPT = `(() => {
  const heading = (document.querySelector('h1')?.textContent || '').trim();
  const title = (document.title || '').trim();
  return /^(sorry,? you have been blocked|access denied|you have been blocked)/i.test(heading)
    || /attention required.*cloudflare/i.test(title);
})()`;

export async function assertSiteAccessible(view: WebviewTarget): Promise<void> {
  const blocked = await view.executeJavaScript<boolean>(SITE_ACCESS_CHECK_SCRIPT);
  if (blocked === true) {
    throw new Error('This website denied access. Open this page in real Chrome and resolve access there before starting Auto-Apply.');
  }
}
