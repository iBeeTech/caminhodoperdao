import React from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../../components";
import Medal from "../components/Medal";
import RoadOfEditions from "../components/RoadOfEditions";
import YearPicker from "../components/YearPicker";
import { dashboardStyles as s } from "./dashboard.styles";
import {
  Me,
  SessionExpiredError,
  fetchAvailableYears,
  fetchMe,
  messageForError,
  saveYears,
} from "../api";

/**
 * A tela principal de quem entrou: a caminhada dele, ano a ano.
 *
 * Dois estados na mesma rota, de propósito:
 *
 * 1. **Primeiro acesso** — a pessoa declara em quais anos caminhou. Aparece uma
 *    vez só (`hasDeclaredYears`), inclusive para quem não marca nenhum ano.
 *    Depois disso a edição mora no `/perfil`, longe do caminho de todo dia.
 * 2. **A estrada** — as 19 edições em fila, as caminhadas acesas, o futuro
 *    tracejado, e as medalhas embaixo.
 *
 * ⚠️ Os anos são AUTO-DECLARADOS (migration 029). A tela diz isso com todas as
 * letras: medalha que parece verificada e não é vale menos do que medalha
 * assumidamente declarada.
 */

const PeregrinoDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [me, setMe] = React.useState<Me | null>(null);
  const [available, setAvailable] = React.useState<number[]>([]);
  const [selected, setSelected] = React.useState<number[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        const [profile, years] = await Promise.all([fetchMe(), fetchAvailableYears()]);
        if (!isActive) return;
        setMe(profile);
        setSelected(profile.years);
        setAvailable(years.available);
      } catch (loadError) {
        if (!isActive) return;
        if (loadError instanceof SessionExpiredError) {
          navigate("/entrar", { replace: true });
          return;
        }
        setError("Não foi possível carregar sua caminhada.");
      }
    };
    load();
    return () => {
      isActive = false;
    };
  }, [navigate]);

  // Recebe os anos por parâmetro em vez de ler o estado: o botão "ainda não
  // caminhei" precisa gravar lista vazia no mesmo clique, e o estado só estaria
  // atualizado no render seguinte — gravaria os anos antigos.
  const handleDeclareYears = async (years: number[]) => {
    setIsSaving(true);
    setError(null);
    try {
      const saved = await saveYears(years);
      setMe(current =>
        current
          ? {
              ...current,
              years: saved.years,
              badges: saved.badges,
              nextBadge: saved.nextBadge,
              hasDeclaredYears: true,
            }
          : current
      );
    } catch (saveError) {
      if (saveError instanceof SessionExpiredError) {
        navigate("/entrar", { replace: true });
        return;
      }
      setError(messageForError(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleYear = (year: number) =>
    setSelected(current =>
      current.includes(year) ? current.filter(y => y !== year) : [...current, year]
    );

  if (!me) {
    return (
      <>
        <Header />
        <div style={s.page}>
          <div style={s.shell}>
            {error ? <div style={s.error}>{error}</div> : <p style={s.loading}>Carregando...</p>}
          </div>
        </div>
      </>
    );
  }

  // Primeiro acesso: a pergunta dos anos, e só ela.
  if (!me.hasDeclaredYears) {
    return (
      <>
        <Header />
        <div style={s.page}>
          <div style={s.onboardCard}>
            <h1 style={s.onboardTitle}>Antes de tudo: em quais anos você caminhou?</h1>
            <p style={s.onboardHelp}>
              Marque as edições de que você participou. Você mesmo informa — não temos
              como conferir, então conte com sinceridade. Perguntamos uma vez só; depois
              disso dá para mudar no seu perfil, quando quiser.
            </p>
            {error && <div style={s.error}>{error}</div>}

            <YearPicker available={available} selected={selected} onToggle={toggleYear} />

            <button
              type="button"
              style={{ ...s.goldButton, ...(isSaving ? s.buttonOff : {}) }}
              onClick={() => handleDeclareYears(selected)}
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar e ver minha caminhada"}
            </button>
            <button
              type="button"
              style={s.ghostButton}
              onClick={() => {
                setSelected([]);
                handleDeclareYears([]);
              }}
              disabled={isSaving}
            >
              Ainda não caminhei nenhuma vez
            </button>
          </div>
        </div>
      </>
    );
  }

  const editions: number[] = [];
  for (let year = me.firstEditionYear; year <= me.currentYear; year += 1) editions.push(year);

  const firstName = me.profile.name.trim().split(" ")[0];
  const walkedCount = me.years.length;

  return (
    <>
      <Header />
      <div style={s.page}>
        <div style={s.shell}>
          <div style={s.hero}>
            <p style={s.eyebrow}>Sua caminhada</p>
            <h1 style={s.heroTitle}>
              {firstName ? `Que bom te ver, ${firstName}.` : "Que bom te ver."}
            </h1>
            <p style={s.heroText}>
              {walkedCount === 0
                ? "Sua estrada ainda está toda pela frente. Quando você caminhar, os anos acendem aqui."
                : `Você já caminhou ${walkedCount} ${
                    walkedCount === 1 ? "vez" : "vezes"
                  }. Cada pedra acesa é uma edição sua.`}
            </p>

            <div style={s.stats}>
              <div style={s.stat}>
                <p style={s.statValue}>{walkedCount}</p>
                <p style={s.statLabel}>caminhadas declaradas</p>
              </div>
              <div style={s.stat}>
                <p style={s.statValue}>{editions.length}</p>
                <p style={s.statLabel}>edições já realizadas</p>
              </div>
              <div style={s.stat}>
                <p style={s.statValue}>{me.badges.length}</p>
                <p style={s.statLabel}>medalhas conquistadas</p>
              </div>
            </div>
          </div>

          <div style={s.panel}>
            <h2 style={s.panelTitle}>A estrada</h2>
            <p style={s.panelHelp}>
              Uma pedra por edição, de {me.firstEditionYear} até {me.currentYear}. As
              douradas são as suas. Arraste para o lado para ver os anos anteriores.
            </p>
            <RoadOfEditions
              editions={editions}
              walkedYears={me.years}
              currentYear={me.currentYear}
            />
          </div>

          <div style={s.panel}>
            <h2 style={s.panelTitle}>Suas medalhas</h2>
            <p style={s.panelHelp}>
              Saem dos anos que você declarou. Para mudar os anos, vá em Perfil.
            </p>

            {me.badges.length === 0 ? (
              <div style={s.emptyDark}>
                Nenhuma medalha ainda. Marque no seu perfil os anos em que você caminhou e
                elas aparecem aqui.
              </div>
            ) : (
              <div style={s.medalGrid}>
                {me.badges.map(badge => (
                  <Medal
                    key={badge.id}
                    label={badge.label}
                    description={badge.description}
                    tier={badge.tier}
                    year={badge.year}
                  />
                ))}
                {me.nextBadge && (
                  <Medal
                    label={me.nextBadge.label}
                    description={`Faltam ${me.nextBadge.years - walkedCount} ${
                      me.nextBadge.years - walkedCount === 1 ? "edição" : "edições"
                    } para conquistar.`}
                    tier={me.nextBadge.tier}
                    isLocked
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default PeregrinoDashboard;
