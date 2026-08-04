import React from "react";
import AuthNotice from "../AuthNotice";
import { isSuperAdmin } from "../../../utils/auth/superAdmin";
import { byName, formatDob, formatName, hasText, inc, norm } from "./format";
import { Registration, Tshirt } from "./types";

const STORAGE_KEY = "admin_jwt";
const PAGE_SIZE = 50;

type Tab = "inscricoes" | "camisetas";

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
  totalsGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10, marginBottom: "0.75rem",
  },
  groupTitle: {
    fontSize: "0.75rem", fontWeight: 800, color: "#6b7280", textTransform: "uppercase",
    letterSpacing: "0.05em", margin: "0.75rem 0 0.4rem",
  },
  hero: {
    display: "flex", alignItems: "center", gap: 14, borderRadius: 14, padding: "0.9rem 1.2rem",
    border: "2px solid #fed7aa", background: "#fff7ed", marginBottom: "0.75rem",
  },
  heroNum: { fontSize: "2.4rem", fontWeight: 900, color: "#9a3412", lineHeight: 1 },
  heroLabel: { fontSize: "0.95rem", fontWeight: 800, color: "#9a3412", lineHeight: 1.3 },
  heroHint: { fontSize: "0.8rem", fontWeight: 600, color: "#b45309" },
  totalBox: {
    flex: "1 1 150px", borderRadius: 12, padding: "0.8rem 1rem", border: "1px solid #bbf7d0",
    background: "#f0fdf4",
  },
  totalNum: { fontSize: "1.6rem", fontWeight: 800, color: "#15803d", lineHeight: 1.1 },
  totalLabel: { color: "#166534", fontWeight: 600, fontSize: "0.85rem" },
  tabs: { display: "flex", gap: 8, marginBottom: "1rem", flexWrap: "wrap" },
  // Abas são navegação, não ação: ficam em contorno para os botões sólidos do
  // topo serem os únicos blocos de cor cheia.
  tab: {
    flex: "1 1 140px", padding: "0.7rem 1rem", borderRadius: 10, border: "2px solid #e5e7eb",
    background: "#fff", color: "#6b7280", fontWeight: 700, cursor: "pointer", fontSize: "0.95rem",
  },
  tabActive: {
    background: "#eaf5ee", color: "#166534", borderColor: "#1f7a3d",
    boxShadow: "inset 0 -3px 0 #1f7a3d",
  },
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

const matchYesNo = (v: string | null | undefined, f: string) =>
  !f || (f === "1" ? hasText(v) : !hasText(v));

const InscritosPage: React.FC = () => {
  const token = React.useMemo(() => localStorage.getItem(STORAGE_KEY), []);
  // "Atualizar status PIX (Woovi)" é restrito ao admin geral (gating de UI; a API
  // /api/admin/reconcile-pix também valida no servidor).
  const superAdmin = React.useMemo(() => isSuperAdmin(), []);
  const [isReconciling, setIsReconciling] = React.useState(false);
  const [reconcileMsg, setReconcileMsg] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>("inscricoes");
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
  const [fStaff, setFStaff] = React.useState("");
  const [fAno, setFAno] = React.useState("");
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

  // Consulta a Woovi e atualiza o status (PAID/CANCELED) das inscrições pendentes.
  const handleReconcilePix = React.useCallback(async () => {
    if (!token) return;
    setIsReconciling(true);
    setReconcileMsg(null);
    try {
      const res = await fetch("/api/admin/reconcile-pix", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setReconcileMsg(
          res.status === 401 || res.status === 403
            ? "Sem permissão para esta ação."
            : "Erro ao atualizar o status PIX."
        );
        return;
      }
      const data = (await res.json()) as {
        summary?: { checked: number; paid: number; canceled: number; stillPending: number; errors: number };
      };
      const sm = data.summary;
      setReconcileMsg(
        sm
          ? `Verificadas ${sm.checked} · pagas ${sm.paid} · canceladas ${sm.canceled} · pendentes ${sm.stillPending} · erros ${sm.errors}.`
          : "Status PIX atualizado."
      );
      load();
    } catch {
      setReconcileMsg("Erro ao atualizar o status PIX.");
    } finally {
      setIsReconciling(false);
    }
  }, [token, load]);

  React.useEffect(() => {
    setPage(1);
  }, [tab, fNome, fStatus, fPernoite, fMed, fRestr, fStaff, fAno, fAniversariante, cNome, cStatus]);

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
  // "Pagos — com pernoite" = peregrinos que se INSCREVERAM com pernoite. As pernoites
  // concedidas pelo admin NÃO entram aqui (contam só em 'Pernoite concedida' e no total).
  const paidPernoite = regs.filter(
    (r) =>
      r.status === "PAID" &&
      isPeregrino(r) &&
      r.sleep_at_monastery === 1 &&
      r.pernoite_granted === 0
  ).length;
  const pendentes = regs.filter((r) => r.status === "PENDING" && isPeregrino(r)).length;
  const cancelados = regs.filter((r) => r.status === "CANCELED" && isPeregrino(r)).length;
  const staffCount = regs.filter((r) => r.is_staff === 1).length;
  const pernoiteConcedida = regs.filter((r) => r.status === "PAID" && r.pernoite_granted === 1).length;
  // Staff pago que vai dormir no mosteiro (não entra na conta de peregrinos).
  const staffPernoite = regs.filter(
    (r) => r.status === "PAID" && r.is_staff === 1 && r.sleep_at_monastery === 1
  ).length;
  // Total de pessoas que vão dormir no mosteiro (pagas): com pernoite (inscrição) +
  // pernoite concedida + staff que dorme. = todos PAID com sleep_at_monastery = 1.
  const dormindoNoMosteiro = regs.filter(
    (r) => r.status === "PAID" && r.sleep_at_monastery === 1
  ).length;

  // Grupo "No mosteiro": os três somam o total dormindoNoMosteiro.
  const mosteiroMetrics = [
    { num: paidPernoite, label: "Com pernoite (inscrição)", c: "#b45309", bg: "#fffbeb", b: "#fde68a" },
    { num: pernoiteConcedida, label: "Pernoite concedida", c: "#6d28d9", bg: "#f5f3ff", b: "#ddd6fe" },
    { num: staffPernoite, label: "Staff — com pernoite", c: "#3730a3", bg: "#eef2ff", b: "#c7d2fe" },
  ];

  // Total geral = peregrinos pagos + staff (cortesia). Soma todo mundo confirmado.
  const totalGeral = paidTotal + staffCount;

  // Grupo "Inscrições" (visão geral, independente de mosteiro).
  const geralMetrics = [
    { num: totalGeral, label: "Total geral (com staff)", c: "#1d4ed8", bg: "#eff6ff", b: "#bfdbfe" },
    { num: paidTotal, label: "Pagos (peregrinos)", c: "#15803d", bg: "#f0fdf4", b: "#bbf7d0" },
    { num: pendentes, label: "Pendentes", c: "#a16207", bg: "#fefce8", b: "#fde68a" },
    { num: cancelados, label: "Cancelados", c: "#b91c1c", bg: "#fef2f2", b: "#fecaca" },
    { num: staffCount, label: "Staff (cortesia)", c: "#1f2937", bg: "#f3f4f6", b: "#d1d5db" },
  ];

  const anivCount = regs.filter((r) => birthdayWithinWeek(r.date_of_birth)).length;
  const medCount = regs.filter((r) => hasText(r.allergy_medication_details)).length;
  const restrCount = regs.filter((r) => hasText(r.dietary_restriction_details)).length;

  // Quantidade de pessoas por cidade (agrupado sem diferenciar caixa NEM acento/ç),
  // maior primeiro. Ex.: "França", "franca" e "Franca" caem no mesmo grupo; idem
  // "Cássia"/"cassia". Como rótulo, mantém a 1ª grafia acentuada que aparecer.
  const cityCounts = React.useMemo(() => {
    const map = new Map<string, { label: string; n: number }>();
    for (const r of regs) {
      const c = (r.city || "").trim();
      if (!c) continue;
      const key = norm(c);
      const cur = map.get(key) || { label: c, n: 0 };
      cur.n += 1;
      // Prefere um rótulo acentuado (ex.: "França" no lugar de "franca").
      const hasAccent = (x: string) => x.normalize("NFD").replace(/\p{Diacritic}/gu, "") !== x;
      if (hasAccent(c) && !hasAccent(cur.label)) cur.label = c;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  }, [regs]);

  // Os anos vêm dos próprios dados, não de uma lista fixa: assim a edição nova
  // aparece no filtro sozinha, sem ninguém lembrar de mexer aqui.
  const anosDisponiveis = React.useMemo(() => {
    const anos = new Set<number>();
    for (const r of regs) if (r.event_year) anos.add(r.event_year);
    return [...anos].sort((a, b) => b - a);
  }, [regs]);

  const regsFiltered = regs
    .filter(
      (r) =>
        inc(r.name, fNome) &&
        matchYesNo(r.allergy_medication_details, fMed) &&
        matchYesNo(r.dietary_restriction_details, fRestr) &&
        (!fStaff || (fStaff === "staff" ? r.is_staff === 1 : r.is_staff === 0)) &&
        (!fAno || String(r.event_year ?? "") === fAno) &&
        (!fStatus || r.status === fStatus) &&
        (!fPernoite ||
          (fPernoite === "granted"
            ? r.pernoite_granted === 1
            : String(r.sleep_at_monastery) === fPernoite)) &&
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
        <AuthNotice />
      </div>
    );
  }

  return (
    <div style={s.page}>

      <div style={s.topbar}>
        <h1 style={s.title}>Inscritos</h1>
        {superAdmin && (
          <button
            type="button"
            style={{
              padding: "0.55rem 1.1rem", borderRadius: 8, border: "none", background: "#4338ca",
              color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem",
              marginLeft: "auto", opacity: isReconciling ? 0.7 : 1,
            }}
            onClick={handleReconcilePix}
            disabled={isReconciling}
          >
            {isReconciling ? "Atualizando PIX…" : "Atualizar status PIX (Woovi)"}
          </button>
        )}
        <button
          type="button"
          style={{ ...s.refresh, marginLeft: superAdmin ? 0 : "auto" }}
          onClick={load}
          disabled={loading}
        >
          {loading ? "Atualizando…" : "Atualizar informações"}
        </button>
      </div>
      {reconcileMsg && (
        <p style={{ margin: "0 0 1rem", color: "#4338ca", fontWeight: 600, fontSize: "0.9rem" }}>
          {reconcileMsg}
        </p>
      )}

      <div style={s.hero}>
        <span style={s.heroNum}>{dormindoNoMosteiro}</span>
        <span>
          <div style={s.heroLabel}>🏠 Dormindo no mosteiro (total)</div>
          <div style={s.heroHint}>
            com pernoite {paidPernoite} + concedida {pernoiteConcedida} + staff {staffPernoite}
          </div>
        </span>
      </div>

      <div style={s.groupTitle}>No mosteiro</div>
      <div style={s.totalsGrid}>
        {mosteiroMetrics.map((m) => (
          <div key={m.label} style={{ ...s.totalBox, background: m.bg, borderColor: m.b }}>
            <div style={{ ...s.totalNum, color: m.c }}>{m.num}</div>
            <div style={{ ...s.totalLabel, color: m.c }}>{m.label}</div>
          </div>
        ))}
      </div>

      <div style={s.groupTitle}>Inscrições</div>
      <div style={s.totalsGrid}>
        {geralMetrics.map((m) => (
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
              {anosDisponiveis.length > 0 && (
                <label style={s.field}>
                  Ano
                  <select style={s.miniSelect} value={fAno} onChange={(e) => setFAno(e.target.value)}>
                    <option value="">Todos</option>
                    {anosDisponiveis.map((ano) => (
                      <option key={ano} value={String(ano)}>
                        {ano} ({regs.filter((r) => r.event_year === ano).length})
                      </option>
                    ))}
                  </select>
                </label>
              )}
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
                  <option value="granted">Pernoite Concedida</option>
                </select>
              </label>
              <label style={s.field}>
                Perfil
                <select style={s.miniSelect} value={fStaff} onChange={(e) => setFStaff(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="peregrino">Peregrinos</option>
                  <option value="staff">Staff ({staffCount})</option>
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
                    {r.pernoite_granted === 1 ? (
                      <span style={tag("#6d28d9", "#f5f3ff", "#ddd6fe")}>🌙 Pernoite Concedida</span>
                    ) : r.sleep_at_monastery === 1 ? (
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
