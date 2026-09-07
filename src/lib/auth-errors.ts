/**
 * Maps Firebase Auth error codes to user-friendly messages.
 * Never expose raw technical error codes to the user.
 */
export function getFriendlyAuthErrorMessage(errorCodeOrMessage: string): string {
  if (!errorCodeOrMessage) return 'An unexpected error occurred. Please try again.';

  const code = errorCodeOrMessage.toLowerCase();

  if (code.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists.';
  }
  if (code.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code.includes('auth/invalid-credential')) {
    return 'Invalid email or password.';
  }
  if (code.includes('auth/user-not-found')) {
    return 'No account found with this email.';
  }
  if (code.includes('auth/wrong-password')) {
    return 'Incorrect password.';
  }
  if (code.includes('auth/weak-password')) {
    return 'Password is too weak. Must be at least 6 characters.';
  }
  if (code.includes('auth/network-request-failed')) {
    return 'Network error. Please check your internet connection.';
  }
  if (code.includes('auth/too-many-requests')) {
    return 'Access temporarily disabled due to many failed login attempts. Please try again in a few moments.';
  }
  if (code.includes('auth/user-disabled')) {
    return 'This user account has been disabled.';
  }
  if (code.includes('auth/operation-not-allowed')) {
    return 'Email/password sign-in is not enabled in Firebase Console for this project.';
  }
  if (code.includes('auth/missing-password')) {
    return 'Please enter a password.';
  }
  if (code.includes('auth/missing-email')) {
    return 'Please enter an email address.';
  }
  if (code.includes('auth/quota-exceeded')) {
    return 'Quota exceeded. Please try again later.';
  }
  if (code.includes('auth/invalid-api-key') || code.includes('auth/api-key-not-valid')) {
    return 'Invalid Firebase API Key in project configuration.';
  }
  if (code.includes('auth/requires-recent-login')) {
    return 'Please re-authenticate and try again.';
  }

  return 'Authentication failed. Please check your credentials and try again.';
}
