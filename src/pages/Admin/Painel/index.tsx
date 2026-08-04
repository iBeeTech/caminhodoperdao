import React from "react";
import { Link } from "react-router-dom";
import { GROUPS } from "../AdminLayout";
import { isPasswordChangePending, isSuperAdmin } from "../../../utils/auth/superAdmin";
import AdminController from "../Controller";

/**
 * `/admin` — o painel com tudo o que o admin pode fazer.
 *
 * Antes, `/admin` era a tela de planilhas: quem entrava caía direto num
 * relatório e precisava caçar o resto no menu de cima. Agora as planilhas têm
 * endereço próprio (`/admin/planilhas`) e a porta de entrada mostra o mapa.
 *
 * As opções saem da MESMA lista do menu (`GROUPS`, em `AdminLayout`). Repetir a
 * lista aqui faria a tela nova esquecer a próxima página criada — e ninguém
 * lembraria de atualizar dois lugares.
 *
 * ⚠️ **`/admin` continua sendo a porta de entrada.** O formulário de login (e a
 * troca obrigatória de senha) vive no `Controller`, que era esta rota. Quem não
 * tem sessão vê o login exatamente onde sempre viu; o painel só aparece depois
 * de entrar. Sem isso, mover a tela teria trancado todo mundo do lado de fora.
 */

/** Uma linha por item, só para dar contexto sem obrigar a clicar para descobrir. */
const HINTS: Record<string, string> = {
  "/admin/planilhas": "Baixe as planilhas de inscritos, vendas e credenciamento",
  "/admin/credenciamento": "Dê baixa na chegada do peregrino no dia do evento",
  "/admin/estorno": "Devoluções pendentes e chaves PIX para pagar",
  "/admin/inscricao-manual": "Inscreva quem não tem e-mail ou não consegue sozinho",
  "/admin/inscritos": "Lista completa, com filtros por ano, status e pernoite",
  "/admin/lista-espera": "Quem ficou de fora e quer ser chamado",
  "/admin/convidar-grupo": "Envie o convite do grupo de WhatsApp",
  "/admin/info-mosteiro": "Mande as instruções para quem vai dormir no mosteiro",
  "/admin/testemunhos": "Ouça e aprove os testemunhos gravados pelo público",
  "/admin/contas": "Quem tem login no site e quem é servo ou admin",
  "/admin/convites": "Gere códigos que furam a lotação",
  "/admin/pedidos-senha": "Pedidos de troca de senha dos outros admins",
  "/admin/pernoiteExtra": "Conceda pernoite a quem se inscreveu sem",
  "/admin/passar-cpf": "Corrija o CPF de uma inscrição",
};

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem 3rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.6rem", margin: "0 0 4px", color: "#1d2c5e" },
  lead: { color: "#6b7280", fontSize: "0.95rem", margin: "0 0 2rem", lineHeight: 1.6 },
  groupTitle: {
    fontSize: "0.78rem",
    fontWeight: 800,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    margin: "1.75rem 0 0.75rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 14,
  },
  card: {
    display: "block",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "16px 18px",
    background: "#fff",
    textDecoration: "none",
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
    position: "relative",
    overflow: "hidden",
  },
  cardLabel: { color: "#1d2c5e", fontWeight: 800, fontSize: "1rem", margin: 0 },
  cardHint: { color: "#6b7280", fontSize: "0.82rem", margin: "6px 0 0", lineHeight: 1.45 },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    background: "linear-gradient(180deg, #f2b824, #c8930f)",
  },
};

const STORAGE_KEY = "admin_jwt";

const AdminPainel: React.FC = () => {
  const superAdmin = React.useMemo(() => isSuperAdmin(), []);
  const hasSession = React.useMemo(
    () => Boolean(localStorage.getItem(STORAGE_KEY)) && !isPasswordChangePending(),
    []
  );

  // Sem sessão (ou com troca de senha pendente): quem manda é o fluxo antigo.
  if (!hasSession) return <AdminController />;

  const groups = GROUPS.filter(
    group => group.items && (!group.superAdminOnly || superAdmin)
  );

  return (
    <div style={s.page}>
      <h1 style={s.title}>Painel do admin</h1>
      <p style={s.lead}>
        Tudo o que dá para fazer por aqui. As mesmas opções estão no menu do topo — esta
        tela existe para você ver todas de uma vez.
      </p>

      {groups.map(group => (
        <section key={group.label}>
          <h2 style={s.groupTitle}>{group.label}</h2>
          <div style={s.grid}>
            {(group.items ?? []).map(item => (
              <Link key={item.to} to={item.to} style={s.card}>
                <span style={s.accent} aria-hidden="true" />
                <p style={s.cardLabel}>{item.label}</p>
                <p style={s.cardHint}>{HINTS[item.to] ?? "Abrir"}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default AdminPainel;
