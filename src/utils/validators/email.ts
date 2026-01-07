/**
 * Validação de email
 */

export const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function isEmailValid(email: string): boolean {
  return emailRegex.test(email);
}

export default isEmailValid;
