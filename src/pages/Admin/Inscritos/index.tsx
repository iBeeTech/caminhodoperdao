import React from "react";
import { Link } from "react-router-dom";
import AdminNav from "../AdminNav";

const STORAGE_KEY = "admin_jwt";

type Status = "PENDING" | "PAID" | "CANCELED";
interface Registration {
  name: string;
  phone: string | null;
  email: string | null;
  status: Status;
  sleep_at_monastery: number;
  is_staff: number;
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
  page: { maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "sans-serif" },
  topbar: { display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem", flexWrap: "wrap" },
  title: { fontSize: "1.4rem", margin: 0 },
  refresh: {
    marginLeft: "auto", padding: "0.5rem 1.1rem", borderRadius: 8, border: "none",
    background: "#1f7a3d", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
  },
  totals: { display: "flex", gap: 12, marginBottom: "1.25rem", flexWrap: "wrap" },
  totalBox: {
    flex: "1 1 220px", borderRadius: 12, padding: "1rem 1.25rem", border: "1px solid #bbf7d0",
    background: "#f0fdf4",
  },
  totalNum: { fontSize: "1.8rem", fontWeight: 800, color: "#15803d", lineHeight: 1.1 },
  totalLabel: { color: "#166534", fontWeight: 600, fontSize: "0.9rem" },
  body: { display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" },
  sidebar: { display: "flex", flexDirection: "column", gap: 8, minWidth: 150 },
  sideItem: {
    padding: "0.6rem 1rem", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff",
    color: "#374151", fontWeight: 600, cursor: "pointer", textAlign: "left", fontSize: "0.95rem",
  },
  sideActive: { background: "#1f7a3d", color: "#fff", borderColor: "#1f7a3d" },
  tableWrap: { flex: "1 1 600px", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" },
  th: { textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem", whiteSpace: "nowrap" },
  td: { borderBottom: "1px solid #eee", padding: "0.5rem", verticalAlign: "middle" },
  filterInput: {
    width: "100%", boxSizing: "border-box", padding: "0.3rem 0.4rem", borderRadius: 6,
    border: "1px solid #d1d5db", fontSize: "0.82rem",
  },
  count: { color: "#6b7280", fontSize: "0.85rem", margin: "0 0 0.5rem" },
  empty: { color: "#777", padding: "1.5rem 0" },
};

const badge = (status: string): React.CSSProperties => ({
  display: "inline-block", padding: "0.15rem 0.6rem", borderRadius: 999, fontWeight: 600,
  fontSize: "0.8rem", border: "1px solid", ...STATUS_STYLE[status],
});

const inc = (v: string | null | undefined, q: string) =>
  (v ?? "").toLowerCase().includes(q.trim().toLowerCase());

// Padroniza o nome em title case (1ª letra de cada palavra maiúscula), mantendo
// as preposições/conectivos em minúsculo conforme a norma da língua portuguesa.
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

const InscritosPage: React.FC = () => {
  const token = React.useMemo(() => localStorage.getItem(STORAGE_KEY), []);
  const [tab, setTab] = React.useState<"inscricoes" | "camisetas">("inscricoes");
  const [regs, setRegs] = React.useState<Registration[]>([]);
  const [tshirts, setTshirts] = React.useState<Tshirt[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);

  // filtros inscrições
  const [fNome, setFNome] = React.useState("");
  const [fTel, setFTel] = React.useState("");
  const [fEmail, setFEmail] = React.useState("");
  const [fStatus, setFStatus] = React.useState("");
  const [fPernoite, setFPernoite] = React.useState("");
  // filtros camisetas
  const [cNome, setCNome] = React.useState("");
  const [cEmail, setCEmail] = React.useState("");
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

  // Quebra por status considera só peregrinos (is_staff = 0); staff é contado à parte.
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

  const regsFiltered = regs.filter(
    (r) =>
      inc(r.name, fNome) &&
      inc(r.phone, fTel) &&
      inc(r.email, fEmail) &&
      (!fStatus || r.status === fStatus) &&
      (!fPernoite || String(r.sleep_at_monastery) === fPernoite)
  );
  const tshirtsFiltered = tshirts.filter(
    (t) => inc(t.name, cNome) && inc(t.email, cEmail) && (!cStatus || t.status === cStatus)
  );

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
          <div
            key={m.label}
            style={{ ...s.totalBox, flex: "1 1 160px", background: m.bg, borderColor: m.b }}
          >
            <div style={{ ...s.totalNum, color: m.c }}>{m.num}</div>
            <div style={{ ...s.totalLabel, color: m.c }}>{m.label}</div>
          </div>
        ))}
      </div>

      <div style={s.body}>
        <div style={s.sidebar}>
          <button
            style={{ ...s.sideItem, ...(tab === "inscricoes" ? s.sideActive : {}) }}
            onClick={() => setTab("inscricoes")}
          >
            Inscrições
          </button>
          <button
            style={{ ...s.sideItem, ...(tab === "camisetas" ? s.sideActive : {}) }}
            onClick={() => setTab("camisetas")}
          >
            Camisetas
          </button>
        </div>

        <div style={s.tableWrap}>
          {loading ? (
            <p>Carregando…</p>
          ) : tab === "inscricoes" ? (
            <>
              <p style={s.count}>{regsFiltered.length} inscrição(ões)</p>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Nome</th>
                    <th style={s.th}>Telefone</th>
                    <th style={s.th}>E-mail</th>
                    <th style={s.th}>Status</th>
                    <th style={s.th}>Pernoite</th>
                  </tr>
                  <tr>
                    <th style={s.th}>
                      <input style={s.filterInput} placeholder="Filtrar nome" value={fNome} onChange={(e) => setFNome(e.target.value)} />
                    </th>
                    <th style={s.th}>
                      <input style={s.filterInput} placeholder="Filtrar telefone" value={fTel} onChange={(e) => setFTel(e.target.value)} />
                    </th>
                    <th style={s.th}>
                      <input style={s.filterInput} placeholder="Filtrar e-mail" value={fEmail} onChange={(e) => setFEmail(e.target.value)} />
                    </th>
                    <th style={s.th}>
                      <select style={s.filterInput} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                        <option value="">Todos</option>
                        <option value="PAID">Pago</option>
                        <option value="PENDING">Pendente</option>
                        <option value="CANCELED">Cancelado</option>
                      </select>
                    </th>
                    <th style={s.th}>
                      <select style={s.filterInput} value={fPernoite} onChange={(e) => setFPernoite(e.target.value)}>
                        <option value="">Todos</option>
                        <option value="1">Sim</option>
                        <option value="0">Não</option>
                      </select>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {regsFiltered.map((r, i) => (
                    <tr key={i}>
                      <td style={s.td}>{formatName(r.name)}</td>
                      <td style={s.td}>{r.phone || "—"}</td>
                      <td style={s.td}>{r.email || "—"}</td>
                      <td style={s.td}><span style={badge(r.status)}>{STATUS_LABEL[r.status] ?? r.status}</span></td>
                      <td style={s.td}>{r.sleep_at_monastery === 1 ? "Sim" : "Não"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {regsFiltered.length === 0 && <p style={s.empty}>Nenhuma inscrição encontrada.</p>}
            </>
          ) : (
            <>
              <p style={s.count}>{tshirtsFiltered.length} compra(s)</p>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Nome</th>
                    <th style={s.th}>E-mail</th>
                    <th style={s.th}>Status</th>
                  </tr>
                  <tr>
                    <th style={s.th}>
                      <input style={s.filterInput} placeholder="Filtrar nome" value={cNome} onChange={(e) => setCNome(e.target.value)} />
                    </th>
                    <th style={s.th}>
                      <input style={s.filterInput} placeholder="Filtrar e-mail" value={cEmail} onChange={(e) => setCEmail(e.target.value)} />
                    </th>
                    <th style={s.th}>
                      <select style={s.filterInput} value={cStatus} onChange={(e) => setCStatus(e.target.value)}>
                        <option value="">Todos</option>
                        <option value="PAID">Pago</option>
                        <option value="PENDING">Pendente</option>
                        <option value="CANCELED">Cancelado</option>
                      </select>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tshirtsFiltered.map((t, i) => (
                    <tr key={i}>
                      <td style={s.td}>{formatName(t.name)}</td>
                      <td style={s.td}>{t.email || "—"}</td>
                      <td style={s.td}><span style={badge(t.status)}>{STATUS_LABEL[t.status] ?? t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tshirtsFiltered.length === 0 && <p style={s.empty}>Nenhuma compra encontrada.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InscritosPage;
