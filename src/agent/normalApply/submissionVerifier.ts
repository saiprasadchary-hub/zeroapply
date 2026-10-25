import type { SubmissionVerificationResult } from './normalApplyTypes';

export class SubmissionVerifier {
  /**
   * Verifies whether an external ATS submission successfully completed and was confirmed.
   */
  public async verifySubmission(view: any): Promise<SubmissionVerificationResult> {
    const script = `
      (() => {
        const url = (window.location.href || '').toLowerCase();
        const text = (document.body ? document.body.innerText : '').toLowerCase();

        // 1. Success URL signatures
        const successUrlKeywords = [
          '/thank-you',
          '/thankyou',
          '/confirmation',
          '/submitted',
          '/success',
          '/applied',
          '/application-received',
          '/complete',
          'formresponse',
          '/formresponse'
        ];
        for (const kw of successUrlKeywords) {
          if (url.includes(kw)) {
            return {
              isConfirmed: true,
              reason: 'URL indicates successful submission (' + kw + ')',
              details: url
            };
          }
        }

        // 2. DOM text confirmation patterns
        const confirmationPatterns = [
          /your application was sent/i,
          /application (has been )?submitted/i,
          /thank you for applying/i,
          /thanks for applying/i,
          /application received/i,
          /received your application/i,
          /we have received your/i,
          /we've received your/i,
          /application was received/i,
          /congratulations/i,
          /submission successful/i,
          /your response has been recorded/i,
          /response has been recorded/i,
          /submit another response/i,
          /form submitted/i
        ];

        for (const pat of confirmationPatterns) {
          if (pat.test(text)) {
            return {
              isConfirmed: true,
              reason: 'Found confirmation message in page content: ' + pat.source,
              details: text.slice(0, 200)
            };
          }
        }

        // 3. Known ATS success elements
        const successSelector = [
          '.success-view',
          '#step-success.active',
          '[data-test-modal-close-btn]',
          '[class*="application-submitted"]',
          '[class*="success-message"]',
          '[data-automation-id="congratulations"]',
          '.application-confirmation',
          '#application-confirmation',
          '.post-apply-container',
          '.freebirdFormviewerViewResponseConfirmationMessage',
          '[jsname="paFMDb"]'
        ].join(', ');

        const successEl = document.querySelector(successSelector);
        if (successEl && successEl.offsetParent !== null) {
          return {
            isConfirmed: true,
            reason: 'Detected ATS success confirmation container element',
            details: successEl.className || successEl.id
          };
        }

        return {
          isConfirmed: false,
          reason: 'No explicit confirmation signatures detected on page'
        };
      })()
    `;

    try {
      const res = await view.executeJavaScript(script);
      if (res && typeof res.isConfirmed === 'boolean') {
        return res;
      }
    } catch {}

    return {
      isConfirmed: false,
      reason: 'Failed to evaluate submission confirmation script',
    };
  }
}
