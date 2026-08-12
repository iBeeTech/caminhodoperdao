-- Acolhimento: quem é de Franca ou Claraval se oferece para receber peregrinos
-- de fora na própria casa.
--
-- Por que só essas duas cidades: a caminhada acontece em Claraval (MG), e
-- Franca (SP) fica a uns 20 minutos de lá. Quem mora nas duas consegue receber
-- alguém sem transformar a hospedagem num segundo deslocamento. Abrir para qualquer
-- cidade encheria a lista de ofertas inúteis — e a organização não tem como
-- conferir uma a uma.
--
-- A ELEGIBILIDADE É CONFERIDA NO SERVIDOR, pela cidade do cadastro
-- (`users.city`), e não pelo que a tela manda. A tela só decide se mostra o
-- cartão; quem decide se grava é a API.
--
-- Por que tabela própria, e não colunas em `registrations`:
--
-- 1. Oferecer acolhimento NÃO exige inscrição. Um morador de Claraval pode
--    receber gente sem caminhar — aliás, é o caso mais comum.
-- 2. A oferta é por EDIÇÃO (`event_year`), igual à inscrição, mas com vida
--    própria: cancelar a inscrição não pode apagar o compromisso de receber
--    alguém, e vice-versa.
--
-- `city` é uma FOTOGRAFIA do que valeu na hora do cadastro ('franca' ou
-- 'claraval', normalizado sem acento). Guardar aqui evita que a lista da
-- organização mude sozinha no dia em que a pessoa se mudar e editar o perfil.
--
-- `address` e `contact_phone` também nascem do perfil, mas ficam separados de
-- propósito: a casa que recebe pode não ser a casa em que a pessoa mora (a da
-- mãe, a chácara), e o telefone de recado pode ser outro.

CREATE TABLE IF NOT EXISTS hosting_offers (
  id TEXT PRIMARY KEY,

  user_id TEXT NOT NULL,
  event_year INTEGER NOT NULL,

  -- 'franca' | 'claraval' — normalizado no servidor (ver _utils/hosting.ts).
  city TEXT NOT NULL,

  -- Quantas pessoas a casa recebe. Teto de sanidade no servidor; aqui só o
  -- mínimo, porque oferta de zero vaga não é oferta.
  spots INTEGER NOT NULL CHECK (spots > 0),

  -- Preferência de quem receber. Não é filtro da organização, é conforto de
  -- quem abre a casa: família com filhas pequenas costuma preferir receber
  -- mulheres, e esconder essa pergunta faria a pessoa simplesmente não se
  -- oferecer.
  gender_preference TEXT NOT NULL DEFAULT 'qualquer'
    CHECK (gender_preference IN ('qualquer', 'feminino', 'masculino')),

  -- O que vai junto da cama. Três perguntas de sim/não porque é isso que a
  -- organização precisa cruzar na hora de encaixar as pessoas.
  offers_meal INTEGER NOT NULL DEFAULT 0,
  offers_shower INTEGER NOT NULL DEFAULT 0,
  offers_transport INTEGER NOT NULL DEFAULT 0,

  address TEXT NOT NULL,
  contact_phone TEXT NOT NULL,

  -- Texto livre: "tenho cachorro", "só depois das 18h", "escada íngreme".
  notes TEXT,

  -- CANCELADO em vez de DELETE: a organização precisa saber que a vaga que ela
  -- tinha anotado deixou de existir. Linha some, combinado sumido em silêncio.
  status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'CANCELADO')),

  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Uma oferta por pessoa por edição. Editar é UPDATE nesta linha; desistir é
-- status = 'CANCELADO'; voltar atrás é status = 'ATIVO' de novo. Sem o índice,
-- um duplo clique viraria duas ofertas e a organização contaria vaga a mais.
CREATE UNIQUE INDEX IF NOT EXISTS idx_hosting_offers_user_year
  ON hosting_offers (user_id, event_year);

-- A pergunta da organização é sempre "quem recebe neste ano?".
CREATE INDEX IF NOT EXISTS idx_hosting_offers_year_status
  ON hosting_offers (event_year, status);
