export class AccountProfileSaveError extends Error {
  constructor() {
    super("Account created, but the profile could not be saved.");
    this.name = "AccountProfileSaveError";
  }
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

export function getFriendlyAuthError(error: unknown): string {
  if (error instanceof AccountProfileSaveError) {
    return "Your account was created, but we couldn't save your profile. Please log in and try again.";
  }

  switch (getErrorCode(error)) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please log in.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password. Please try again.";
    case "auth/weak-password":
      return "Choose a stronger password with at least 8 characters.";
    case "auth/network-request-failed":
    case "unavailable":
      return "Connection problem. Check your internet and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a little and try again.";
    case "auth/user-disabled":
      return "This account is disabled. Please contact support.";
    case "auth/operation-not-allowed":
      return "Email and password sign-in is unavailable right now.";
    case "permission-denied":
      return "We couldn't access your profile. Please try again later.";
    default:
      return "Something went wrong. Please try again.";
  }
}
