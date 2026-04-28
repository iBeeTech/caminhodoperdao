const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.toLowerCase());
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidPhone(phone: string): boolean {
  const digits = normalizePhone(phone);
  return digits.length === 10 || digits.length === 11;
}
