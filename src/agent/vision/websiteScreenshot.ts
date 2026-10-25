import type { WebviewTarget } from '../domScanner/injectedScanner';

/** Keep local vision inputs bounded while preserving readable application labels. */
export async function captureWebsiteScreenshot(view: WebviewTarget): Promise<string | undefined> {
  try {
    let image: string | undefined;
    if (view.captureScreenshot) {
      image = await view.captureScreenshot();
    } else if (view.getWebContentsId && window.zeroApply?.applicationBrowserScreenshot) {
      image = await window.zeroApply.applicationBrowserScreenshot(view.getWebContentsId());
    } else if (view.capturePage && !view.getWebContentsId) {
      let viewport = await view.capturePage();
      if (viewport.resize && viewport.getSize && viewport.getSize().width > 1024) {
        viewport = viewport.resize({ width: 1024 });
      }
      image = viewport.toJPEG
        ? viewport.toJPEG(75).toString('base64')
        : viewport.toDataURL().replace(/^data:image\/(?:png|jpeg);base64,/, '');
    }
    return image && image.length <= 8_000_000 ? image : undefined;
  } catch { return undefined; }
}
