export const PASSWORD_REQUIREMENTS = 'Use at least 8 characters with uppercase, lowercase, and a number.';
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;

export function requiresEmailVerification(user: {
  emailVerified: boolean;
  providerData: readonly { providerId: string }[];
}): boolean {
  return !user.emailVerified && user.providerData.some(({ providerId }) => providerId === 'password');
}

export function getFriendlyAuthErrorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return PASSWORD_REQUIREMENTS;
    case 'auth/email-not-verified':
      return 'Verify your email before signing in. We sent a new verification link to your inbox.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in request was cancelled.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/popup-blocked':
      return 'Google sign-in was blocked. Allow the login window and try again.';
    case 'auth/unauthorized-domain':
      return 'This ZeroApply installation is not authorized for Google sign-in.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'Sign-in is temporarily unavailable. Please contact ZeroApply support.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please try again in a few minutes.';
    default:
      return 'Authentication failed. Please try again.';
  }
}
