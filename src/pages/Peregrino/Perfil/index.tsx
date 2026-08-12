import React from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../../components";
import YearPicker from "../components/YearPicker";
import ProfileForm from "../components/ProfileForm";
import { AcolhimentoFields, emptyHostingInput, hostingInputFrom } from "../components/Acolhimento";
import { formatPhoneBR } from "../../../utils/formatters/phone";
import PhotoUploader from "../components/PhotoUploader";
import { perfilStyles as s } from "./perfil.styles";
import {
  EMPTY_PROFILE,
  HostingInput,
  Me,
  MyHosting,
  PilgrimProfile,
  SessionExpiredError,
  cancelHosting,
  fetchAvailableYears,
  fetchMe,
  fetchMyHosting,
  fetchWhatsappUrl,
  messageForError,
  saveHosting,
  saveProfile,
  saveYears,
} from "../api";

/**
 * `/perfil` — os dados da pessoa.
 *
 * Três blocos, do mais usado para o menos usado:
 *
 * 1. **Seus dados** — nome, telefone e e-mail, só de leitura. É o que a pessoa
 *    vem conferir.
 * 2. **Anos que participei** — a mesma pergunta do primeiro acesso, agora
 *    guardada atrás de um clique, porque muda uma vez por ano.
 * 3. **Dados do formulário** — o cadastro inteiro, que a inscrição vai
 *    reaproveitar. Tudo editável, MENOS o CPF: é ele que liga a conta ao
 *    histórico e ao pagamento, então correção passa pela organização.
 *
 * O **acolhimento** mora no bloco 3, junto do endereço: quem é de Franca ou
 * Claraval decide aqui, a qualquer momento, se quer receber peregrinos de fora
 * — sem depender de estar no meio de uma inscrição.
 *
 * ⚠️ A elegibilidade vem do SERVIDOR, pela cidade JÁ SALVA. Quem acabou de
 * digitar "Franca" no campo só vê o bloco depois de salvar: a regra de quais
 * cidades valem mora num lugar só, e repeti-la aqui as faria divergir.
 */

const CPF_HELP_MESSAGE = "Olá! Preciso corrigir o CPF da minha conta no site.";

interface ReadRowProps {
  label: string;
  value: string;
}

const ReadRow: React.FC<ReadRowProps> = ({ label, value }) => (
  <div style={s.readRow}>
    <p style={s.readLabel}>{label}</p>
    <p style={{ ...s.readValue, ...(value ? {} : s.readEmpty) }}>{value || "não informado"}</p>
  </div>
);

const PeregrinoPerfil: React.FC = () => {
  const navigate = useNavigate();

  const [me, setMe] = React.useState<Me | null>(null);
  const [available, setAvailable] = React.useState<number[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = React.useState<string | null>(null);

  const [isYearsOpen, setIsYearsOpen] = React.useState(false);
  const [selectedYears, setSelectedYears] = React.useState<number[]>([]);
  const [isSavingYears, setIsSavingYears] = React.useState(false);
  const [yearsSaved, setYearsSaved] = React.useState(false);

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<PilgrimProfile>(EMPTY_PROFILE);
  const [cpfInput, setCpfInput] = React.useState("");
  const [isSavingForm, setIsSavingForm] = React.useState(false);

  // Acolhimento (migration 038). `wantsHosting` é a caixinha "quero receber".
  const [hosting, setHosting] = React.useState<MyHosting | null>(null);
  const [wantsHosting, setWantsHosting] = React.useState(false);
  const [hostingForm, setHostingForm] = React.useState<HostingInput | null>(null);
  const [formSaved, setFormSaved] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        const [profile, years, myHosting] = await Promise.all([
          fetchMe(),
          fetchAvailableYears(),
          fetchMyHosting(),
        ]);
        if (!isActive) return;
        setMe(profile);
        setForm(profile.profile);
        setSelectedYears(profile.years);
        setAvailable(years.available);
        applyHosting(myHosting);
      } catch (loadError) {
        if (!isActive) return;
        if (loadError instanceof SessionExpiredError) {
          navigate("/entrar", { replace: true });
          return;
        }
        setError("Não foi possível carregar seu perfil.");
      }
    };
    load();
    fetchWhatsappUrl(CPF_HELP_MESSAGE).then(url => {
      if (isActive) setWhatsappUrl(url);
    });
    return () => {
      isActive = false;
    };
  }, [navigate]);

  /** Põe o bloco do acolhimento no estado em que o servidor diz que ele está. */
  const applyHosting = (next: MyHosting) => {
    setHosting(next);
    const active = next.offer && next.offer.status === "ATIVO" ? next.offer : null;
    setWantsHosting(active !== null);
    setHostingForm(active ? hostingInputFrom(active) : emptyHostingInput(next));
  };

  const handleSaveYears = async () => {
    setIsSavingYears(true);
    setError(null);
    try {
      const saved = await saveYears(selectedYears);
      setMe(current =>
        current
          ? { ...current, years: saved.years, badges: saved.badges, nextBadge: saved.nextBadge }
          : current
      );
      setSelectedYears(saved.years);
      setYearsSaved(true);
    } catch (saveError) {
      if (saveError instanceof SessionExpiredError) {
        navigate("/entrar", { replace: true });
        return;
      }
      setError(messageForError(saveError));
    } finally {
      setIsSavingYears(false);
    }
  };

  const handleSaveForm = async () => {
    setIsSavingForm(true);
    setFormError(null);
    try {
      const saved = await saveProfile(form, me?.hasCpf ? undefined : cpfInput);
      setMe(current =>
        current
          ? {
              ...current,
              profile: saved.profile,
              hasCpf: saved.hasCpf,
              cpfMasked: saved.cpfMasked ?? current.cpfMasked,
            }
          : current
      );
      setForm(saved.profile);
      setCpfInput("");

      /**
       * O acolhimento vai DEPOIS do perfil, de propósito: o servidor confere a
       * elegibilidade pela cidade JÁ GRAVADA. Se fosse antes, quem acabou de
       * mudar a cidade para Franca no mesmo salvamento levaria um
       * "not_eligible_city" por causa da cidade velha.
       */
      if (hosting?.eligible && hostingForm) {
        if (wantsHosting) {
          await saveHosting(hostingForm);
        } else if (hosting.offer && hosting.offer.status === "ATIVO") {
          // Só cancela o que existe. Chamar o DELETE sem oferta devolveria
          // `no_hosting_offer`, e engolir esse erro engoliria os outros junto.
          await cancelHosting();
        }
      }
      // Relê do servidor: é ele quem sabe se a mudança de cidade abriu (ou
      // fechou) o acolhimento para esta pessoa.
      applyHosting(await fetchMyHosting());

      setFormSaved(true);
    } catch (saveError) {
      if (saveError instanceof SessionExpiredError) {
        navigate("/entrar", { replace: true });
        return;
      }
      setFormError(messageForError(saveError));
    } finally {
      setIsSavingForm(false);
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

  return (
    <>
      <Header />
      <div style={s.page}>
        <div style={s.shell}>
          <p style={s.eyebrow}>Sua conta</p>
          <h1 style={s.pageTitle}>Perfil</h1>

          {error && <div style={s.error}>{error}</div>}

          <section style={s.card}>
            <h2 style={s.cardTitle}>Seus dados</h2>
            <p style={s.cardHelp}>
              É assim que a organização fala com você. Para mudar, use "Atualizar dados do
              formulário" abaixo.
            </p>
            <PhotoUploader
              photoUpdatedAt={me.photoUpdatedAt}
              fallbackInitial={(me.profile.name.trim()[0] || me.email[0] || "P").toUpperCase()}
              onChanged={photoUpdatedAt =>
                setMe(current => (current ? { ...current, photoUpdatedAt } : current))
              }
              onSessionExpired={() => navigate("/entrar", { replace: true })}
            />

            <div style={{ height: 18 }} />

            <ReadRow label="Nome" value={me.profile.name} />
            <ReadRow label="Telefone" value={formatPhoneBR(me.profile.phone)} />
            <ReadRow label="E-mail" value={me.email} />
          </section>

          <section style={s.card}>
            <button
              type="button"
              style={s.disclosure}
              onClick={() => setIsYearsOpen(open => !open)}
              aria-expanded={isYearsOpen}
            >
              <span>
                <span style={{ ...s.cardTitle, display: "block" }}>
                  Editar anos que participei
                </span>
                <span style={{ ...s.cardHelp, display: "block", margin: 0 }}>
                  {me.years.length === 0
                    ? "Nenhum ano marcado."
                    : `Hoje: ${[...me.years].sort((a, b) => b - a).join(", ")}.`}
                </span>
              </span>
              <span style={s.disclosureIcon}>{isYearsOpen ? "fechar ▴" : "editar ▾"}</span>
            </button>

            {isYearsOpen && (
              <div style={{ marginTop: 18 }}>
                <p style={s.cardHelp}>
                  Marque as edições de que você participou. Você mesmo informa — não temos
                  como conferir, então conte com sinceridade.
                </p>
                <YearPicker
                  available={available}
                  selected={selectedYears}
                  onToggle={year => {
                    setYearsSaved(false);
                    setSelectedYears(current =>
                      current.includes(year)
                        ? current.filter(y => y !== year)
                        : [...current, year]
                    );
                  }}
                />
                {yearsSaved && <div style={s.ok}>Anos salvos.</div>}
                <button
                  type="button"
                  style={{ ...s.goldButton, ...(isSavingYears ? s.buttonOff : {}) }}
                  onClick={handleSaveYears}
                  disabled={isSavingYears}
                >
                  {isSavingYears ? "Salvando..." : "Salvar meus anos"}
                </button>
              </div>
            )}
          </section>

          <section style={s.card}>
            <button
              type="button"
              style={s.disclosure}
              onClick={() => setIsFormOpen(open => !open)}
              aria-expanded={isFormOpen}
            >
              <span>
                <span style={{ ...s.cardTitle, display: "block" }}>
                  Atualizar dados do formulário
                </span>
                <span style={{ ...s.cardHelp, display: "block", margin: 0 }}>
                  Endereço, contato de emergência e saúde. É o que a inscrição vai usar.
                </span>
              </span>
              <span style={s.disclosureIcon}>{isFormOpen ? "fechar ▴" : "editar ▾"}</span>
            </button>

            {isFormOpen && (
              <div style={{ marginTop: 18 }}>
                {formError && <div style={s.error}>{formError}</div>}

                <ProfileForm
                  value={form}
                  onChange={next => {
                    setFormSaved(false);
                    setForm(next);
                  }}
                  cpfMasked={me.cpfMasked}
                  hasCpf={me.hasCpf}
                  cpfInput={cpfInput}
                  onCpfInputChange={setCpfInput}
                  whatsappUrl={whatsappUrl}
                />

                {hosting?.eligible && hostingForm && (
                  <AcolhimentoFields
                    hosting={hosting}
                    enabled={wantsHosting}
                    onToggle={next => {
                      setFormSaved(false);
                      setWantsHosting(next);
                    }}
                    value={hostingForm}
                    onChange={next => {
                      setFormSaved(false);
                      setHostingForm(next);
                    }}
                    disabled={isSavingForm}
                  />
                )}

                {formSaved && <div style={s.ok}>Dados salvos.</div>}

                <button
                  type="button"
                  style={{ ...s.primaryButton, ...(isSavingForm ? s.buttonOff : {}) }}
                  onClick={handleSaveForm}
                  disabled={isSavingForm}
                >
                  {isSavingForm ? "Salvando..." : "Salvar meus dados"}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
};


export default PeregrinoPerfil;
