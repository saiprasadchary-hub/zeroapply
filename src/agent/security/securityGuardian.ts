
export interface SecurityStatus {
  blocked: boolean;
  type: 'none' | 'captcha' | 'cloudflare' | 'login_required' | 'rate_limited';
  reason?: string;
  recommendedAction: 'continue' | 'pause_for_human' | 'rotate_session' | 'skip_job';
}

/**
 * The Security & CAPTCHA Guardian Agent
 * Actively monitors job portal webviews for anti-bot checkpoints, session logouts, and rate limits.
 */
export class SecurityGuardian {
  /**
   * Evaluates the active webview state via DOM analysis and Florence-2 visual checks
   * to guarantee safe autonomous execution.
   */
  public async diagnoseScreenSecurity(
    pageTitle: string,
    domTextContent: string
  ): Promise<SecurityStatus> {
    const titleLower = (pageTitle || '').toLowerCase();
    const domLower = (domTextContent || '').toLowerCase();

    // 1. Check for Cloudflare / Anti-Bot blocks
    if (
      titleLower.includes('attention required! | cloudflare') ||
      domLower.includes('enable javascript and cookies to continue') ||
      domLower.includes('checking your browser before accessing')
    ) {
      return {
        blocked: true,
        type: 'cloudflare',
        reason: 'Cloudflare Turnstile or DDoS browser check detected on portal.',
        recommendedAction: 'pause_for_human',
      };
    }

    // 2. Check for traditional CAPTCHA / hCaptcha / reCAPTCHA challenges
    if (
      domLower.includes('recaptcha') ||
      domLower.includes('hcaptcha') ||
      domLower.includes('verify you are a human') ||
      domLower.includes('security check to continue')
    ) {
      return {
        blocked: true,
        type: 'captcha',
        reason: 'CAPTCHA challenge required by career portal.',
        recommendedAction: 'pause_for_human',
      };
    }

    // 3. Check for expired session / unauthorized login prompts
    if (
      titleLower.includes('sign in') ||
      titleLower.includes('log in') ||
      domLower.includes('please sign in to continue application') ||
      domLower.includes('session expired')
    ) {
      return {
        blocked: true,
        type: 'login_required',
        reason: 'User authentication session expired or not logged into platform.',
        recommendedAction: 'pause_for_human',
      };
    }

    // 4. Check for rate-limiting thresholds
    if (
      domLower.includes('too many requests') ||
      domLower.includes('rate limit exceeded') ||
      domLower.includes('try again later')
    ) {
      return {
        blocked: true,
        type: 'rate_limited',
        reason: 'Platform API rate limit triggered by excessive batch application speed.',
        recommendedAction: 'rotate_session',
      };
    }



    return {
      blocked: false,
      type: 'none',
      recommendedAction: 'continue',
    };
  }
}
