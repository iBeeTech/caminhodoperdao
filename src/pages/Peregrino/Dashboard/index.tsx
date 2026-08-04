import React from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../../components";
import Medal from "../components/Medal";
import RoadOfEditions from "../components/RoadOfEditions";
import YearPicker from "../components/YearPicker";
import ProfileForm from "../components/ProfileForm";
import YearMedalsGroup from "../components/YearMedalsGroup";
import InscricaoCard from "../components/InscricaoCard";
import { dashboardStyles as s } from "./dashboard.styles";
import { EDITION_THEMES, NEXT_EDITION } from "../../../data/editions";
import {
  EMPTY_PROFILE,
  Me,
  PilgrimProfile,
  SessionExpiredError,
  fetchAvailableYears,
  fetchMe,
  fetchWhatsappUrl,
  messageForError,
  saveProfile,
  saveYears,
  skipProfilePrompt,
} from "../api";

/**
 * A tela principal de quem entrou: a caminhada dele, ano a ano.
 *
 * Dois estados na mesma rota, de propósito:
 *
 * 1. **Primeiro acesso**, em dois passos: a pessoa declara em quais anos
 *    caminhou e depois preenche o cadastro. Cada passo aparece uma vez só
 *    (`hasDeclaredYears` e `hasSeenProfilePrompt`), e o cadastro tem
 *    "preencher depois" — pedir dado no primeiro minuto e não deixar sair é a
 *    forma mais rápida de perder a pessoa antes de ela ver qualquer coisa.
 *    Depois disso, os dois moram no `/perfil`, longe do caminho de todo dia.
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

  const [form, setForm] = React.useState<PilgrimProfile>(EMPTY_PROFILE);
  const [cpfInput, setCpfInput] = React.useState("");
  const [whatsappUrl, setWhatsappUrl] = React.useState<string | null>(null);
  const [participants, setParticipants] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        const [profile, years] = await Promise.all([fetchMe(), fetchAvailableYears()]);
        if (!isActive) return;
        setMe(profile);
        setSelected(profile.years);
        setForm(profile.profile);
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
    fetchWhatsappUrl("Olá! Preciso de ajuda com o meu cadastro no site.").then(url => {
      if (isActive) setWhatsappUrl(url);
    });
    // Números por edição para o balão da estrada. Falha aqui não derruba nada:
    // o balão só deixa de mostrar a linha de peregrinos.
    fetch("/api/editions")
      .then(response => (response.ok ? response.json() : { participants: {} }))
      .then(data => {
        if (isActive) setParticipants((data as { participants: Record<string, number> }).participants ?? {});
      })
      .catch(() => undefined);
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

  const handleSaveOnboardingProfile = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const saved = await saveProfile(form, me?.hasCpf ? undefined : cpfInput);
      setMe(current =>
        current
          ? {
              ...current,
              profile: saved.profile,
              hasCpf: saved.hasCpf,
              cpfMasked: saved.cpfMasked ?? current.cpfMasked,
              hasSeenProfilePrompt: true,
            }
          : current
      );
      setForm(saved.profile);
      setCpfInput("");
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

  const handleSkipProfile = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await skipProfilePrompt();
      setMe(current => (current ? { ...current, hasSeenProfilePrompt: true } : current));
    } catch (skipError) {
      if (skipError instanceof SessionExpiredError) {
        navigate("/entrar", { replace: true });
        return;
      }
      setError(messageForError(skipError));
    } finally {
      setIsSaving(false);
    }
  };

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

  // Segundo passo do primeiro acesso: o cadastro. Vem DEPOIS dos anos porque
  // marcar caixinhas custa dez segundos e já entrega a estrada; o formulário
  // inteiro na primeira tela seria um paredão antes de qualquer recompensa.
  if (!me.hasSeenProfilePrompt) {
    return (
      <>
        <Header />
        <div style={s.page}>
          <div style={{ ...s.onboardCard, maxWidth: 720 }}>
            <h1 style={s.onboardTitle}>Agora, seus dados</h1>
            <p style={s.onboardHelp}>
              É o mesmo cadastro que a inscrição pede. Preenchendo agora, você não
              precisa digitar tudo de novo depois — e a organização consegue falar com
              você. Se preferir, dá para deixar para outra hora.
            </p>
            {error && <div style={s.error}>{error}</div>}

            <ProfileForm
              value={form}
              onChange={setForm}
              cpfMasked={me.cpfMasked}
              hasCpf={me.hasCpf}
              cpfInput={cpfInput}
              onCpfInputChange={setCpfInput}
              whatsappUrl={whatsappUrl}
            />

            <button
              type="button"
              style={{ ...s.goldButton, ...(isSaving ? s.buttonOff : {}) }}
              onClick={handleSaveOnboardingProfile}
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar meus dados"}
            </button>
            <button
              type="button"
              style={s.ghostButton}
              onClick={handleSkipProfile}
              disabled={isSaving}
            >
              Preencher depois
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
              {[
                { icon: "🥾", value: walkedCount, label: "caminhadas declaradas" },
                { icon: "📅", value: editions.length, label: "edições já realizadas" },
                { icon: "🏅", value: me.badges.length, label: "medalhas conquistadas" },
              ].map(item => (
                <div key={item.label} style={s.stat}>
                  <span style={s.statIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                  <p style={s.statValue}>{item.value}</p>
                  <p style={s.statLabel}>{item.label}</p>
                  <span style={s.statAccent} aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>

          {/* A inscrição vem primeiro entre os cartões: é a única coisa da tela
              com prazo, e prazo perdido não volta. */}
          <InscricaoCard
            me={me}
            whatsappUrl={whatsappUrl}
            onProfileSaved={(profile, hasCpf, cpfMasked) =>
              setMe(current =>
                current ? { ...current, profile, hasCpf, cpfMasked: cpfMasked ?? current.cpfMasked } : current
              )
            }
            onSessionExpired={() => navigate("/entrar", { replace: true })}
          />

          {EDITION_THEMES[me.currentYear] && (
            <div style={s.themeCallout}>
              <div style={s.themeHead}>
                <p style={s.themeLabel}>Tema de {me.currentYear}</p>
                <a href="/medalhas#temas" style={s.themeLink}>
                  Visualizar temas anteriores
                </a>
              </div>
              <p style={s.themeText}>{EDITION_THEMES[me.currentYear]}</p>
            </div>
          )}

          <div style={s.panelDark}>
            <h2 style={s.panelTitleOnDark}>A estrada</h2>
            <p style={s.panelHelpOnDark}>
              Uma pedra por edição, da 1ª ({me.firstEditionYear}) até a{" "}
              {me.currentYear - me.firstEditionYear + 1}ª ({me.currentYear}). As douradas
              são as suas, e a última, apagada, é a próxima: {NEXT_EDITION.date}.
            </p>
            <RoadOfEditions
              editions={editions}
              walkedYears={me.years}
              currentYear={me.currentYear}
              participants={participants}
            />
          </div>

          <div style={s.panelDark}>
            <h2 style={s.panelTitleOnDark}>Suas medalhas</h2>
            <p style={s.panelHelpOnDark}>
              Saem dos anos que você declarou. Para mudar os anos, vá em Perfil.
            </p>

            {me.badges.length === 0 ? (
              <div style={s.emptyDark}>
                Nenhuma medalha ainda. Marque no seu perfil os anos em que você caminhou e
                elas aparecem aqui.
              </div>
            ) : (
              <div style={s.medalGrid}>
                {/* As medalhas de ano viram uma pilha só: dez iguais em fila
                    empurravam para fora da tela justamente as raras. */}
                <YearMedalsGroup badges={me.badges.filter(badge => badge.year !== undefined)} />
                {me.badges
                  .filter(badge => badge.year === undefined)
                  .map(badge => (
                    <Medal
                      key={badge.id}
                      label={badge.label}
                      description={badge.description}
                      tier={badge.tier}
                      symbol={badge.symbol}
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

            <a href="/medalhas" style={s.panelLink}>
              Ver todas as medalhas e os temas de cada ano
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default PeregrinoDashboard;
