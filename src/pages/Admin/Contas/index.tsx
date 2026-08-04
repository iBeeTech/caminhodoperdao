import React from "react";
import { isSuperAdmin } from "../../../utils/auth/superAdmin";

/**
 * `/admin/contas` — quem tem login no site e qual é o papel de cada um.
 *
 * ⚠️ MARCAR AQUI NÃO ABRE O PAINEL. `admin` identifica a pessoa como admin do
 * evento; quem entra em `/admin` continua sendo a conta em `admin_users`. A
 * unificação dos dois logins é frente própria (Planning.md, bloco 1) — até lá,
 * conceder o papel aqui e criar a conta de admin lá são dois passos.
 *
 * A tela inteira é do ADMIN GERAL. Quem pode promover alguém a admin pode tudo,
 * e o servidor (`authorizeSuperAdminRequest`) recusa qualquer outro — esconder
 * aqui é só para o admin comum não bater numa porta trancada.
 */

const STORAGE_KEY = "admin_jwt";

interface Account {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  is_staff: number;
  is_admin: number;
  email_confirmed_at: number | null;
  role_updated_at: number | null;
  role_updated_by: string | null;
  created_at: number;
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1000, margin: "0 auto", padding: "1rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.4rem", margin: "0 0 0.25rem" },
  help: { color: "#6b7280", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 1rem" },
  warn: {
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 10,
    padding: "0.7rem 0.9rem",
    color: "#92400e",
    fontSize: "0.86rem",
    lineHeight: 1.5,
    marginBottom: "1rem",
  },
  search: {
    width: "100%",
    padding: "0.6rem 0.8rem",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: "0.95rem",
    marginBottom: "1rem",
    boxSizing: "border-box",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "0.85rem 1rem",
    marginBottom: 10,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  who: { flex: "1 1 240px", minWidth: 200 },
  name: { fontWeight: 700, fontSize: "0.98rem", margin: 0 },
  email: { color: "#6b7280", fontSize: "0.84rem", margin: "2px 0 0", wordBreak: "break-all" },
  meta: { color: "#9ca3af", fontSize: "0.76rem", margin: "4px 0 0" },
  toggles: { display: "flex", gap: 16, alignItems: "center" },
  toggle: { display: "flex", alignItems: "center", gap: 6, fontSize: "0.88rem", fontWeight: 600 },
  tag: {
    display: "inline-block",
    padding: "0.15rem 0.6rem",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: "0.74rem",
    marginLeft: 6,
  },
  tagAdmin: { color: "#5b3d05", background: "#fde9b0", border: "1px solid #c8930f" },
  tagStaff: { color: "#1e3a8a", background: "#dbeafe", border: "1px solid #bfdbfe" },
  tagPending: { color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca" },
  empty: { color: "#777", padding: "1.5rem 0" },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 8,
    padding: 12,
    color: "#7f1d1d",
    fontSize: "0.9rem",
    marginBottom: "1rem",
  },
};

const ContasPage: React.FC = () => {
  const token = React.useMemo(() => localStorage.getItem(STORAGE_KEY), []);
  const superAdmin = React.useMemo(() => isSuperAdmin(), []);

  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!token) {
      window.location.href = "/admin";
      return;
    }
    fetch("/api/admin/accounts", { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        if (response.status === 401 || response.status === 403) {
          window.location.href = "/admin";
          return;
        }
        if (!response.ok) {
          setError("Não foi possível carregar as contas.");
          return;
        }
        setAccounts(((await response.json()) as { accounts: Account[] }).accounts);
      })
      .catch(() => setError("Falha de conexão."))
      .finally(() => setIsLoading(false));
  }, [token]);

  /**
   * Manda o estado DESEJADO, não um "alternar". Dois cliques rápidos, ou duas
   * abas abertas, fariam um toggle terminar no oposto do que a tela mostra.
   */
  const setRole = async (account: Account, next: { isStaff: boolean; isAdmin: boolean }) => {
    setBusyId(account.id);
    setError(null);
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: account.id, ...next }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(
          data.error === "forbidden_not_super_admin"
            ? "Só o admin geral pode conceder papéis."
            : "Não foi possível salvar o papel."
        );
        return;
      }
      const saved = (await response.json()) as {
        isStaff: boolean;
        isAdmin: boolean;
        roleUpdatedAt: number;
        roleUpdatedBy: string;
      };
      setAccounts(current =>
        current.map(item =>
          item.id === account.id
            ? {
                ...item,
                is_staff: saved.isStaff ? 1 : 0,
                is_admin: saved.isAdmin ? 1 : 0,
                role_updated_at: saved.roleUpdatedAt,
                role_updated_by: saved.roleUpdatedBy,
              }
            : item
        )
      );
    } catch {
      setError("Falha de conexão.");
    } finally {
      setBusyId(null);
    }
  };

  const term = search.trim().toLowerCase();
  const filtered = term
    ? accounts.filter(
        a =>
          a.email.toLowerCase().includes(term) ||
          (a.name ?? "").toLowerCase().includes(term)
      )
    : accounts;

  return (
    <div style={s.page}>
      <h1 style={s.title}>Contas e papéis</h1>
      <p style={s.help}>
        Todo mundo que criou login no site. Aqui você marca quem é servo (staff) e quem é
        admin do evento. Todo admin é servo — marcar admin marca servo junto.
      </p>

      <div style={s.warn}>
        <strong>Marcar aqui não dá acesso ao painel.</strong> O papel identifica a pessoa e
        libera o selo de Servo na área dela. Para alguém entrar em <code>/admin</code>, a
        conta de admin continua sendo criada à parte.
      </div>

      {!superAdmin && (
        <div style={s.error}>
          Esta tela é do admin geral. Você consegue ver a lista, mas não alterar papéis.
        </div>
      )}
      {error && <div style={s.error}>{error}</div>}

      <input
        style={s.search}
        placeholder="🔍 Buscar por nome ou e-mail…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {isLoading && <p style={s.empty}>Carregando…</p>}
      {!isLoading && filtered.length === 0 && (
        <p style={s.empty}>Nenhuma conta encontrada.</p>
      )}

      {filtered.map(account => (
        <div key={account.id} style={s.card}>
          <div style={s.who}>
            <p style={s.name}>
              {account.name || "(sem nome no cadastro)"}
              {account.is_admin === 1 && <span style={{ ...s.tag, ...s.tagAdmin }}>admin</span>}
              {account.is_admin === 0 && account.is_staff === 1 && (
                <span style={{ ...s.tag, ...s.tagStaff }}>servo</span>
              )}
              {!account.email_confirmed_at && (
                <span style={{ ...s.tag, ...s.tagPending }}>e-mail não confirmado</span>
              )}
            </p>
            <p style={s.email}>{account.email}</p>
            {account.role_updated_by && (
              <p style={s.meta}>papel definido por {account.role_updated_by}</p>
            )}
          </div>

          <div style={s.toggles}>
            <label style={s.toggle}>
              <input
                type="checkbox"
                checked={account.is_staff === 1}
                disabled={!superAdmin || busyId === account.id || account.is_admin === 1}
                onChange={e =>
                  setRole(account, { isStaff: e.target.checked, isAdmin: account.is_admin === 1 })
                }
              />
              Servo
            </label>
            <label style={s.toggle}>
              <input
                type="checkbox"
                checked={account.is_admin === 1}
                disabled={!superAdmin || busyId === account.id}
                onChange={e =>
                  setRole(account, {
                    // Tirar o admin NÃO tira o servo: quem foi admin seguiu
                    // servindo, e rebaixar as duas coisas de uma vez apagaria
                    // um fato por causa do outro.
                    isStaff: e.target.checked ? true : account.is_staff === 1,
                    isAdmin: e.target.checked,
                  })
                }
              />
              Admin
            </label>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContasPage;
