import assert from 'node:assert/strict';
import vm from 'node:vm';
import { SITE_ACCESS_CHECK_SCRIPT, assertSiteAccessible } from '../src/agent/security/siteAccess';
const detect = (heading: string, title: string): boolean => vm.runInNewContext(SITE_ACCESS_CHECK_SCRIPT, {
  document: { title, querySelector: () => ({ textContent: heading }) },
});
assert.equal(detect('Sorry, you have been blocked', 'LinkedIn'), true);
assert.equal(detect('', 'Attention Required! | Cloudflare'), true);
assert.equal(detect('Software Engineer', 'LinkedIn'), false);
assert.equal(detect('Security engineer preventing access denied errors', 'Jobs'), false);
await assert.rejects(assertSiteAccessible({ executeJavaScript: async <T>(): Promise<T> => true as T }), /website denied access/);
await assertSiteAccessible({ executeJavaScript: async <T>(): Promise<T> => false as T });
console.log('Site access detection and automation guard passed.');
