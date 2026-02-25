/**
 * Validação de CPF (formato e dígitos verificadores)
 */

export function canonicalizeCpf(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidCpf(cpf: string): boolean {
  const digits = canonicalizeCpf(cpf);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  if (rem !== parseInt(digits[9], 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i], 10) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10) rem = 0;
  if (rem !== parseInt(digits[10], 10)) return false;

  return true;
}
