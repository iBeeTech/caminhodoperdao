CREATE TABLE IF NOT EXISTS whatsapp_round_robin (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  counter INTEGER NOT NULL DEFAULT 0
);

INSERT INTO whatsapp_round_robin (id, counter)
VALUES (1, 0)
ON CONFLICT(id) DO NOTHING;

