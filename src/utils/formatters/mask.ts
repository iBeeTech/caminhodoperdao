/**
 * A regra de digitação que toda máscara precisa.
 *
 * ⚠️ Sem isto o backspace trava. Ao chegar em `(16)`, `396.` ou `14.`, o cursor
 * fica depois de um caractere da máscara: apagar remove esse caractere, a
 * máscara o reconstrói na hora e a tela não muda. A pessoa aperta backspace
 * várias vezes achando que o campo travou — foi exatamente o que aconteceu no
 * telefone.
 *
 * A saída é reconhecer o caso: se o texto encolheu mas os DÍGITOS continuam os
 * mesmos, o que saiu era enfeite — então quem sai é o último dígito, que é o que
 * a pessoa queria apagar.
 */
export function applyMaskedInput(
  rawInput: string,
  currentDigits: string,
  format: (digits: string) => string,
  maxDigits: number
): string {
  const digits = rawInput.replace(/\D/g, "").slice(0, maxDigits);

  const deletedOnlyMaskChar =
    rawInput.length < format(currentDigits).length && digits === currentDigits;

  return deletedOnlyMaskChar ? currentDigits.slice(0, -1) : digits;
}
