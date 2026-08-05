import React from "react";
import { theme } from "../../styles/theme";

/**
 * `/upload-fotos?t=<token>` — a página que a organização entrega ao fotógrafo.
 *
 * Sem conta e sem senha: o link É a credencial, com prazo e teto definidos ao
 * ser gerado. Quem abre não é usuário do sistema e não vai ler manual, então a
 * tela tem um botão só e diz em português o que está acontecendo.
 *
 * Envia um arquivo por vez, em fila. É o que sustenta 3 mil fotos numa internet
 * que oscila: o que já subiu está subido, e a lista mostra exatamente qual falhou
 * para reenviar só aquela.
 */

const c = theme.colors;

/** Quantos sobem ao mesmo tempo. Mais que isso satura o envio de internet caseira. */
const CONCURRENCY = 3;

type ItemStatus = "aguardando" | "enviando" | "enviada" | "erro";

interface Item {
  file: File;
  status: ItemStatus;
  error?: string;
}

interface LinkInfo {
  label: string;
  eventYear: number;
  expiresAt: string;
  uploadedCount: number;
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: c.background, padding: "32px 16px 64px" },
  shell: { maxWidth: 720, margin: "0 auto" },
  eyebrow: {
    color: c.goldDark, fontSize: 12, fontWeight: 700, letterSpacing: 1.6,
    textTransform: "uppercase", margin: "0 0 6px",
  },
  title: { color: c.primary, fontSize: "clamp(1.6rem, 1.2rem + 2vw, 2.2rem)", margin: "0 0 10px", fontWeight: 800 },
  lead: { color: c.muted, fontSize: 15, lineHeight: 1.6, margin: "0 0 20px" },
  card: {
    background: c.surface, border: `1px solid ${c.border}`, borderRadius: theme.radius.lg,
    padding: 20, marginBottom: 16,
  },
  info: { color: c.muted, fontSize: 13, lineHeight: 1.7, margin: 0 },
  pickWrap: { display: "flex", flexDirection: "column", gap: 12 },
  pickBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    minHeight: 56, padding: "0 1.4rem", borderRadius: 12, background: c.primary,
    color: "#fff", fontWeight: 800, fontSize: "1.05rem", border: "none", cursor: "pointer",
  },
  sendBtn: {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    minHeight: 56, padding: "0 1.4rem", borderRadius: 12, background: "#15803d",
    color: "#fff", fontWeight: 800, fontSize: "1.05rem", border: "none", cursor: "pointer",
  },
  btnOff: { opacity: 0.5, cursor: "not-allowed" },
  bar: { height: 12, background: "#e5e7eb", borderRadius: 99, overflow: "hidden", margin: "14px 0 6px" },
  barFill: { height: "100%", background: "#15803d", transition: "width .2s ease" },
  counter: { color: c.muted, fontSize: 13, margin: 0 },
  list: { listStyle: "none", padding: 0, margin: "14px 0 0", maxHeight: 320, overflowY: "auto" },
  row: {
    display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center",
    padding: "8px 0", borderBottom: `1px solid ${c.border}`, fontSize: 13,
  },
  name: { color: c.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  errorBox: {
    background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
    borderRadius: 12, padding: 16, fontSize: 14, lineHeight: 1.6,
  },
  doneBox: {
    background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d",
    borderRadius: 12, padding: 16, fontSize: 14, lineHeight: 1.6, fontWeight: 700,
  },
};

const STATUS_LABEL: Record<ItemStatus, string> = {
  aguardando: "na fila",
  enviando: "enviando…",
  enviada: "✅ enviada",
  erro: "❌ falhou",
};

const STATUS_COLOR: Record<ItemStatus, string> = {
  aguardando: c.muted,
  enviando: "#1d4ed8",
  enviada: "#15803d",
  erro: "#b91c1c",
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const UploadFotosPage: React.FC = () => {
  const token = React.useMemo(
    () => new URLSearchParams(window.location.search).get("t") ?? "",
    []
  );

  const [link, setLink] = React.useState<LinkInfo | null>(null);
  const [linkError, setLinkError] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(true);
  const [items, setItems] = React.useState<Item[]>([]);
  const [isSending, setIsSending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let alive = true;
    fetch(`/api/upload-fotos/verify?t=${encodeURIComponent(token)}`)
      .then(async res => {
        const data = await res.json();
        if (!alive) return;
        if (res.ok && data.ok) setLink(data);
        else setLinkError(data.message ?? "Não foi possível validar este link.");
      })
      .catch(() => alive && setLinkError("Não foi possível falar com o servidor. Tente de novo."))
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
  }, [token]);

  const handlePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    // Concatena em vez de substituir: é comum escolher pasta por pasta.
    // Nome+tamanho já repetido não entra duas vezes na fila.
    setItems(current => {
      const seen = new Set(current.map(i => `${i.file.name}:${i.file.size}`));
      const novos = picked
        .filter(f => !seen.has(`${f.name}:${f.size}`))
        .map<Item>(f => ({ file: f, status: "aguardando" }));
      return [...current, ...novos];
    });
    // Zera o input para a MESMA pasta poder ser escolhida de novo depois.
    event.target.value = "";
  };

  const sendOne = React.useCallback(
    async (index: number, item: Item) => {
      const body = new FormData();
      body.append("t", token);
      body.append("file", item.file);

      const mark = (status: ItemStatus, error?: string) =>
        setItems(cur => cur.map((it, i) => (i === index ? { ...it, status, error } : it)));

      mark("enviando");
      try {
        const res = await fetch("/api/upload-fotos", { method: "POST", body });
        if (res.ok) {
          mark("enviada");
          return;
        }
        const data = await res.json().catch(() => ({}));
        mark("erro", data.message ?? `erro ${res.status}`);
      } catch {
        mark("erro", "sem conexão");
      }
    },
    [token]
  );

  /**
   * Fila com N em paralelo. Cada "trabalhador" puxa o próximo índice pendente,
   * então uma foto lenta não trava as outras — e o total de conexões simultâneas
   * fica limitado, que é o que evita derrubar a internet de quem envia.
   */
  const handleSend = React.useCallback(async () => {
    setIsSending(true);
    const pending = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.status === "aguardando" || item.status === "erro");

    let cursor = 0;
    const worker = async () => {
      while (cursor < pending.length) {
        const mine = pending[cursor];
        cursor += 1;
        await sendOne(mine.index, mine.item);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    setIsSending(false);
  }, [items, sendOne]);

  const enviadas = items.filter(i => i.status === "enviada").length;
  const comErro = items.filter(i => i.status === "erro").length;
  const pendentes = items.filter(i => i.status === "aguardando" || i.status === "erro").length;
  const totalBytes = items.reduce((sum, i) => sum + i.file.size, 0);
  const progresso = items.length ? Math.round((enviadas / items.length) * 100) : 0;

  if (checking) {
    return (
      <div style={s.page}>
        <div style={s.shell}>
          <p style={s.lead}>Verificando o link…</p>
        </div>
      </div>
    );
  }

  if (linkError || !link) {
    return (
      <div style={s.page}>
        <div style={s.shell}>
          <p style={s.eyebrow}>Caminho do Perdão</p>
          <h1 style={s.title}>Envio de fotos</h1>
          <div style={s.errorBox}>
            <strong>Não foi possível abrir este link.</strong>
            <br />
            {linkError}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.shell}>
        <p style={s.eyebrow}>Caminho do Perdão</p>
        <h1 style={s.title}>Envio de fotos — {link.eventYear}</h1>
        <p style={s.lead}>
          Olá! Este link é para <strong>{link.label}</strong> enviar as fotos da caminhada.
          Escolha as fotos e toque em enviar. Pode fechar e voltar depois: o que já subiu
          não precisa ser enviado de novo.
        </p>

        <div style={s.card}>
          <p style={s.info}>
            📅 O link vale até <strong>{new Date(link.expiresAt).toLocaleDateString("pt-BR")}</strong>
            <br />
            🖼️ Envie as fotos <strong>em alta resolução, do jeito que saíram da câmera</strong> —
            nada aqui diminui a qualidade delas.
            <br />
            ⚠️ Não mande por WhatsApp nem Telegram: os dois reduzem a foto e a resolução se perde.
            {link.uploadedCount > 0 && (
              <>
                <br />
                ✅ Já recebemos <strong>{link.uploadedCount}</strong> foto(s) por este link.
              </>
            )}
          </p>
        </div>

        <div style={s.card}>
          <div style={s.pickWrap}>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.heic,.heif,.dng,.tif,.tiff"
              multiple
              onChange={handlePick}
              style={{ display: "none" }}
            />
            <button
              type="button"
              style={isSending ? { ...s.pickBtn, ...s.btnOff } : s.pickBtn}
              disabled={isSending}
              onClick={() => inputRef.current?.click()}
            >
              📁 Escolher fotos
            </button>

            {items.length > 0 && (
              <>
                <p style={s.counter}>
                  {items.length} foto(s) escolhida(s) · {formatBytes(totalBytes)}
                </p>

                <button
                  type="button"
                  style={isSending || !pendentes ? { ...s.sendBtn, ...s.btnOff } : s.sendBtn}
                  disabled={isSending || !pendentes}
                  onClick={handleSend}
                >
                  {isSending ? "Enviando…" : `⬆️ Enviar ${pendentes} foto(s)`}
                </button>

                <div style={s.bar}>
                  <div style={{ ...s.barFill, width: `${progresso}%` }} />
                </div>
                <p style={s.counter}>
                  {enviadas} de {items.length} enviadas
                  {comErro > 0 && ` · ${comErro} falharam`}
                </p>

                {!isSending && enviadas === items.length && (
                  <div style={s.doneBox}>
                    🎉 Tudo enviado! Pode fechar esta página. Obrigado!
                  </div>
                )}

                {!isSending && comErro > 0 && (
                  <div style={s.errorBox}>
                    {comErro} foto(s) não subiram — quase sempre é oscilação da internet.
                    Toque em <strong>Enviar</strong> de novo que ele tenta só as que faltaram.
                  </div>
                )}

                <ul style={s.list}>
                  {items.map((item, i) => (
                    <li key={`${item.file.name}:${item.file.size}:${i}`} style={s.row}>
                      <span style={s.name}>{item.file.name}</span>
                      <span style={{ color: STATUS_COLOR[item.status], whiteSpace: "nowrap" }}>
                        {item.error ? `❌ ${item.error}` : STATUS_LABEL[item.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadFotosPage;
