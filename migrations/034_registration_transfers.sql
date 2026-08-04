-- Transferência de inscrição entre peregrinos (Planning.md, bloco 8).
--
-- Quem pagou e não pode mais ir passa a vaga adiante, em vez de cancelar. Hoje
-- o único caminho é o cancelamento: a vaga volta para o balde e o dinheiro vira
-- linha em `refund_requests`. A troca resolve os dois lados — o peregrino não
-- fica no prejuízo e a vaga não fica vazia.
--
-- ⚠️ A INSCRIÇÃO NUNCA É CANCELADA NO MEIO. Se a transferência passasse pelo
-- cancelamento, a vaga seria liberada e outra pessoa poderia tomá-la no
-- intervalo, e ainda nasceria um estorno indevido. A linha em `registrations`
-- continua a MESMA, com o mesmo pagamento e a mesma contagem de vaga; o que
-- muda são os campos pessoais e o dono (`user_id`).
--
-- ## Os três passos, e por que são três
--
-- 1. **PENDENTE** — quem cede indica o nome de quem vai receber. Nada mudou
--    ainda na inscrição.
-- 2. **LIBERADA** — quem cede aperta "liberar". É aqui que nasce o código.
--    Existe separado do passo 1 de propósito: o acerto de dinheiro entre as
--    duas pessoas acontece por fora (PIX direto), e quem cede só libera quando
--    o dinheiro cair. Quem quer doar a vaga libera na hora.
-- 3. **ACEITA** — quem recebe usa o código, confirma os próprios dados e a
--    inscrição passa a ser dele.
--
-- ⚠️ Decisão em aberto, registrada de propósito: **se a inscrição transferida
-- for cancelada depois, o dinheiro volta para quem?** Quem pagou foi a origem;
-- o PIX de estorno cadastrado será o do destino. Enquanto não houver resposta,
-- `/admin/estorno` precisa mostrar que a inscrição foi transferida, para o
-- admin não devolver para o lado errado.

CREATE TABLE IF NOT EXISTS registration_transfers (
  id TEXT PRIMARY KEY,

  -- A vaga, que não muda de linha em momento nenhum.
  registration_id TEXT NOT NULL,
  event_year INTEGER NOT NULL,

  -- Quem cede. O nome fica gravado aqui porque `registrations` vai ser
  -- reescrita com os dados da pessoa nova, e o histórico não pode sumir junto.
  from_user_id TEXT NOT NULL,
  from_name TEXT NOT NULL,

  -- Quem recebe. `to_name` é o que a origem digitou (serve de conferência para
  -- ninguém liberar para a pessoa errada); `to_user_id` só existe depois do
  -- aceite.
  to_name TEXT NOT NULL,
  to_user_id TEXT,

  -- Código opaco que a origem passa adiante. Nasce só na liberação — antes
  -- disso não existe nada para vazar.
  transfer_code TEXT,

  -- 1 = doação: a origem libera na hora, sem esperar dinheiro nenhum.
  is_donation INTEGER NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE', 'LIBERADA', 'ACEITA', 'CANCELADA')),

  created_at INTEGER NOT NULL,
  released_at INTEGER,
  accepted_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_code
  ON registration_transfers (transfer_code) WHERE transfer_code IS NOT NULL;

-- Uma transferência viva por inscrição. O índice parcial é o que impede a
-- mesma vaga ser prometida a duas pessoas ao mesmo tempo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_active
  ON registration_transfers (registration_id)
  WHERE status IN ('PENDENTE', 'LIBERADA');

CREATE INDEX IF NOT EXISTS idx_transfers_from_user
  ON registration_transfers (from_user_id);
