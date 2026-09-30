export type LoginValidationErrors = Partial<Record<"email" | "password", string>>;
export type RegistrationValidationErrors = Partial<
  Record<"name" | "email" | "password" | "confirmPassword", string>
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getEmailError(email: string): string | undefined {
  if (!email.trim()) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(email.trim())) return "Enter a valid email address.";
  return undefined;
}

export function validateLogin(email: string, password: string): LoginValidationErrors {
  const errors: LoginValidationErrors = {};
  const emailError = getEmailError(email);

  if (emailError) errors.email = emailError;
  if (!password.trim()) errors.password = "Enter your password.";

  return errors;
}

export function validateRegistration(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): RegistrationValidationErrors {
  const errors: RegistrationValidationErrors = {};
  const emailError = getEmailError(email);

  if (!name.trim()) errors.name = "Enter your full name.";
  if (emailError) errors.email = emailError;
  if (!password.trim()) {
    errors.password = "Enter a password.";
  } else if (password.length < 8) {
    errors.password = "Use at least 8 characters.";
  }
  if (!confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}
