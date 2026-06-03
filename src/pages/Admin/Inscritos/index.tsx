import React from "react";
import { Link } from "react-router-dom";
import AdminNav from "../AdminNav";

const STORAGE_KEY = "admin_jwt";
const PAGE_SIZE = 50;

type Status = "PENDING" | "PAID" | "CANCELED";
interface Registration {
  name: string;
  phone: string | null;
  email: string | null;
  status: Status;
  sleep_at_monastery: number;
  is_staff: number;
  date_of_birth: string | null;
  allergy_medication_details: string | null;
  dietary_restriction_details: string | null;
  city: string | null;
}
interface Tshirt {
  name: string;
  email: string | null;
  status: Status;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  CANCELED: "Cancelado",
};
const STATUS_STYLE: Record<string, React.CSSProperties> = {
  PENDING: { color: "#a16207", background: "#fefce8", borderColor: "#fde68a" },
  PAID: { color: "#15803d", background: "#f0fdf4", borderColor: "#86efac" },
  CANCELED: { color: "#b91c1c", background: "#fef2f2", borderColor: "#fecaca" },
};

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1200, margin: "0 auto", padding: "1rem", fontFamily: "sans-serif" },
  topbar: { display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem", flexWrap: "wrap" },
  title: { fontSize: "1.4rem", margin: 0 },
  refresh: {
    marginLeft: "auto", padding: "0.55rem 1.1rem", borderRadius: 8, border: "none",
    background: "#1f7a3d", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
  },
  totals: { display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" },
  totalBox: {
    flex: "1 1 150px", borderRadius: 12, padding: "0.8rem 1rem", border: "1px solid #bbf7d0",
    background: "#f0fdf4",
  },
  totalNum: { fontSize: "1.6rem", fontWeight: 800, color: "#15803d", lineHeight: 1.1 },
  totalLabel: { color: "#166534", fontWeight: 600, fontSize: "0.85rem" },
  tabs: { display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" },
  tab: {
    flex: "1 1 140px", padding: "0.7rem 1rem", borderRadius: 10, border: "1px solid #d1d5db",
    background: "#fff", color: "#374151", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem",
  },
  tabActive: { background: "#1f7a3d", color: "#fff", borderColor: "#1f7a3d" },
  filterBar: { display: "flex", flexDirection: "column", gap: 10, marginBottom: "1rem" },
  search: {
    width: "100%", boxSizing: "border-box", padding: "0.75rem 0.9rem", borderRadius: 10,
    border: "1px solid #d1d5db", fontSize: "1rem",
  },
  chipsRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" },
  chip: {
    padding: "0.55rem 0.9rem", borderRadius: 999, border: "1px solid #d1d5db", background: "#fff",
    color: "#374151", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
  },
  chipActive: { background: "#1f7a3d", color: "#fff", borderColor: "#1f7a3d" },
  field: { display: "inline-flex", flexDirection: "column", gap: 3, fontSize: "0.72rem", color: "#6b7280", fontWeight: 700 },
  miniSelect: {
    padding: "0.45rem 0.5rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.9rem", background: "#fff",
  },
  miniInput: { padding: "0.55rem 0.6rem", borderRadius: 8, border: "1px solid #d1d5db", fontSize: "0.9rem", minWidth: 130 },
  count: { color: "#6b7280", fontSize: "0.85rem", margin: "0 0 0.6rem" },
  cityBox: { fontSize: "0.82rem", color: "#374151" },
  citySummary: { cursor: "pointer", fontWeight: 700, color: "#1f7a3d", fontSize: "0.85rem" },
  cityList: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 },
  cityItem: {
    background: "#f3f4f6", borderRadius: 8, padding: "0.25rem 0.6rem", fontSize: "0.8rem",
    color: "#374151", border: "1px solid #e5e7eb",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 12 },
  card: {
    border: "1px solid #e5e7eb", borderRadius: 12, padding: "0.9rem 1rem", background: "#fff",
    display: "flex", flexDirection: "column", gap: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  cardName: { fontSize: "1.05rem", fontWeight: 700, color: "#111827", lineHeight: 1.25 },
  cardRow: { fontSize: "0.88rem", color: "#374151" },
  cardEmail: { fontSize: "0.8rem", color: "#6b7280", wordBreak: "break-all" },
  alertMed: {
    fontSize: "0.86rem", fontWeight: 700, color: "#b91c1c", background: "#fef2f2",
    border: "1px solid #fecaca", borderRadius: 8, padding: "0.45rem 0.6rem",
  },
  alertRestr: {
    fontSize: "0.86rem", fontWeight: 700, color: "#92400e", background: "#fffbeb",
    border: "1px solid #fde68a", borderRadius: 8, padding: "0.45rem 0.6rem",
  },
  empty: { color: "#777", padding: "1.5rem 0" },
  pager: { display: "flex", alignItems: "center", gap: 12, marginTop: "1rem", flexWrap: "wrap", justifyContent: "center" },
  pagerBtn: {
    padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff",
    color: "#374151", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem",
  },
};

const badge = (status: string): React.CSSProperties => ({
  display: "inline-block", padding: "0.15rem 0.6rem", borderRadius: 999, fontWeight: 600,
  fontSize: "0.78rem", border: "1px solid", ...STATUS_STYLE[status],
});
const tag = (color: string, bg: string, border: string): React.CSSProperties => ({
  display: "inline-block", padding: "0.15rem 0.6rem", borderRadius: 999, fontWeight: 600,
  fontSize: "0.78rem", border: `1px solid ${border}`, color, background: bg,
});

const inc = (v: string | null | undefined, q: string) =>
  (v ?? "").toLowerCase().includes(q.trim().toLowerCase());

const hasText = (v: string | null | undefined) => (v ?? "").trim().length > 0;
const matchYesNo = (v: string | null | undefined, f: string) =>
  !f || (f === "1" ? hasText(v) : !hasText(v));

// Ordenação que ignora acento e caixa (ex.: "Élida" entra junto do E).
const byName = (a: { name: string }, b: { name: string }) =>
  (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" });

const LOWER = new Set(["de", "da", "do", "das", "dos", "e", "di", "du", "del", "della", "van", "von", "y"]);
const formatName = (raw: string | null | undefined): string => {
  const v = (raw ?? "").trim();
  if (!v) return "—";
  return v
    .toLowerCase()
    .split(/\s+/)
    .map((w, i) => (i > 0 && LOWER.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
};

const formatDob = (dob: string | null): string => {
  if (!dob) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : dob;
};

const InscritosPage: React.FC = () => {
  const token = React.useMemo(() => localStorage.getItem(STORAGE_KEY), []);
  const [tab, setTab] = React.useState<"inscricoes" | "camisetas">("inscricoes");
  const [regs, setRegs] = React.useState<Registration[]>([]);
  const [tshirts, setTshirts] = React.useState<Tshirt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);
  const [page, setPage] = React.useState(1);

  // filtros inscrições
  const [fNome, setFNome] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fPernoite, setFPernoite] = React.useState("");
  const [fMed, setFMed] = React.useState("");
  const [fRestr, setFRestr] = React.useState("");
  const [fAniversariante, setFAniversariante] = React.useState(false);
  // filtros camisetas
  const [cNome, setCNome] = React.useState("");
  const [cStatus, setCStatus] = React.useState("");

  const load = React.useCallback(() => {
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`/api/admin/registrations?t=${Date.now()}`, { headers: h }),
      fetch(`/api/admin/tshirts?t=${Date.now()}`, { headers: h }),
    ])
      .then(async ([r1, r2]) => {
        if (r1.status === 401 || r1.status === 403) {
          setAuthError(true);
          return;
        }
        const d1 = await r1.json();
        const d2 = await r2.json();
        setRegs(d1.registrations ?? []);
        setTshirts(d2.tshirts ?? []);
      })
      .catch(() => setAuthError(true))
      .finally(() => setLoading(false));
  }, [token]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [tab, fNome, fStatus, fPernoite, fMed, fRestr, fAniversariante, cNome, cStatus]);

  // Aniversariante: aniversário (mês/dia) dentro de ±7 dias da CAMINHADA (02/08).
  const birthdayWithinWeek = (dob: string | null): boolean => {
    const m = dob && /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
    if (!m) return false;
    const week = 7 * 24 * 60 * 60 * 1000;
    const ref = new Date(2026, 7, 2).getTime(); // 02/08 (data da caminhada)
    const bday = new Date(2026, parseInt(m[2], 10) - 1, parseInt(m[3], 10)).getTime();
    return Math.abs(bday - ref) <= week;
  };

  const isPeregrino = (r: Registration) => r.is_staff === 0;
  const paidTotal = regs.filter((r) => r.status === "PAID" && isPeregrino(r)).length;
  const paidPernoite = regs.filter(
    (r) => r.status === "PAID" && isPeregrino(r) && r.sleep_at_monastery === 1
  ).length;
  const pendentes = regs.filter((r) => r.status === "PENDING" && isPeregrino(r)).length;
  const cancelados = regs.filter((r) => r.status === "CANCELED" && isPeregrino(r)).length;
  const staffCount = regs.filter((r) => r.is_staff === 1).length;

  const metrics = [
    { num: paidTotal, label: "Pagos (peregrinos)", c: "#15803d", bg: "#f0fdf4", b: "#bbf7d0" },
    { num: paidPernoite, label: "Pagos — com pernoite", c: "#b45309", bg: "#fffbeb", b: "#fde68a" },
    { num: pendentes, label: "Pendentes", c: "#a16207", bg: "#fefce8", b: "#fde68a" },
    { num: cancelados, label: "Cancelados", c: "#b91c1c", bg: "#fef2f2", b: "#fecaca" },
    { num: staffCount, label: "Staff (cortesia)", c: "#1f2937", bg: "#f3f4f6", b: "#d1d5db" },
  ];

  const anivCount = regs.filter((r) => birthdayWithinWeek(r.date_of_birth)).length;
  const medCount = regs.filter((r) => hasText(r.allergy_medication_details)).length;
  const restrCount = regs.filter((r) => hasText(r.dietary_restriction_details)).length;

  // Quantidade de pessoas por cidade (agrupado sem diferenciar caixa), maior primeiro.
  const cityCounts = React.useMemo(() => {
    const map = new Map<string, { label: string; n: number }>();
    for (const r of regs) {
      const c = (r.city || "").trim();
      if (!c) continue;
      const key = c.toLowerCase();
      const cur = map.get(key) || { label: c, n: 0 };
      cur.n += 1;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  }, [regs]);

  const regsFiltered = regs
    .filter(
      (r) =>
        inc(r.name, fNome) &&
        matchYesNo(r.allergy_medication_details, fMed) &&
        matchYesNo(r.dietary_restriction_details, fRestr) &&
        (!fStatus || r.status === fStatus) &&
        (!fPernoite || String(r.sleep_at_monastery) === fPernoite) &&
        (!fAniversariante || birthdayWithinWeek(r.date_of_birth))
    )
    .sort(byName);
  const tshirtsFiltered = tshirts
    .filter((t) => inc(t.name, cNome) && (!cStatus || t.status === cStatus))
    .sort(byName);

  const activeTotal = tab === "inscricoes" ? regsFiltered.length : tshirtsFiltered.length;
  const totalPages = Math.max(1, Math.ceil(activeTotal / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sliceStart = (safePage - 1) * PAGE_SIZE;
  const regsPage = regsFiltered.slice(sliceStart, sliceStart + PAGE_SIZE);
  const tshirtsPage = tshirtsFiltered.slice(sliceStart, sliceStart + PAGE_SIZE);

  const Pager = () =>
    activeTotal > PAGE_SIZE ? (
      <div style={s.pager}>
        <button type="button" style={{ ...s.pagerBtn, opacity: safePage <= 1 ? 0.5 : 1 }} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}>
          ← Anterior
        </button>
        <span style={{ fontSize: "0.85rem", color: "#374151" }}>
          Página {safePage} de {totalPages} · {activeTotal} no total
        </span>
        <button type="button" style={{ ...s.pagerBtn, opacity: safePage >= totalPages ? 0.5 : 1 }} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}>
          Próxima →
        </button>
      </div>
    ) : null;

  if (authError) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Inscritos</h1>
        <p style={{ color: "#555" }}>
          Você precisa estar logado como admin. <Link to="/admin">Ir para o login</Link>.
        </p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <AdminNav />

      <div style={s.topbar}>
        <h1 style={s.title}>Inscritos</h1>
        <button type="button" style={s.refresh} onClick={load} disabled={loading}>
          {loading ? "Atualizando…" : "Atualizar informações"}
        </button>
      </div>

      <div style={s.totals}>
        {metrics.map((m) => (
          <div key={m.label} style={{ ...s.totalBox, background: m.bg, borderColor: m.b }}>
            <div style={{ ...s.totalNum, color: m.c }}>{m.num}</div>
            <div style={{ ...s.totalLabel, color: m.c }}>{m.label}</div>
          </div>
        ))}
      </div>

      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab === "inscricoes" ? s.tabActive : {}) }} onClick={() => setTab("inscricoes")}>
          Inscrições
        </button>
        <button style={{ ...s.tab, ...(tab === "camisetas" ? s.tabActive : {}) }} onClick={() => setTab("camisetas")}>
          Camisetas
        </button>
      </div>

      {loading ? (
        <p>Carregando…</p>
      ) : tab === "inscricoes" ? (
        <>
          <div style={s.filterBar}>
            <input
              style={s.search}
              placeholder="🔍 Buscar por nome…"
              value={fNome}
              onChange={(e) => setFNome(e.target.value)}
            />
            <div style={s.chipsRow}>
              <button
                type="button"
                style={fAniversariante ? { ...s.chip, ...s.chipActive } : s.chip}
                onClick={() => setFAniversariante((v) => !v)}
              >
                🎂 Aniversariantes ({anivCount})
              </button>
              <label style={s.field}>
                Status
                <select style={s.miniSelect} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="PAID">Pago</option>
                  <option value="PENDING">Pendente</option>
                  <option value="CANCELED">Cancelado</option>
                </select>
              </label>
              <label style={s.field}>
                Pernoite
                <select style={s.miniSelect} value={fPernoite} onChange={(e) => setFPernoite(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="1">Sim</option>
                  <option value="0">Não</option>
                </select>
              </label>
              <label style={s.field}>
                💊 Medicação ({medCount})
                <select style={s.miniSelect} value={fMed} onChange={(e) => setFMed(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="1">Sim</option>
                  <option value="0">Não</option>
                </select>
              </label>
              <label style={s.field}>
                🍽️ Restrição ({restrCount})
                <select style={s.miniSelect} value={fRestr} onChange={(e) => setFRestr(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="1">Sim</option>
                  <option value="0">Não</option>
                </select>
              </label>
            </div>

            {cityCounts.length > 0 && (
              <details style={s.cityBox}>
                <summary style={s.citySummary}>🏙️ Pessoas por cidade ({cityCounts.length})</summary>
                <div style={s.cityList}>
                  {cityCounts.map((c) => (
                    <span key={c.label} style={s.cityItem}>
                      {formatName(c.label)}: <strong>{c.n}</strong>
                    </span>
                  ))}
                </div>
              </details>
            )}
          </div>

          <p style={s.count}>{regsFiltered.length} inscrição(ões)</p>
          <div style={s.grid}>
            {regsPage.map((r, i) => {
              const aniv = birthdayWithinWeek(r.date_of_birth);
              const med = (r.allergy_medication_details || "").trim();
              const restr = (r.dietary_restriction_details || "").trim();
              return (
                <div key={i} style={s.card}>
                  <div style={s.cardName}>{formatName(r.name)}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={badge(r.status)}>{STATUS_LABEL[r.status] ?? r.status}</span>
                    {r.sleep_at_monastery === 1 ? (
                      <span style={tag("#b45309", "#fffbeb", "#fde68a")}>🏠 Pernoite</span>
                    ) : (
                      <span style={tag("#374151", "#f3f4f6", "#e5e7eb")}>🚶 Sem pernoite</span>
                    )}
                    {r.is_staff === 1 && <span style={tag("#1f2937", "#f3f4f6", "#d1d5db")}>Staff</span>}
                    {aniv && <span style={tag("#9d174d", "#fdf2f8", "#fbcfe8")}>🎂 Aniversariante</span>}
                  </div>
                  <div style={s.cardRow}>📞 {r.phone || "—"}</div>
                  <div style={s.cardRow}>
                    📍 {r.city || "—"} &nbsp;·&nbsp; 🎂 {formatDob(r.date_of_birth)}
                  </div>
                  {med && <div style={s.alertMed}>💊 Medicação: {med}</div>}
                  {restr && <div style={s.alertRestr}>🍽️ Restrição: {restr}</div>}
                  <div style={s.cardEmail}>{r.email || "—"}</div>
                </div>
              );
            })}
          </div>
          {regsFiltered.length === 0 && <p style={s.empty}>Nenhuma inscrição encontrada.</p>}
          <Pager />
        </>
      ) : (
        <>
          <div style={s.filterBar}>
            <input
              style={s.search}
              placeholder="🔍 Buscar por nome…"
              value={cNome}
              onChange={(e) => setCNome(e.target.value)}
            />
            <div style={s.chipsRow}>
              <label style={s.field}>
                Status
                <select style={s.miniSelect} value={cStatus} onChange={(e) => setCStatus(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="PAID">Pago</option>
                  <option value="PENDING">Pendente</option>
                  <option value="CANCELED">Cancelado</option>
                </select>
              </label>
            </div>
          </div>

          <p style={s.count}>{tshirtsFiltered.length} compra(s)</p>
          <div style={s.grid}>
            {tshirtsPage.map((t, i) => (
              <div key={i} style={s.card}>
                <div style={s.cardName}>{formatName(t.name)}</div>
                <div>
                  <span style={badge(t.status)}>{STATUS_LABEL[t.status] ?? t.status}</span>
                </div>
                <div style={s.cardEmail}>{t.email || "—"}</div>
              </div>
            ))}
          </div>
          {tshirtsFiltered.length === 0 && <p style={s.empty}>Nenhuma compra encontrada.</p>}
          <Pager />
        </>
      )}
    </div>
  );
};

export default InscritosPage;
