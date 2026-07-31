import React from "react";
import AuthNotice from "../AuthNotice";

const STORAGE_KEY = "admin_jwt";

// Mensagem fixa com as regras da hospedagem, enviada a cada inscrito que vai
// dormir no mosteiro. Saudação personalizada com o primeiro nome da pessoa.
// `*texto*` vira negrito no WhatsApp.
const buildInfoMessage = (name: string) => {
  const firstName = name.trim().split(/\s+/)[0] || name;
  return (
    `Olá ${firstName}.\n\n` +
    "📌 *Regras da hospedagem — Mosteiro de Claraval*\n\n" +
    "Horário de chegada a partir das 17:00 horas sem exceção.\n\n" +
    "✔️ Levar roupas de cama.\n" +
    "✔️ Disponibilidade dos quartos (não será possível reserva prévia nem " +
    "acomodar parentes e amigos no mesmo quarto). A acomodação será de acordo " +
    "com a disponibilidade. Ficarão separados homens e mulheres.\n" +
    "✔️ O Mosteiro é o local de moradia dos MONGES, e também um local de oração, " +
    "por isso é importante manter a ordem e o silêncio (somos convidados, por " +
    "isso respeitar as regras da casa é imprescindível).\n" +
    "✔️ À noite será servido um caldo, pela manhã um café comunitário; todos são " +
    "convidados a levar um item para o café. O café preto será oferecido pelo mosteiro.\n" +
    "✔️ Café da manhã às 3:30h e saída para a caminhada às 4h.\n\n" +
    "🔊 Qualquer dúvida estamos à disposição."
  );
};

interface Registration {
  id: string;
  name: string;
  phone: string;
  monastery_info_sent_at: string | null;
  monastery_info_failed_at: string | null;
}

type InfoStatus = "waiting" | "sent" | "failed";
type InfoFilter = "all" | InfoStatus;

const statusOf = (r: Registration): InfoStatus => {
  if (r.monastery_info_sent_at) return "sent";
  if (r.monastery_info_failed_at) return "failed";
  return "waiting";
};

const FILTERS: Array<{ key: InfoFilter; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "waiting", label: "Aguardando" },
  { key: "sent", label: "Informado" },
  { key: "failed", label: "Não consegui informar" },
];

const formatPhone = (digits: string) => {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
};

// Abre o WhatsApp já com a mensagem de regras pronta para enviar.
const buildWhatsappUrl = (r: Registration) =>
  `https://wa.me/55${r.phone}?text=${encodeURIComponent(buildInfoMessage(r.name))}`;

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.5rem", marginBottom: "0.25rem" },
  subtitle: { color: "#555", marginBottom: "1.5rem", fontSize: "0.95rem", lineHeight: 1.5 },
  counters: { display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" },
  counter: {
    padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid", fontWeight: 600, fontSize: "0.9rem",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" },
  th: { textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem", whiteSpace: "nowrap" },
  td: { borderBottom: "1px solid #eee", padding: "0.5rem", verticalAlign: "middle" },
  waBtn: {
    display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.8rem",
    borderRadius: 8, border: "none", background: "#25d366", color: "#fff", fontWeight: 600,
    fontSize: "0.85rem", cursor: "pointer", textDecoration: "none",
  },
  toggleBtn: {
    padding: "0.4rem 0.8rem", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff",
    color: "#374151", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", marginLeft: "0.5rem",
  },
  failBtn: {
    padding: "0.4rem 0.8rem", borderRadius: 8, border: "1px solid #fecaca", background: "#fff",
    color: "#b91c1c", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", marginLeft: "0.5rem",
  },
  filterBar: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" },
  filterBtn: {
    padding: "0.4rem 0.9rem", borderRadius: 999, border: "1px solid #d1d5db", background: "#fff",
    color: "#374151", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
  },
  filterBtnActive: { background: "#1d2c5e", borderColor: "#1d2c5e", color: "#fff" },
  rangeInput: {
    width: 72, padding: "0.35rem 0.5rem", borderRadius: 8, border: "1px solid #d1d5db",
    fontSize: "0.85rem", fontWeight: 600, color: "#374151",
  },
  badge: { padding: "0.2rem 0.6rem", borderRadius: 999, fontWeight: 700, fontSize: "0.78rem", border: "1px solid", whiteSpace: "nowrap" },
  empty: { color: "#777", padding: "2rem 0" },
  error: { color: "#b91c1c", fontWeight: 600 },
};

const InfoMosteiroPage: React.FC = () => {
  const [token] = React.useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [entries, setEntries] = React.useState<Registration[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<InfoFilter>("all");
  const [rangeMin, setRangeMin] = React.useState("");
  const [rangeMax, setRangeMax] = React.useState("");

  const load = React.useCallback(async () => {
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/monastery-info", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setAuthError(true);
        return;
      }
      const data = (await res.json()) as { registrations?: Registration[] };
      setEntries(data.registrations ?? []);
    } catch {
      setAuthError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  const setSent = async (entry: Registration, sent: boolean) => {
    if (!token) return;
    setSavingId(entry.id);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/monastery-info", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates: [{ id: entry.id, sent }] }),
        // keepalive garante que o POST chegue ao servidor mesmo se a página
        // for descarregada logo em seguida (ex.: abrir o WhatsApp no celular).
        keepalive: true,
      });
      if (!res.ok) throw new Error("save_failed");
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? {
                ...e,
                monastery_info_sent_at: sent ? new Date().toISOString() : null,
                // Informar com sucesso limpa o "não consegui" (espelha o backend).
                monastery_info_failed_at: sent ? null : e.monastery_info_failed_at,
              }
            : e
        )
      );
    } catch {
      setActionError("Erro ao salvar. Tente novamente.");
    } finally {
      setSavingId(null);
    }
  };

  // Marca/desmarca "não consegui informar".
  const setInfoFailed = async (entry: Registration, failed: boolean) => {
    if (!token) return;
    setSavingId(entry.id);
    setActionError(null);
    try {
      const res = await fetch("/api/admin/monastery-info", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates: [{ id: entry.id, infoFailed: failed }] }),
        keepalive: true,
      });
      if (!res.ok) throw new Error("save_failed");
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? {
                ...e,
                monastery_info_failed_at: failed ? new Date().toISOString() : null,
                // "Não consegui" e "informado" são mutuamente exclusivos (espelha o backend).
                monastery_info_sent_at: failed ? null : e.monastery_info_sent_at,
              }
            : e
        )
      );
    } catch {
      setActionError("Erro ao salvar. Tente novamente.");
    } finally {
      setSavingId(null);
    }
  };

  // Marca como informado e ABRE o WhatsApp em seguida. A ordem importa: no
  // celular, abrir o wa.me troca de app / navega a aba, o que cancelaria um
  // POST em voo. Disparamos o salvamento (com keepalive) antes de abrir.
  const handleSend = (entry: Registration) => {
    if (!entry.monastery_info_sent_at) {
      setSent(entry, true);
    }
    window.open(buildWhatsappUrl(entry), "_blank", "noopener,noreferrer");
  };

  if (authError) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Informar Mosteiro</h1>
        <AuthNotice />
      </div>
    );
  }

  // Posição fixa (#) = índice na lista completa em ordem alfabética. A faixa de
  // número usa essa posição, então ela não pode depender dos filtros ativos.
  const positioned = entries.map((entry, index) => ({ entry, pos: index + 1 }));
  const minPos = parseInt(rangeMin, 10);
  const maxPos = parseInt(rangeMax, 10);
  const lo = Number.isFinite(minPos) ? minPos : 1;
  const hi = Number.isFinite(maxPos) ? maxPos : Infinity;
  const ranged = positioned.filter(({ pos }) => pos >= lo && pos <= hi);

  // Contadores refletem a faixa selecionada.
  const sent = ranged.filter(({ entry }) => statusOf(entry) === "sent").length;
  const failed = ranged.filter(({ entry }) => statusOf(entry) === "failed").length;
  const waiting = ranged.length - sent - failed;
  const counts: Record<InfoFilter, number> = {
    all: ranged.length,
    waiting,
    sent,
    failed,
  };

  const visible = ranged.filter(({ entry }) => filter === "all" || statusOf(entry) === filter);

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Informar Mosteiro</h1>
      <p style={styles.subtitle}>
        Inscritos pagos que vão dormir no mosteiro, em ordem alfabética. Clique em "Informar no
        WhatsApp": a mensagem com as regras da hospedagem abre pronta e a pessoa é marcada como
        informada. Use "Não consegui informar" para quem o número não funcionou.
      </p>

      <div style={styles.counters}>
        <span style={{ ...styles.counter, color: "#1d2c5e", borderColor: "#c7d2fe", background: "#eef2ff" }}>
          Total: {ranged.length}
        </span>
        <span style={{ ...styles.counter, color: "#a16207", borderColor: "#fde68a", background: "#fefce8" }}>
          Aguardando: {waiting}
        </span>
        <span style={{ ...styles.counter, color: "#15803d", borderColor: "#86efac", background: "#f0fdf4" }}>
          Informados: {sent}
        </span>
        <span style={{ ...styles.counter, color: "#b91c1c", borderColor: "#fecaca", background: "#fef2f2" }}>
          Não consegui informar: {failed}
        </span>
      </div>

      <div style={styles.filterBar}>
        <span style={{ fontWeight: 600, color: "#374151", fontSize: "0.85rem" }}>Número (#):</span>
        <input
          type="number"
          min={1}
          value={rangeMin}
          onChange={(e) => setRangeMin(e.target.value)}
          placeholder="de"
          style={styles.rangeInput}
        />
        <span style={{ color: "#6b7280", fontSize: "0.85rem" }}>até</span>
        <input
          type="number"
          min={1}
          value={rangeMax}
          onChange={(e) => setRangeMax(e.target.value)}
          placeholder="até"
          style={styles.rangeInput}
        />
        {(rangeMin || rangeMax) && (
          <button
            type="button"
            style={styles.filterBtn}
            onClick={() => {
              setRangeMin("");
              setRangeMax("");
            }}
          >
            Limpar
          </button>
        )}
      </div>

      <div style={styles.filterBar}>
        <span style={{ fontWeight: 600, color: "#374151", fontSize: "0.85rem" }}>Filtrar:</span>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            style={filter === f.key ? { ...styles.filterBtn, ...styles.filterBtnActive } : styles.filterBtn}
            onClick={() => setFilter(f.key)}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {actionError && <p style={styles.error}>{actionError}</p>}

      {loading ? (
        <p>Carregando…</p>
      ) : entries.length === 0 ? (
        <p style={styles.empty}>Nenhum inscrito pago com pernoite e telefone.</p>
      ) : visible.length === 0 ? (
        <p style={styles.empty}>Ninguém nesse filtro.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Nome</th>
              <th style={styles.th}>WhatsApp</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ entry, pos }) => {
              const status = statusOf(entry);
              return (
                <tr key={entry.id} style={status !== "waiting" ? { background: "#f8fafc" } : undefined}>
                  <td style={styles.td}>{pos}º</td>
                  <td style={styles.td}>{entry.name || "—"}</td>
                  <td style={styles.td}>{formatPhone(entry.phone)}</td>
                  <td style={styles.td}>
                    {status === "sent" && (
                      <span style={{ ...styles.badge, color: "#15803d", borderColor: "#86efac", background: "#f0fdf4" }}>
                        Informado
                      </span>
                    )}
                    {status === "failed" && (
                      <span style={{ ...styles.badge, color: "#b91c1c", borderColor: "#fecaca", background: "#fef2f2" }}>
                        Não consegui informar
                      </span>
                    )}
                    {status === "waiting" && (
                      <span style={{ ...styles.badge, color: "#a16207", borderColor: "#fde68a", background: "#fefce8" }}>
                        Aguardando
                      </span>
                    )}
                  </td>
                  <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      style={styles.waBtn}
                      onClick={() => handleSend(entry)}
                      disabled={savingId === entry.id}
                    >
                      Informar no WhatsApp
                    </button>
                    <button
                      type="button"
                      style={styles.toggleBtn}
                      onClick={() => setSent(entry, !entry.monastery_info_sent_at)}
                      disabled={savingId === entry.id}
                    >
                      {entry.monastery_info_sent_at ? "Desfazer" : "Marcar informado"}
                    </button>
                    <button
                      type="button"
                      style={styles.failBtn}
                      onClick={() => setInfoFailed(entry, status !== "failed")}
                      disabled={savingId === entry.id}
                    >
                      {status === "failed" ? "Desfazer" : "Não consegui informar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default InfoMosteiroPage;
