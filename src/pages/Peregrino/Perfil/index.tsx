import React from "react";
import { useNavigate } from "react-router-dom";
import { clearUserToken, getUserToken } from "../../../utils/auth/userSession";
import { peregrinoStyles } from "../peregrino.styles";
import { theme } from "../../../styles/theme";
import logo from "../../../assets/logo.png";

/**
 * Página do peregrino: a caminhada dele, ano a ano, com as medalhas.
 *
 * Os anos são DECLARADOS pela própria pessoa (ver migration 029): o histórico
 * apurado de 2026 foi arquivado. A tela precisa deixar isso claro, senão a
 * medalha parece uma verificação que não existe.
 */

interface Badge {
  id: string;
  label: string;
  description: string;
  year?: number;
}

interface Profile {
  email: string;
  currentYear: number;
  years: number[];
  badges: Badge[];
}

const c = theme.colors;
const s = peregrinoStyles;

const own: Record<string, React.CSSProperties> = {
  wide: { maxWidth: 560 },
  header: { textAlign: "center", marginBottom: 24 },
  email: { color: c.muted, fontSize: 14, margin: "4px 0 0", textAlign: "center" },
  section: { marginTop: 28 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: c.primary,
    margin: "0 0 4px",
  },
  sectionHelp: { color: c.muted, fontSize: 13, lineHeight: 1.6, margin: "0 0 14px" },
  yearGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  yearChip: {
    padding: "0.45rem 0.9rem",
    borderRadius: theme.radius.pill,
    border: `1px solid ${c.border}`,
    background: c.surface,
    color: c.text,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  yearChipOn: {
    background: c.primary,
    borderColor: c.primary,
    color: c.surface,
  },
  badgeGrid: { display: "flex", flexWrap: "wrap", gap: 12 },
  badge: {
    flex: "1 1 150px",
    minWidth: 150,
    background: `linear-gradient(150deg, ${c.gradientStart} 0%, ${c.gradientEnd} 100%)`,
    borderRadius: theme.radius.md,
    padding: "16px 14px",
    textAlign: "center",
    border: `2px solid ${c.gold}`,
  },
  badgeLabel: { color: c.gold, fontWeight: 800, fontSize: 15, margin: 0 },
  badgeDesc: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    lineHeight: 1.5,
    margin: "6px 0 0",
  },
  empty: {
    background: theme.colors.background,
    border: `1px dashed ${c.border}`,
    borderRadius: theme.radius.md,
    padding: 20,
    color: c.muted,
    fontSize: 14,
    lineHeight: 1.6,
    textAlign: "center",
  },
  saved: {
    background: "#f0fdf4",
    border: `1px solid ${c.successSoft}`,
    borderRadius: theme.radius.sm,
    padding: 10,
    color: "#14532d",
    fontSize: 13,
    marginTop: 12,
  },
  logout: {
    marginTop: 28,
    padding: "0.6rem 1rem",
    borderRadius: theme.radius.sm,
    border: `1px solid ${c.border}`,
    background: c.surface,
    color: c.text,
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    width: "100%",
  },
};

const PeregrinoPerfil: React.FC = () => {
  const navigate = useNavigate();
  const token = getUserToken();

  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [available, setAvailable] = React.useState<number[]>([]);
  const [selected, setSelected] = React.useState<number[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      navigate("/entrar", { replace: true });
      return;
    }
    const auth = { Authorization: `Bearer ${token}` };
    const load = async () => {
      try {
        const [meRes, yearsRes] = await Promise.all([
          fetch("/api/me", { headers: auth }),
          fetch("/api/me/years", { headers: auth }),
        ]);
        // Token vencido ou inválido: volta para a entrada em vez de mostrar
        // uma página vazia sem explicação.
        if (meRes.status === 401) {
          clearUserToken();
          navigate("/entrar", { replace: true });
          return;
        }
        if (!meRes.ok) {
          setError("Não foi possível carregar seu perfil.");
          return;
        }
        const me = (await meRes.json()) as Profile;
        setProfile(me);
        setSelected(me.years);
        if (yearsRes.ok) {
          setAvailable(((await yearsRes.json()) as { available: number[] }).available);
        }
      } catch {
        setError("Falha de conexão.");
      }
    };
    load();
  }, [token, navigate]);

  const toggleYear = (year: number) => {
    setSavedAt(null);
    setSelected(prev =>
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const saveYears = async () => {
    if (!token) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/me/years", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ years: selected }),
      });
      if (!response.ok) {
        setError("Não foi possível salvar. Tente de novo.");
        return;
      }
      const data = (await response.json()) as { years: number[]; badges: Badge[] };
      setProfile(prev => (prev ? { ...prev, years: data.years, badges: data.badges } : prev));
      setSelected(data.years);
      setSavedAt(Date.now());
    } catch {
      setError("Falha de conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!token) return null;

  const badges = profile?.badges ?? [];
  const isDirty =
    profile !== null &&
    (selected.length !== profile.years.length ||
      selected.some(year => !profile.years.includes(year)));

  return (
    <div style={s.page}>
      <div style={{ ...s.card, ...own.wide }}>
        <div style={own.header}>
          <img src={logo} alt="Caminho do Perdão" style={s.logo} />
          <h1 style={s.title}>Sua caminhada</h1>
          <p style={own.email}>{profile?.email ?? "Carregando..."}</p>
        </div>

        {error && <div style={s.error}>{error}</div>}

        <div style={own.section}>
          <h2 style={own.sectionTitle}>Suas medalhas</h2>
          <p style={own.sectionHelp}>
            Reconhecem os anos que você marcou abaixo.
          </p>
          {badges.length === 0 ? (
            <div style={own.empty}>
              Nenhuma medalha ainda. Marque os anos em que você caminhou e elas aparecem
              aqui.
            </div>
          ) : (
            <div style={own.badgeGrid}>
              {badges.map(badge => (
                <div key={badge.id} style={own.badge}>
                  <p style={own.badgeLabel}>{badge.label}</p>
                  <p style={own.badgeDesc}>{badge.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={own.section}>
          <h2 style={own.sectionTitle}>Em quais anos você caminhou?</h2>
          <p style={own.sectionHelp}>
            Marque as edições de que você participou. Você mesmo informa — não temos como
            conferir, então conte com sinceridade.
          </p>
          <div style={own.yearGrid}>
            {available.map(year => {
              const on = selected.includes(year);
              return (
                <button
                  key={year}
                  type="button"
                  style={{ ...own.yearChip, ...(on ? own.yearChipOn : {}) }}
                  onClick={() => toggleYear(year)}
                  aria-pressed={on}
                >
                  {year}
                </button>
              );
            })}
          </div>

          {savedAt && <div style={own.saved}>Anos salvos.</div>}

          <button
            type="button"
            style={{ ...s.goldButton, ...(isDirty && !isSaving ? {} : s.buttonOff) }}
            onClick={saveYears}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? "Salvando..." : "Salvar meus anos"}
          </button>
        </div>

        <button
          type="button"
          style={own.logout}
          onClick={() => {
            clearUserToken();
            navigate("/entrar", { replace: true });
          }}
        >
          Sair
        </button>
      </div>
    </div>
  );
};

export default PeregrinoPerfil;
