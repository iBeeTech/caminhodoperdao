import React from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../../../components";
import YearPicker from "../components/YearPicker";
import { perfilStyles as s } from "./perfil.styles";
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
 */

const CPF_HELP_MESSAGE = "Olá! Preciso corrigir o CPF da minha conta no site.";

const GENDERS = [
  { value: "", label: "Prefiro não informar" },
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "outro", label: "Outro" },
];

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
  const [formSaved, setFormSaved] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isActive = true;
    const load = async () => {
      try {
        const [profile, years] = await Promise.all([fetchMe(), fetchAvailableYears()]);
        if (!isActive) return;
        setMe(profile);
        setForm(profile.profile);
        setSelectedYears(profile.years);
        setAvailable(years.available);
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

  const setField = <K extends keyof PilgrimProfile>(key: K, value: PilgrimProfile[K]) => {
    setFormSaved(false);
    setForm(current => ({ ...current, [key]: value }));
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
            <ReadRow label="Nome" value={me.profile.name} />
            <ReadRow label="Telefone" value={formatPhone(me.profile.phone)} />
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

                <div style={s.grid}>
                  <div style={{ ...s.field, ...s.fieldWide }}>
                    <label style={s.label} htmlFor="name">
                      Nome completo
                    </label>
                    <input
                      id="name"
                      style={s.input}
                      value={form.name}
                      onChange={e => setField("name", e.target.value)}
                      autoComplete="name"
                    />
                  </div>

                  <div style={{ ...s.field, ...s.fieldWide }}>
                    <label style={s.label} htmlFor="cpf">
                      CPF
                    </label>
                    <input
                      id="cpf"
                      style={{ ...s.input, ...(me.hasCpf ? s.inputLocked : {}) }}
                      value={me.hasCpf ? me.cpfMasked ?? "cadastrado" : cpfInput}
                      onChange={e => setCpfInput(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      readOnly={me.hasCpf}
                      inputMode="numeric"
                      placeholder={me.hasCpf ? "" : "somente números"}
                    />
                    <p style={s.hint}>
                      {me.hasCpf
                        ? "Se você precisa editar o CPF entre em contato conosco por WhatsApp"
                        : "O CPF entra uma vez só. Depois, para corrigir, fale conosco por WhatsApp."}
                      {whatsappUrl && (
                        <>
                          {" "}
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={s.hintLink}
                          >
                            Falar no WhatsApp
                          </a>
                        </>
                      )}
                    </p>
                  </div>

                  <div style={s.field}>
                    <label style={s.label} htmlFor="phone">
                      Telefone
                    </label>
                    <input
                      id="phone"
                      style={s.input}
                      value={form.phone}
                      onChange={e => setField("phone", e.target.value.replace(/\D/g, "").slice(0, 11))}
                      inputMode="numeric"
                      placeholder="DDD + número"
                      autoComplete="tel"
                    />
                  </div>

                  <div style={s.field}>
                    <label style={s.label} htmlFor="dateOfBirth">
                      Data de nascimento
                    </label>
                    <input
                      id="dateOfBirth"
                      style={s.input}
                      type="date"
                      value={form.dateOfBirth}
                      onChange={e => setField("dateOfBirth", e.target.value)}
                    />
                  </div>

                  <div style={s.field}>
                    <label style={s.label} htmlFor="gender">
                      Sexo
                    </label>
                    <select
                      id="gender"
                      style={s.input}
                      value={form.gender}
                      onChange={e => setField("gender", e.target.value)}
                    >
                      {GENDERS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={s.field}>
                    <label style={s.label} htmlFor="cep">
                      CEP
                    </label>
                    <input
                      id="cep"
                      style={s.input}
                      value={form.cep}
                      onChange={e => setField("cep", e.target.value.replace(/\D/g, "").slice(0, 8))}
                      inputMode="numeric"
                      autoComplete="postal-code"
                    />
                  </div>

                  <div style={{ ...s.field, ...s.fieldWide }}>
                    <label style={s.label} htmlFor="address">
                      Endereço
                    </label>
                    <input
                      id="address"
                      style={s.input}
                      value={form.address}
                      onChange={e => setField("address", e.target.value)}
                      autoComplete="street-address"
                    />
                  </div>

                  <div style={s.field}>
                    <label style={s.label} htmlFor="number">
                      Número
                    </label>
                    <input
                      id="number"
                      style={s.input}
                      value={form.number}
                      onChange={e => setField("number", e.target.value)}
                    />
                  </div>

                  <div style={s.field}>
                    <label style={s.label} htmlFor="complement">
                      Complemento
                    </label>
                    <input
                      id="complement"
                      style={s.input}
                      value={form.complement}
                      onChange={e => setField("complement", e.target.value)}
                    />
                  </div>

                  <div style={s.field}>
                    <label style={s.label} htmlFor="city">
                      Cidade
                    </label>
                    <input
                      id="city"
                      style={s.input}
                      value={form.city}
                      onChange={e => setField("city", e.target.value)}
                    />
                  </div>

                  <div style={s.field}>
                    <label style={s.label} htmlFor="state">
                      Estado (sigla)
                    </label>
                    <input
                      id="state"
                      style={s.input}
                      value={form.state}
                      onChange={e =>
                        setField(
                          "state",
                          e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2)
                        )
                      }
                      placeholder="MG"
                    />
                  </div>

                  <div style={s.field}>
                    <label style={s.label} htmlFor="emergencyContactName">
                      Contato de emergência
                    </label>
                    <input
                      id="emergencyContactName"
                      style={s.input}
                      value={form.emergencyContactName}
                      onChange={e => setField("emergencyContactName", e.target.value)}
                    />
                  </div>

                  <div style={s.field}>
                    <label style={s.label} htmlFor="emergencyContactPhone">
                      Telefone da emergência
                    </label>
                    <input
                      id="emergencyContactPhone"
                      style={s.input}
                      value={form.emergencyContactPhone}
                      onChange={e =>
                        setField(
                          "emergencyContactPhone",
                          e.target.value.replace(/\D/g, "").slice(0, 11)
                        )
                      }
                      inputMode="numeric"
                    />
                  </div>

                  <div style={{ ...s.field, ...s.fieldWide }}>
                    <div style={s.checkRow}>
                      <input
                        id="hasAllergyMedication"
                        type="checkbox"
                        checked={form.hasAllergyMedication}
                        onChange={e => setField("hasAllergyMedication", e.target.checked)}
                      />
                      <label style={s.label} htmlFor="hasAllergyMedication">
                        Tenho alergia ou uso medicação
                      </label>
                    </div>
                    {form.hasAllergyMedication && (
                      <input
                        style={s.input}
                        value={form.allergyMedicationDetails}
                        onChange={e => setField("allergyMedicationDetails", e.target.value)}
                        placeholder="Qual alergia / qual medicação"
                        aria-label="Detalhes da alergia ou medicação"
                      />
                    )}
                  </div>

                  <div style={{ ...s.field, ...s.fieldWide }}>
                    <div style={s.checkRow}>
                      <input
                        id="hasDietaryRestriction"
                        type="checkbox"
                        checked={form.hasDietaryRestriction}
                        onChange={e => setField("hasDietaryRestriction", e.target.checked)}
                      />
                      <label style={s.label} htmlFor="hasDietaryRestriction">
                        Tenho restrição alimentar
                      </label>
                    </div>
                    {form.hasDietaryRestriction && (
                      <input
                        style={s.input}
                        value={form.dietaryRestrictionDetails}
                        onChange={e => setField("dietaryRestrictionDetails", e.target.value)}
                        placeholder="Qual restrição"
                        aria-label="Detalhes da restrição alimentar"
                      />
                    )}
                  </div>
                </div>

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

/** (16) 99999-9999 — só para leitura; o campo de digitar guarda só números. */
function formatPhone(digits: string): string {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

export default PeregrinoPerfil;
