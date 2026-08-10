import React from "react";
import AuthNotice from "../AuthNotice";
import { getAdminToken } from "../../../utils/auth/adminSession";
import { formatarReais } from "../../../services/fotos/fotos.service";

interface PedidoDeFotosAdmin {
  id: string;
  nome: string;
  email: string;
  ano: number;
  quantidade: number;
  valor_total_centavos: number;
  status: "PENDING" | "PAID" | "CANCELED";
  criado_em: string;
  pago_em: string | null;
  downloads_expiram_em: string | null;
  url: string | null;
  url_gerada_em: string | null;
  url_gerada_por: string | null;
}

const s: Record<string, React.CSSProperties> = {
  page: { padding: "24px 20px 60px", maxWidth: 1180, margin: "0 auto" },
  title: { fontSize: 24, margin: "0 0 6px", color: "#1d1d1f" },
  subtitle: { margin: "0 0 20px", color: "#4b5563", fontSize: 14, lineHeight: 1.5 },
  searchRow: { display: "flex", gap: 8, flexWrap: "wrap", margin: "0 0 18px" },
  input: {
    flex: "1 1 280px",
    minWidth: 0,
    padding: "0.6rem 0.8rem",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    font: "inherit",
    fontSize: "0.92rem",
  },
  button: {
    padding: "0.55rem 1rem",
    borderRadius: 8,
    border: "1px solid #1f7a3d",
    background: "#1f7a3d",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.88rem",
    cursor: "pointer",
  },
  ghostButton: {
    padding: "0.4rem 0.7rem",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    fontWeight: 600,
    fontSize: "0.8rem",
    cursor: "pointer",
  },
  tableWrap: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflowX: "auto",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13.5 },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #e5e7eb",
    color: "#6b7280",
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  td: { padding: "12px", borderBottom: "1px solid #f1f1f3", verticalAlign: "top" },
  nome: { fontWeight: 700, color: "#1d1d1f" },
  email: { color: "#6b7280", fontSize: 12.5, wordBreak: "break-all" },
  meta: { color: "#6b7280", fontSize: 12, margin: "3px 0 0" },
  tag: {
    display: "inline-block",
    fontSize: 11.5,
    fontWeight: 700,
    borderRadius: 999,
    padding: "2px 9px",
    whiteSpace: "nowrap",
  },
  linkBox: {
    display: "block",
    maxWidth: 320,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 11.5,
    color: "#374151",
    background: "#f6f6f7",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    padding: "6px 8px",
    wordBreak: "break-all",
    userSelect: "all",
  },
  actions: { display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" },
  empty: { color: "#6b7280", fontSize: 14, padding: "18px 12px" },
  aviso: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    color: "#7c2d12",
    fontSize: 13.5,
    lineHeight: 1.5,
  },
};

const CORES_DO_STATUS: Record<string, React.CSSProperties> = {
  PAID: { color: "#166534", background: "#dcfce7", border: "1px solid #bbf7d0" },
  PENDING: { color: "#92400e", background: "#fef3c7", border: "1px solid #fde68a" },
  CANCELED: { color: "#b91c1c", background: "#fee2e2", border: "1px solid #fecaca" },
};

const ROTULO_DO_STATUS: Record<string, string> = {
  PAID: "Pago",
  PENDING: "Aguardando PIX",
  CANCELED: "Cancelado",
};

function formatarData(valor: string | null): string {
  if (!valor) return "—";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR");
}

function formatarDataHora(valor: string | null): string {
  if (!valor) return "—";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleString("pt-BR");
}

function prazoVencido(pedido: PedidoDeFotosAdmin): boolean {
  if (!pedido.downloads_expiram_em) return false;
  return new Date(pedido.downloads_expiram_em).getTime() <= Date.now();
}

/**
 * Pedidos de fotos e seus links de acesso.
 *
 * O link do pedido só é mostrado no e-mail de "pedido aberto", e o banco guarda
 * apenas o hash dele. Quando o comprador perde esse e-mail, esta tela reemite:
 * gera um endereço novo, invalida o anterior e guarda a URL para reenviar
 * quantas vezes for preciso.
 */
const PedidosFotosPage: React.FC = () => {
  const [pedidos, setPedidos] = React.useState<PedidoDeFotosAdmin[]>([]);
  const [busca, setBusca] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [copiado, setCopiado] = React.useState<string | null>(null);
  const [ocupado, setOcupado] = React.useState<string | null>(null);

  const carregar = React.useCallback(async (termo: string) => {
    const token = getAdminToken();
    if (!token) {
      setAuthError(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const query = termo.trim() ? `?q=${encodeURIComponent(termo.trim())}` : "";
      const resposta = await fetch(`/api/admin/photo-orders${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resposta.status === 401 || resposta.status === 403) {
        setAuthError(true);
        return;
      }
      if (!resposta.ok) throw new Error("load_failed");
      const dados = (await resposta.json()) as { pedidos?: PedidoDeFotosAdmin[] };
      setPedidos(dados.pedidos ?? []);
      setFeedback(null);
    } catch {
      setFeedback("Não foi possível carregar os pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    carregar("");
  }, [carregar]);

  const reemitir = async (pedido: PedidoDeFotosAdmin) => {
    const token = getAdminToken();
    if (!token) {
      setAuthError(true);
      return;
    }
    // ⚠️ Reemitir mata o link anterior. Se a pessoa ainda tiver o e-mail antigo,
    // ele para de funcionar — por isso a confirmação.
    const jaTemLink = Boolean(pedido.url);
    if (
      jaTemLink &&
      !window.confirm(
        `Gerar um link novo para ${pedido.nome}?\n\nO link atual para de funcionar na hora.`
      )
    ) {
      return;
    }

    setOcupado(pedido.id);
    setFeedback(null);
    try {
      const resposta = await fetch("/api/admin/photo-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: pedido.id }),
      });
      if (!resposta.ok) {
        setFeedback("Não foi possível gerar o link.");
        return;
      }
      const dados = (await resposta.json()) as {
        url: string;
        downloads_expiram_em: string | null;
      };
      setPedidos(atuais =>
        atuais.map(item =>
          item.id === pedido.id
            ? {
                ...item,
                url: dados.url,
                url_gerada_em: new Date().toISOString(),
                downloads_expiram_em: dados.downloads_expiram_em ?? item.downloads_expiram_em,
              }
            : item
        )
      );
    } catch {
      setFeedback("Não foi possível gerar o link.");
    } finally {
      setOcupado(null);
    }
  };

  const copiar = async (pedido: PedidoDeFotosAdmin) => {
    if (!pedido.url) return;
    try {
      await navigator.clipboard.writeText(pedido.url);
      setCopiado(pedido.id);
      window.setTimeout(() => setCopiado(atual => (atual === pedido.id ? null : atual)), 2000);
    } catch {
      setFeedback("O navegador bloqueou a cópia. Selecione o endereço e copie à mão.");
    }
  };

  if (authError) {
    return (
      <div style={s.page}>
        <h1 style={s.title}>Pedidos de fotos</h1>
        <AuthNotice message="Você precisa estar logado como administrador." />
      </div>
    );
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>Pedidos de fotos</h1>
      <p style={s.subtitle}>
        Quem comprou fotos, o que pagou e o link que abre os downloads. Use quando alguém disser que
        perdeu o e-mail ou que o link não abre.
      </p>

      <div style={s.aviso}>
        <strong>Como funciona:</strong> o link original vai só no e-mail de compra e não fica salvo
        aqui. Clicar em <em>Gerar link</em> cria um endereço novo, <strong>derruba o anterior</strong>{" "}
        e renova o prazo de download por 30 dias. A partir daí a URL fica guardada nesta tela para
        você reenviar quantas vezes precisar.
      </div>

      <form
        style={s.searchRow}
        onSubmit={event => {
          event.preventDefault();
          carregar(busca);
        }}
      >
        <input
          style={s.input}
          type="search"
          value={busca}
          placeholder="Buscar por e-mail ou nome"
          onChange={event => setBusca(event.target.value)}
        />
        <button type="submit" style={s.button}>
          Buscar
        </button>
        <button
          type="button"
          style={s.ghostButton}
          onClick={() => {
            setBusca("");
            carregar("");
          }}
        >
          Limpar
        </button>
      </form>

      {feedback && <p style={{ color: "#c62828" }}>{feedback}</p>}

      <div style={s.tableWrap}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Comprador</th>
              <th style={s.th}>Pedido</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Downloads até</th>
              <th style={s.th}>Link</th>
              <th style={s.th} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={s.empty} colSpan={6}>
                  Carregando...
                </td>
              </tr>
            ) : pedidos.length === 0 ? (
              <tr>
                <td style={s.empty} colSpan={6}>
                  Nenhum pedido encontrado.
                </td>
              </tr>
            ) : (
              pedidos.map(pedido => (
                <tr key={pedido.id}>
                  <td style={s.td}>
                    <div style={s.nome}>{pedido.nome}</div>
                    <div style={s.email}>{pedido.email}</div>
                  </td>
                  <td style={s.td}>
                    {pedido.quantidade} foto{pedido.quantidade === 1 ? "" : "s"} de {pedido.ano}
                    <p style={s.meta}>
                      {formatarReais(pedido.valor_total_centavos)} · {formatarData(pedido.criado_em)}
                    </p>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.tag, ...(CORES_DO_STATUS[pedido.status] ?? {}) }}>
                      {ROTULO_DO_STATUS[pedido.status] ?? pedido.status}
                    </span>
                  </td>
                  <td style={s.td}>
                    {formatarData(pedido.downloads_expiram_em)}
                    {prazoVencido(pedido) && (
                      <p style={{ ...s.meta, color: "#b91c1c", fontWeight: 700 }}>prazo vencido</p>
                    )}
                  </td>
                  <td style={s.td}>
                    {pedido.url ? (
                      <>
                        <code style={s.linkBox}>{pedido.url}</code>
                        <p style={s.meta}>Gerado em {formatarDataHora(pedido.url_gerada_em)}</p>
                      </>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>só no e-mail da compra</span>
                    )}
                  </td>
                  <td style={s.td}>
                    <div style={s.actions}>
                      {pedido.url && (
                        <button type="button" style={s.ghostButton} onClick={() => copiar(pedido)}>
                          {copiado === pedido.id ? "Copiado!" : "Copiar"}
                        </button>
                      )}
                      <button
                        type="button"
                        style={s.button}
                        disabled={ocupado === pedido.id}
                        onClick={() => reemitir(pedido)}
                      >
                        {ocupado === pedido.id
                          ? "Gerando..."
                          : pedido.url
                            ? "Gerar outro"
                            : "Gerar link"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PedidosFotosPage;
