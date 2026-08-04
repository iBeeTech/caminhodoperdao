import React from "react";

/**
 * `/admin/planilhas` — todas as planilhas, num lugar só.
 *
 * Antes as planilhas dividiam a tela com o login e com o "adicionar admin", e o
 * botão de baixar era um item de lista. Aqui cada planilha é um cartão que diz
 * **o que vem dentro** e **quando se usa** — porque o nome sozinho não
 * distinguia "inscritos" de "credenciamento", e baixar a errada às sete da manhã
 * do dia do evento custa caro.
 *
 * Dois grupos, com propósitos diferentes:
 *
 * - **Completas** — a base inteira, para conferência e contabilidade.
 * - **Do dia** — listas de credenciamento, feitas para imprimir e riscar nome.
 *
 * O "adicionar admin" saiu daqui e foi para Sistema → Contas e papéis, junto do
 * resto que é gente e permissão.
 */

const STORAGE_KEY = "admin_jwt";

interface Sheet {
  id: string;
  label: string;
  description: string;
  when: string;
  url: string;
  filename: string;
}

const COMPLETE_SHEETS: Sheet[] = [
  {
    id: "total",
    label: "Planilha total",
    description: "Tudo: peregrinos, staff, camisetas e status de pagamento na mesma base.",
    when: "Conferência geral e contabilidade",
    url: "/api/admin/reports/total",
    filename: "planilha-total.xlsx",
  },
  {
    id: "peregrinos",
    label: "Peregrinos — geral",
    description: "Só peregrinos, sem staff, com dados de contato, saúde e endereço.",
    when: "Organização da caminhada",
    url: "/api/admin/reports/inscritos?staff=0",
    filename: "peregrinos-geral.xlsx",
  },
  {
    id: "mosteiro",
    label: "Peregrinos — mosteiro",
    description: "Quem vai dormir no mosteiro. É a lista que define as camas.",
    when: "Antes de fechar a hospedagem",
    url: "/api/admin/reports/inscritos?staff=0&sleep=1",
    filename: "peregrinos-mosteiro.xlsx",
  },
  {
    id: "staff",
    label: "Staff",
    description: "Quem serve no evento. Balde de vagas separado dos peregrinos.",
    when: "Escala e organização da equipe",
    url: "/api/admin/reports/inscritos?staff=1",
    filename: "staff-geral.xlsx",
  },
  {
    id: "camisetas",
    label: "Camisetas",
    description: "Pedidos por tamanho, com status de pagamento.",
    when: "Fechar o pedido com a confecção",
    url: "/api/admin/reports/tshirt",
    filename: "planilha-camisetas.xlsx",
  },
];

const DAY_SHEETS: Sheet[] = [
  {
    id: "cred-peregrinos",
    label: "Credenciamento — peregrinos",
    description: "Lista em ordem de nome, para riscar na chegada.",
    when: "Portaria, no dia do evento",
    url: "/api/admin/reports/credenciamento?tipo=peregrinos",
    filename: "credenciamento-peregrinos.xlsx",
  },
  {
    id: "cred-staff",
    label: "Credenciamento — staff",
    description: "Mesma lista, só para a equipe.",
    when: "Portaria, no dia do evento",
    url: "/api/admin/reports/credenciamento?tipo=staff",
    filename: "credenciamento-staff.xlsx",
  },
  {
    id: "cred-camisetas",
    label: "Retirada de camisetas",
    description: "Quem pagou camiseta e qual tamanho levar.",
    when: "Balcão de entrega",
    url: "/api/admin/reports/credenciamento?tipo=camisetas",
    filename: "retirada-camisetas.xlsx",
  },
];

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem 3rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.6rem", margin: "0 0 4px", color: "#1d2c5e" },
  lead: { color: "#6b7280", fontSize: "0.95rem", margin: "0 0 1.5rem", lineHeight: 1.6 },
  groupTitle: {
    fontSize: "0.78rem",
    fontWeight: 800,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    margin: "1.75rem 0 0.25rem",
  },
  groupHelp: { color: "#6b7280", fontSize: "0.86rem", margin: "0 0 0.9rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "16px 18px",
    background: "#fff",
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    position: "relative",
    overflow: "hidden",
  },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    background: "linear-gradient(180deg, #1d2c5e, #34488f)",
  },
  accentDay: { background: "linear-gradient(180deg, #f2b824, #c8930f)" },
  label: { color: "#1d2c5e", fontWeight: 800, fontSize: "1rem", margin: 0 },
  description: { color: "#374151", fontSize: "0.86rem", margin: 0, lineHeight: 1.5 },
  when: {
    color: "#6b7280",
    fontSize: "0.76rem",
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    fontWeight: 700,
  },
  button: {
    marginTop: "auto",
    padding: "0.6rem 1rem",
    borderRadius: 10,
    border: "none",
    background: "#1d2c5e",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.9rem",
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  buttonOff: { opacity: 0.55, cursor: "not-allowed" },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: 12,
    color: "#7f1d1d",
    fontSize: "0.9rem",
    marginBottom: "1rem",
  },
};

const AdminPlanilhas: React.FC = () => {
  const [downloadingId, setDownloadingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const download = async (sheet: Sheet) => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) {
      window.location.href = "/admin";
      return;
    }
    setDownloadingId(sheet.id);
    setError(null);
    try {
      const response = await fetch(sheet.url, { headers: { Authorization: `Bearer ${token}` } });
      if (response.status === 401 || response.status === 403) {
        window.location.href = "/admin";
        return;
      }
      if (!response.ok) {
        setError("Não foi possível gerar a planilha. Tente de novo.");
        return;
      }

      // O arquivo vem como binário; o navegador só baixa a partir de um link
      // temporário. Revogar a URL depois evita segurar o arquivo na memória.
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = sheet.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Falha de conexão ao baixar a planilha.");
    } finally {
      setDownloadingId(null);
    }
  };

  const renderGroup = (sheets: Sheet[], isDay: boolean) => (
    <div style={s.grid}>
      {sheets.map(sheet => (
        <div key={sheet.id} style={s.card}>
          <span style={{ ...s.accent, ...(isDay ? s.accentDay : {}) }} aria-hidden="true" />
          <p style={s.when}>{sheet.when}</p>
          <p style={s.label}>{sheet.label}</p>
          <p style={s.description}>{sheet.description}</p>
          <button
            type="button"
            style={{ ...s.button, ...(downloadingId === sheet.id ? s.buttonOff : {}) }}
            onClick={() => download(sheet)}
            disabled={downloadingId === sheet.id}
          >
            {downloadingId === sheet.id ? "Gerando..." : "Baixar planilha"}
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div style={s.page}>
      <h1 style={s.title}>Planilhas</h1>
      <p style={s.lead}>
        Cada planilha diz o que vem dentro e quando se usa. Todas saem em Excel (.xlsx),
        geradas na hora com os dados do banco.
      </p>

      {error && <div style={s.error}>{error}</div>}

      <h2 style={s.groupTitle}>Completas</h2>
      <p style={s.groupHelp}>A base inteira, para conferência e contabilidade.</p>
      {renderGroup(COMPLETE_SHEETS, false)}

      <h2 style={s.groupTitle}>Do dia do evento</h2>
      <p style={s.groupHelp}>Listas para imprimir e riscar nome na chegada.</p>
      {renderGroup(DAY_SHEETS, true)}
    </div>
  );
};

export default AdminPlanilhas;
