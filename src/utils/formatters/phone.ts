/**
 * Máscara de telefone brasileiro: `(16) 98222-1415`.
 *
 * Formata enquanto a pessoa digita e aceita apagar normalmente, porque trabalha
 * sempre a partir dos DÍGITOS: o texto formatado é reconstruído do zero a cada
 * tecla, em vez de tentar remendar a string anterior.
 *
 * Corta em 11 dígitos — o máximo que existe no Brasil (DDD + 9 dígitos). Quem
 * colar um número com o código do país precisa ser tratado ANTES daqui: veja
 * `stripCountryCode`.
 */

/** DDD + 9 dígitos. Não existe telefone brasileiro maior que isso. */
export const MAX_PHONE_DIGITS = 11;

export function onlyDigits(input: string): string {
  return input.replace(/\D/g, "");
}

export function formatPhoneBR(input: string): string {
  const digits = onlyDigits(input).slice(0, MAX_PHONE_DIGITS);
  if (!digits) return "";

  if (digits.length <= 2) {
    return `(${digits}${digits.length === 2 ? ")" : ""}`;
  }

  const ddd = digits.slice(0, 2);
  const body = digits.slice(2);

  // Enquanto não há dígitos suficientes para o traço, mostra o que existe.
  if (body.length <= 4) return `(${ddd}) ${body}`;

  // Celular (9 dígitos) parte em 5+4; fixo (8 dígitos) parte em 4+4. O corte é
  // decidido pelo tamanho do corpo, para o traço não pular de lugar no meio da
  // digitação.
  const cut = body.length > 8 ? 5 : 4;
  return `(${ddd}) ${body.slice(0, cut)}-${body.slice(cut)}`;
}

/**
 * Tira o código do país colado por engano.
 *
 * ⚠️ **55 no começo nem sempre é o país:** 55 também é o DDD de Santa Maria (RS).
 * Por isso a regra não olha só o começo — só considera código de país quando o
 * número passa de 11 dígitos, que é o único caso em que o 55 sobra de verdade.
 * Quem é do DDD 55 digita 11 dígitos e nunca cai aqui.
 */
export function stripCountryCode(rawDigits: string): { digits: string; hadCountryCode: boolean } {
  const digits = onlyDigits(rawDigits);
  if (digits.length > MAX_PHONE_DIGITS && digits.startsWith("55")) {
    return { digits: digits.slice(2, 2 + MAX_PHONE_DIGITS), hadCountryCode: true };
  }
  return { digits: digits.slice(0, MAX_PHONE_DIGITS), hadCountryCode: false };
}

/**
 * O que gravar quando a pessoa digita ou APAGA no campo com máscara.
 *
 * ⚠️ Sem isto o backspace trava. Com dois dígitos a máscara mostra `(16)`, e o
 * cursor fica depois do parêntese: apagar remove o `)`, o campo vira `(16`, a
 * máscara reconstrói `(16)` e a tela não muda. A pessoa aperta backspace várias
 * vezes achando que o campo travou.
 *
 * A saída é reconhecer esse caso: se o texto encolheu mas os DÍGITOS continuam
 * os mesmos, o que foi apagado era enfeite da máscara — então quem sai é o
 * último dígito, que é o que a pessoa queria apagar.
 */
export function applyPhoneInput(
  rawInput: string,
  currentDigits: string
): { digits: string; hadCountryCode: boolean } {
  const { digits, hadCountryCode } = stripCountryCode(rawInput);

  const deletedOnlyMaskChar =
    rawInput.length < formatPhoneBR(currentDigits).length && digits === currentDigits;

  return {
    digits: deletedOnlyMaskChar ? currentDigits.slice(0, -1) : digits,
    hadCountryCode,
  };
}

export default formatPhoneBR;
