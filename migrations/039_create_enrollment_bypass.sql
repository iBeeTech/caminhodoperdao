-- Lista de exceção do fechamento das inscrições.
--
-- A flag `enrollment` (migration 002) já dizia se a jornada de inscrição está
-- de pé. A partir daqui ela passa a valer também para a PORTA: com a flag
-- desligada, ninguém cria conta nem entra — a inscrição inteira acontece na
-- área logada, então deixar o login aberto seria fechar a inscrição só na
-- fachada.
--
-- ⚠️ Fechar a porta tranca gente de dentro. Quem já se inscreveu perde o
-- acesso à própria inscrição enquanto durar o fechamento; a organização
-- precisa saber disso ao virar a chave, e é por isso que a tela do admin diz
-- com todas as letras o que o botão faz.
--
-- Esta tabela é a fresta: os e-mails aqui entram mesmo com a flag desligada.
-- Serve para a própria organização testar o fluxo, para o admin que precisa
-- conferir uma inscrição, e para o caso combinado por fora ("libera para o
-- fulano, que ficou de fora por um dia").
--
-- Por que uma tabela e não uma env com e-mails separados por vírgula: mexer em
-- env exige deploy, e a lista existe justamente para o dia em que alguém
-- precisa entrar AGORA.

CREATE TABLE IF NOT EXISTS enrollment_bypass (
  -- Sempre minúsculo. É a mesma normalização do login (`users.email`), senão
  -- "Joao@x.com" na lista não liberaria "joao@x.com" na porta.
  email TEXT PRIMARY KEY,

  -- Por que esta pessoa está na lista. Sem isso, daqui a três meses ninguém
  -- lembra por que aquele e-mail está liberado — e ninguém ousa tirar.
  note TEXT,

  created_at INTEGER NOT NULL,
  -- E-mail do admin que liberou. Exceção sem dono é exceção que ninguém revoga.
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_enrollment_bypass_created_at
  ON enrollment_bypass (created_at DESC);
