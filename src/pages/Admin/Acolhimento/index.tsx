import React from "react";
import AuthNotice from "../AuthNotice";

/**
 * `/admin/acolhimento` — quem abriu a casa para receber peregrinos de fora.
 *
 * Só leitura, de propósito. A oferta é um compromisso da pessoa, e admin
 * mexendo na oferta alheia produziria justamente o combinado que ninguém fez.
 * Quem cria, muda e desiste é a própria pessoa, no Meu Caminho.
 *
 * O número que importa está no topo: **quantas vagas ativas existem**. É ele
 * que responde "quantos peregrinos de fora conseguimos acolher?", e é a
 * pergunta que a organização faz antes de qualquer outra.
 */

const STORAGE_KEY = "admin_jwt";

interface HostingOffer {
  id: string;
  city: "franca" | "claraval";
  cityLabel: string;
  spots: number;
  genderPreference: "qualquer" | "feminino" | "masculino";
  offersMeal: boolean;
  offersShower: boolean;
  offersTransport: boolean;
  address: string;
  contactPhone: string;
  notes: string;
  status: "ATIVO" | "CANCELADO";
  hostName: string;
  hostEmail: string;
  hostPhone: string;
  createdAt: number;
}

type CityFilter = "all" | "franca" | "claraval";

const CITY_FILTERS: Array<{ key: CityFilter; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "franca", label: "Franca" },
  { key: "claraval", label: "Claraval" },
];

const GENDER_LABEL: Record<HostingOffer["genderPreference"], string> = {
  qualquer: "Tanto faz",
  feminino: "Mulheres",
  masculino: "Homens",
};

const formatPhone = (digits: string) => {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits || "—";
};

const formatDate = (epochMs: number) => {
  const date = new Date(epochMs);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const extrasOf = (offer: HostingOffer) => {
  const extras = [
    offer.offersShower && "banho",
    offer.offersMeal && "refeição",
    offer.offersTransport && "carona",
  ].filter(Boolean);
  return extras.length > 0 ? extras.join(", ") : "só dormida";
};

// Mensagem pronta para combinar o acolhimento (1 clique abre o WhatsApp).
const buildWhatsappUrl = (offer: HostingOffer) => {
  const firstName = offer.hostName.trim().split(/\s+/)[0] || "olá";
  const message =
    `Olá, ${firstName}! Aqui é da organização do Caminho do Perdão. ` +
    `Obrigado por se oferecer para acolher peregrinos em ${offer.cityLabel}. ` +
    `Podemos combinar os detalhes?`;
  return `https://wa.me/55${offer.contactPhone}?text=${encodeURIComponent(message)}`;
};

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1180, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif" },
  title: { fontSize: "1.5rem", marginBottom: "0.25rem" },
  subtitle: { color: "#555", marginBottom: "1.5rem", fontSize: "0.95rem", lineHeight: 1.6 },
  counters: { display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" },
  counter: {
    padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid", fontWeight: 600, fontSize: "0.9rem",
  },
  filterBar: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" },
  filterBtn: {
    padding: "0.4rem 0.9rem", borderRadius: 999, border: "1px solid #d1d5db", background: "#fff",
    color: "#374151", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
  },
  filterBtnActive: { background: "#1d2c5e", borderColor: "#1d2c5e", color: "#fff" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" },
  th: { textAlign: "left", borderBottom: "2px solid #ddd", padding: "0.5rem", whiteSpace: "nowrap" },
  td: { borderBottom: "1px solid #eee", padding: "0.5rem", verticalAlign: "top" },
  badge: {
    padding: "0.2rem 0.6rem", borderRadius: 999, fontWeight: 700, fontSize: "0.78rem",
    border: "1px solid", whiteSpace: "nowrap",
  },
  waBtn: {
    display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.4rem 0.8rem",
    borderRadius: 8, border: "none", background: "#25d366", color: "#fff", fontWeight: 600,
    fontSize: "0.85rem", cursor: "pointer", textDecoration: "none",
  },
  notes: { color: "#6b7280", fontSize: "0.82rem", margin: "4px 0 0", maxWidth: 260, lineHeight: 1.45 },
  empty: { color: "#777", padding: "2rem 0" },
  error: { color: "#b91c1c", fontWeight: 600 },
};

const AcolhimentoPage: React.FC = () => {
  const [token] = React.useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [offers, setOffers] = React.useState<HostingOffer[]>([]);
  const [eventYear, setEventYear] = React.useState<number | null>(null);
  const [activeSpots, setActiveSpots] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [cityFilter, setCityFilter] = React.useState<CityFilter>("all");

  React.useEffect(() => {
    let isActive = true;
    const load = async () => {
      if (!token) {
        setAuthError(true);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/admin/hosting", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!isActive) return;
        if (res.status === 401 || res.status === 403) {
          setAuthError(true);
          return;
        }
        const data = (await res.json()) as {
          offers?: HostingOffer[];
          activeSpots?: number;
          eventYear?: number;
        };
        setOffers(data.offers ?? []);
        setActiveSpots(data.activeSpots ?? 0);
        setEventYear(data.eventYear ?? null);
      } catch {
        if (isActive) setLoadError("Não foi possível carregar a lista. Tente de novo.");
      } finally {
        if (isActive) setLoading(false);
      }
    };
    load();
    return () => {
      isActive = false;
    };
  }, [token]);

  if (authError) {
    return (
      <div style={styles.page}>
        <h1 style={styles.title}>Acolhimento</h1>
        <AuthNotice />
      </div>
    );
  }

  const active = offers.filter(offer => offer.status === "ATIVO");
  const visible = active
    .concat(offers.filter(offer => offer.status !== "ATIVO"))
    .filter(offer => cityFilter === "all" || offer.city === cityFilter);

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Acolhimento{eventYear ? ` — ${eventYear}` : ""}</h1>
      <p style={styles.subtitle}>
        Moradores de Franca e Claraval que se ofereceram para receber peregrinos de fora
        em casa. Quem cria e cancela a oferta é a própria pessoa, no Meu Caminho — aqui é
        só a lista para você combinar os encaixes.
      </p>

      <div style={styles.counters}>
        <span style={{ ...styles.counter, color: "#15803d", borderColor: "#86efac", background: "#f0fdf4" }}>
          Vagas disponíveis: {activeSpots}
        </span>
        <span style={{ ...styles.counter, color: "#1d2c5e", borderColor: "#c7d2fe", background: "#eef2ff" }}>
          Casas ativas: {active.length}
        </span>
        <span style={{ ...styles.counter, color: "#b91c1c", borderColor: "#fecaca", background: "#fef2f2" }}>
          Desistências: {offers.length - active.length}
        </span>
      </div>

      <div style={styles.filterBar}>
        <span style={{ fontWeight: 600, color: "#374151", fontSize: "0.85rem" }}>Cidade:</span>
        {CITY_FILTERS.map(filter => (
          <button
            key={filter.key}
            type="button"
            style={
              cityFilter === filter.key
                ? { ...styles.filterBtn, ...styles.filterBtnActive }
                : styles.filterBtn
            }
            onClick={() => setCityFilter(filter.key)}
          >
            {filter.label} (
            {filter.key === "all"
              ? offers.length
              : offers.filter(offer => offer.city === filter.key).length}
            )
          </button>
        ))}
      </div>

      {loadError && <p style={styles.error}>{loadError}</p>}

      {loading ? (
        <p>Carregando…</p>
      ) : offers.length === 0 ? (
        <p style={styles.empty}>Ninguém se ofereceu para acolher ainda.</p>
      ) : visible.length === 0 ? (
        <p style={styles.empty}>Ninguém nessa cidade.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Quem recebe</th>
              <th style={styles.th}>Cidade</th>
              <th style={styles.th}>Vagas</th>
              <th style={styles.th}>Prefere</th>
              <th style={styles.th}>Oferece</th>
              <th style={styles.th}>Onde</th>
              <th style={styles.th}>Contato</th>
              <th style={styles.th}>Desde</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Ação</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(offer => (
              <tr
                key={offer.id}
                style={offer.status !== "ATIVO" ? { background: "#f8fafc" } : undefined}
              >
                <td style={styles.td}>
                  {offer.hostName || "—"}
                  <p style={styles.notes}>{offer.hostEmail}</p>
                </td>
                <td style={styles.td}>{offer.cityLabel}</td>
                <td style={styles.td}>{offer.spots}</td>
                <td style={styles.td}>{GENDER_LABEL[offer.genderPreference]}</td>
                <td style={styles.td}>{extrasOf(offer)}</td>
                <td style={styles.td}>
                  {offer.address}
                  {offer.notes && <p style={styles.notes}>{offer.notes}</p>}
                </td>
                <td style={styles.td}>{formatPhone(offer.contactPhone)}</td>
                <td style={styles.td}>{formatDate(offer.createdAt)}</td>
                <td style={styles.td}>
                  {offer.status === "ATIVO" ? (
                    <span
                      style={{
                        ...styles.badge,
                        color: "#15803d",
                        borderColor: "#86efac",
                        background: "#f0fdf4",
                      }}
                    >
                      Ativo
                    </span>
                  ) : (
                    <span
                      style={{
                        ...styles.badge,
                        color: "#b91c1c",
                        borderColor: "#fecaca",
                        background: "#fef2f2",
                      }}
                    >
                      Desistiu
                    </span>
                  )}
                </td>
                <td style={{ ...styles.td, whiteSpace: "nowrap" }}>
                  {offer.status === "ATIVO" && offer.contactPhone && (
                    <a
                      href={buildWhatsappUrl(offer)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.waBtn}
                    >
                      Falar no WhatsApp
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AcolhimentoPage;
