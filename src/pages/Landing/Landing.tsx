import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import { LandingController } from "../../controllers/LandingController";
import { LandingContent } from "../../models/LandingModels";
import "./Landing.css";
import assis from "../../assets/assis.png";

const Landing: React.FC = () => {
  const [content, setContent] = useState<LandingContent | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [city, setCity] = useState("");
  const [stateUf, setStateUf] = useState("");
  const [sleepAtMonastery, setSleepAtMonastery] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "warn" | "error" | null>(null);
  const [qrCodeText, setQrCodeText] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availability, setAvailability] = useState({
    loading: true,
    error: "",
    totalFull: false,
    monasteryFull: false,
  });
  const [phase, setPhase] = useState<"check" | "form" | "status">("check");
  const [existingData, setExistingData] = useState<{
    name?: string;
    status?: string;
    expired?: boolean;
    qrCodeText?: string | null;
    payment_ref?: string | null;
    sleep_at_monastery?: number;
    phone?: string;
    cep?: string;
    address?: string;
    number?: string;
    complement?: string | null;
    city?: string;
    state?: string;
  } | null>(null);
  const [capacityCallout, setCapacityCallout] = useState<string | null>(null);

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  const formatPhoneDigits = (digits: string) => {
    const sanitized = digits.replace(/\D/g, "").slice(0, 11);
    if (!sanitized) return "";

    if (sanitized.length <= 2) {
      // Fecha o parêntese assim que tiver 2 dígitos, mas permite voltar apagando.
      return `(${sanitized}${sanitized.length === 2 ? ")" : ""}`;
    }

    const ddd = sanitized.slice(0, 2);
    const body = sanitized.slice(2);
    const first = body.slice(0, 1);
    const rest = body.slice(1);

    let out = `(${ddd})`;
    if (first) out += ` ${first}`;

    if (rest.length <= 4) {
      out += rest;
    } else {
      out += `${rest.slice(0, 4)}-${rest.slice(4, 8)}`;
    }

    return out;
  };

  const maskCep = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (!digits) return "";
    const match = digits.match(/(\d{0,2})(\d{0,3})(\d{0,3})/);
    if (!match) return "";
    const [, p1, p2, p3] = match;
    let out = "";
    if (p1) out += p1;
    if (p2) out += `.${p2}`;
    if (p3) out += `-${p3}`;
    return out;
  };

  useEffect(() => {
    // Carrega o conteúdo através do controller
    const landingContent = LandingController.getLandingContent();
    setContent(landingContent);
  }, []);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await fetch("/api/register");
        if (!res.ok) throw new Error("unavailable");
        const data = await res.json();
        setAvailability({
          loading: false,
          error: "",
          totalFull: !!data.totalFull,
          monasteryFull: !!data.monasteryFull,
        });
      } catch (error) {
        setAvailability(prev => ({ ...prev, loading: false, error: "Não foi possível verificar vagas agora." }));
      }
    };
    fetchAvailability();
  }, []);

  if (!content) {
    return <div className="loading">Carregando...</div>;
  }

  const handlePrimaryAction = () => {
    LandingController.trackUserInteraction("click", "primary-hero-button");
    LandingController.handlePrimaryAction();
    document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSecondaryAction = () => {
    LandingController.trackUserInteraction("click", "secondary-hero-button");
    LandingController.handleSecondaryAction();
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCallToAction = () => {
    LandingController.trackUserInteraction("click", "cta-button");
    LandingController.handleCallToAction();
    document.getElementById("registration-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const renderStars = (rating: number) => {
    return Array(rating)
      .fill(0)
      .map((_, index) => (
        <span key={index} className="star">
          ⭐
        </span>
      ));
  };

  return (
    <div className="landing-page">
      <Header />

      {/* Hero Section */}
      <section className="hero-section" id="home">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">{content.hero.title}</h1>
            <h2 className="hero-subtitle">{content.hero.subtitle}</h2>
            <p className="hero-description">{content.hero.description}</p>
            <div className="hero-actions">
              <button
                className="btn-primary-large"
                onClick={handlePrimaryAction}
              >
                {content.hero.primaryButtonText}
              </button>
              <button
                className="btn-secondary-large"
                onClick={handleSecondaryAction}
              >
                {content.hero.secondaryButtonText}
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-image-placeholder">
              <img src={assis} alt="Assis" className="hero-image" />
            </div>
          </div>
        </div>
      </section>

      {/* Registration Section */}
      <section className="signup-section" id="registration-form">
        <div className="container">
          <div className="signup-card">
            <div className="signup-header">
              <h2>Confira sua inscrição ou Inscreva-se para o Caminho</h2>
              <ul className="signup-bullets">
                <li>Se você já se inscreveu, verifique o status. Se ainda não se inscreveu, preencha os dados para gerar seu PIX.</li>
                <li>Se você já se inscreveu, consulte o status de sua inscrição usando exatamente o mesmo e-mail.</li>
              </ul>
            </div>
            {capacityCallout && <div className="callout warning">{capacityCallout}</div>}
            {availability.totalFull && phase !== "status" && !capacityCallout && (
              <div className="callout warning">
                As inscrições estão esgotadas no momento. Se alguém desistir, uma vaga pode ser reaberta — volte mais tarde.
              </div>
            )}

            {phase === "check" && !availability.totalFull && (
              <form
                className="signup-form"
                noValidate
                onSubmit={async event => {
                  event.preventDefault();
                  setStatusMessage(null);
                  setQrCodeText(null);
                  setCurrentStatus(null);
                  setErrors({});
                  setLoading(true);
                  try {
                    const newErrors: Record<string, string> = {};
                    if (!name.trim()) newErrors.name = "Obrigatório";
                    if (!email.trim()) newErrors.email = "Obrigatório";
                    else if (!emailRegex.test(email)) newErrors.email = "Email inválido";

                    if (Object.keys(newErrors).length > 0) {
                      setErrors(newErrors);
                      return;
                    }
                    const res = await fetch(`/api/status?email=${encodeURIComponent(email)}`);
                    const data = await res.json();
                    if (!data.exists) {
                      setStatusMessage(null);
                      setStatusTone(null);
                      setPhase("form");
                    } else {
                      setExistingData(data);
                      setName(data.name || name);
                      setPhone(data.phone || phone);
                      setCep(data.cep || cep);
                      setAddress(data.address || address);
                      setNumber(data.number || number);
                      setComplement(data.complement || "");
                      setCity(data.city || city);
                      setStateUf(data.state || stateUf);
                      setSleepAtMonastery(data.sleep_at_monastery === 1 ? "yes" : "no");
                      setCurrentStatus(data.status || null);
                      setQrCodeText(data.qrCodeText || null);
                      if (data.status === "PAID") {
                        setStatusMessage(data.message || "Sua inscrição já está confirmada.");
                        setStatusTone("success");
                        setPhase("status");
                        return;
                      }
                      if (data.expired || data.status === "CANCELED") {
                        setStatusMessage("Pix expirado. Edite para reenviar.");
                        setStatusTone("error");
                        setPhase("status");
                      } else if (data.status === "PENDING") {
                        setStatusMessage("Pagamento pendente. Use o PIX abaixo.");
                        setStatusTone("warn");
                        setPhase("status");
                      }
                    }
                  } catch (error) {
                    setStatusMessage("Não foi possível verificar agora. Tente novamente.");
                    setStatusTone("error");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <div className="form-group">
                  <label htmlFor="name">Nome completo</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    placeholder="Seu nome"
                  />
                  {errors.name && <span className="input-error">{errors.name}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    placeholder="seu@email.com"
                  />
                  {errors.email && <span className="input-error">{errors.email}</span>}
                </div>
                <button className="btn-submit" type="submit" disabled={loading || availability.totalFull}>
                  {loading ? "Verificando..." : "Verificar inscrição ou Inscrever-se"}
                </button>
              </form>
            )}

            {phase === "form" && !availability.totalFull && (
              <form
                className="signup-form"
                noValidate
                onSubmit={async event => {
                  event.preventDefault();
                  setStatusMessage(null);
                  setQrCodeText(null);
                  setCurrentStatus(null);
                  setErrors({});
                  setLoading(true);
                  try {
                    const missing = [
                      { key: "name", label: "Nome", valid: !!name.trim(), message: "Obrigatório" },
                      {
                        key: "email",
                        label: "Email",
                        valid: !!email.trim() && emailRegex.test(email),
                        message: "Email inválido",
                      },
                      {
                        key: "phone",
                        label: "WhatsApp",
                        valid: phone.replace(/\D/g, "").length === 11,
                        message: "Informe DDD + 9 dígitos",
                      },
                      {
                        key: "cep",
                        label: "CEP",
                        valid: cep.replace(/\D/g, "").length === 8,
                        message: "CEP inválido",
                      },
                      { key: "address", label: "Endereço", valid: !!address.trim(), message: "Obrigatório" },
                      { key: "number", label: "Número", valid: !!number.trim(), message: "Obrigatório" },
                      { key: "city", label: "Cidade", valid: !!city.trim(), message: "Obrigatório" },
                      { key: "state", label: "Estado", valid: !!stateUf.trim(), message: "Obrigatório" },
                      {
                        key: "sleepAtMonastery",
                        label: "Dormir no Mosteiro",
                        valid: sleepAtMonastery === "yes" || sleepAtMonastery === "no",
                        message: "Selecione uma opção",
                      },
                    ];

                    const newErrors: Record<string, string> = {};
                    missing.forEach(field => {
                      if (!field.valid) newErrors[field.key] = field.message;
                    });
                    const alreadySleeper = existingData?.sleep_at_monastery === 1;
                    if (sleepAtMonastery === "yes" && availability.monasteryFull && !alreadySleeper) {
                      newErrors.sleepAtMonastery = "Vagas no mosteiro esgotadas";
                    }
                    if (Object.keys(newErrors).length > 0) {
                      setErrors(newErrors);
                      setStatusMessage("Preencha os campos obrigatórios.");
                      setStatusTone("error");
                      return;
                    }

                    const response = await fetch("/api/register", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name,
                        email,
                        phone,
                        cep,
                        address,
                        number,
                        complement,
                        city,
                        state: stateUf,
                        sleepAtMonastery: sleepAtMonastery === "yes",
                      }),
                    });

                    if (response.ok) {
                      const data = await response.json();
                      setCurrentStatus(data.status);
                      setQrCodeText(data.qrCodeText);
                      setStatusMessage("Sua inscrição será finalizada quando você realizar o pagamento do PIX.");
                      setStatusTone("warn");
                      setPhase("status");
                    } else if (response.status === 409) {
                      const statusRes = await fetch(`/api/status?email=${encodeURIComponent(email)}`);
                      const statusData = await statusRes.json();
                      setExistingData(statusData);
                      setCurrentStatus(statusData.status || null);
                      setQrCodeText(statusData.qrCodeText || null);
                      if (statusData.status === "PAID") {
                        setStatusMessage("Sua inscrição já está confirmada.");
                        setStatusTone("success");
                      } else if (statusData.status === "PENDING") {
                        setStatusMessage("Inscrição pendente. Você pode usar o PIX abaixo.");
                        setStatusTone("warn");
                      } else {
                        setStatusMessage("Inscrição existente.");
                        setStatusTone(null);
                      }
                      setPhase("status");
                    } else {
                      setStatusMessage("Não foi possível processar. Tente novamente.");
                      setStatusTone("error");
                    }
                  } catch (error) {
                    setStatusMessage("Erro de rede. Tente novamente.");
                    setStatusTone("error");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <div className="form-group">
                  <label htmlFor="name">Nome completo</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={event => setName(event.target.value)}
                    required
                    placeholder="Seu nome"
                  />
                  {errors.name && <span className="input-error">{errors.name}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    required
                    placeholder="seu@email.com"
                  />
                  {errors.email && <span className="input-error">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="phone">WhatsApp</label>
                  <input
                    id="phone"
                    type="text"
                    value={phone}
                    onKeyDown={event => {
                      if (event.key === "Backspace") {
                        const cursorEnd = (event.target as HTMLInputElement).selectionEnd;
                        const cursorStart = (event.target as HTMLInputElement).selectionStart;
                        const atEnd = cursorEnd === phone.length && cursorStart === cursorEnd;
                        const endsWithParen = phone.endsWith(")");
                        if (atEnd && endsWithParen) {
                          event.preventDefault();
                          const digits = phone.replace(/\D/g, "");
                          setPhone(formatPhoneDigits(digits.slice(0, -1)));
                          return;
                        }
                      }
                    }}
                    onChange={event => setPhone(formatPhoneDigits(event.target.value))}
                    required
                    placeholder="(DDD) 9XXXX-XXXX"
                  />
                  {errors.phone && <span className="input-error">{errors.phone}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="cep">CEP</label>
                  <input
                    id="cep"
                    type="text"
                    value={cep}
                    onChange={event => setCep(maskCep(event.target.value))}
                    required
                    placeholder="00.000-000"
                  />
                  {errors.cep && <span className="input-error">{errors.cep}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="address">Endereço</label>
                  <input
                    id="address"
                    type="text"
                    value={address}
                    onChange={event => setAddress(event.target.value)}
                    required
                    placeholder="Rua, avenida, etc"
                  />
                  {errors.address && <span className="input-error">{errors.address}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="number">Número</label>
                  <input
                    id="number"
                    type="text"
                    value={number}
                    onChange={event => setNumber(event.target.value)}
                    required
                    placeholder="123"
                  />
                  {errors.number && <span className="input-error">{errors.number}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="complement">Complemento</label>
                  <input
                    id="complement"
                    type="text"
                    value={complement}
                    onChange={event => setComplement(event.target.value)}
                    placeholder="Apartamento, bloco, etc"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="city">Cidade</label>
                  <input
                    id="city"
                    type="text"
                    value={city}
                    onChange={event => setCity(event.target.value)}
                    required
                    placeholder="Sua cidade"
                  />
                  {errors.city && <span className="input-error">{errors.city}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="state">Estado</label>
                  <input
                    id="state"
                    type="text"
                    value={stateUf}
                    onChange={event => setStateUf(event.target.value.toUpperCase())}
                    required
                    maxLength={2}
                    placeholder="UF"
                  />
                  {errors.state && <span className="input-error">{errors.state}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="sleepAtMonastery">Irá dormir no Mosteiro?</label>
                  {availability.monasteryFull && existingData?.sleep_at_monastery !== 1 ? (
                    <div className="monastery-full-note">
                      Não há mais vagas para dormir no Mosteiro. Para saber se alguma vaga abriu, entre em contato conosco via WhatsApp.
                    </div>
                  ) : (
                    <select
                      id="sleepAtMonastery"
                      value={sleepAtMonastery}
                      onChange={event => setSleepAtMonastery(event.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Selecione
                      </option>
                      <option value="yes" disabled={availability.monasteryFull && existingData?.sleep_at_monastery !== 1}>
                        {availability.monasteryFull && existingData?.sleep_at_monastery !== 1
                          ? "Sim (sem vagas)"
                          : "Sim"}
                      </option>
                      <option value="no">Não</option>
                    </select>
                  )}
                  {errors.sleepAtMonastery && <span className="input-error">{errors.sleepAtMonastery}</span>}
                </div>
                  <button className="btn-submit" type="submit" disabled={loading}>
                    {loading ? "Enviando..." : "Verificar inscrição ou Inscrever-se"}
                </button>
              </form>
            )}

            {phase === "status" && (
              <>
                {statusMessage && <div className={`status-message ${statusTone ? `status-${statusTone}` : ""}`}>
                  {statusMessage}
                </div>}

                {currentStatus === "PENDING" && (
                  <div className="pix-box">
                    <p className="pix-label">Copia e Cola do PIX</p>
                    <textarea readOnly value={qrCodeText || "Aguardando"} />
                  </div>
                )}

                {(currentStatus === "CANCELED" || existingData?.expired) && (
                  <div className="pix-box">
                    <p className="pix-label">PIX expirado</p>
                    <div className="pix-actions">
                      <button
                        className="btn-primary"
                        onClick={async () => {
                          setCapacityCallout(null);
                          setLoading(true);
                          try {
                            const res = await fetch("/api/register");
                            const data = await res.json();
                            if (data.totalFull) {
                              setCapacityCallout("As inscrições estão esgotadas no momento. Volte mais tarde.");
                              return;
                            }
                            setPhase("form");
                          } catch (error) {
                            setStatusMessage("Não foi possível validar vagas agora.");
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        Refazer inscrição
                      </button>
                    </div>
                  </div>
                )}

                {currentStatus === "PAID" && (
                  <>
                    <div className="paid-box">Pagamento confirmado. Nos vemos no evento!</div>
                    <div className="signup-warning-note">
                      <span className="signup-warning-icon">⚠️</span>
                      <span>Se você quiser cancelar sua inscrição ou alterá-la, entre em contato conosco via WhatsApp.</span>
                    </div>
                  </>
                )}
              </>
            )}

          </div>
        </div>
      </section>

      <section className="schedule-section" id="schedule">
        <div className="container">
          <div className="schedule-card">
            <h2>Cronograma</h2>
            <p className="schedule-note">⚠️ Lembrete: no dia da caminhada, antes de iniciá-la, fazemos um café comunitário. Leve um bolo, pão, pão de queijo ou o que quiser para somar na refeição.</p>

            <div className="schedule-block">
              <h3>📅 Confissão - 01/08/2026 (Sábado)</h3>
              <ul className="schedule-list">
                <li>Disponível a partir das 14h</li>
              </ul>
            </div>

            <div className="schedule-block">
              <h4>🛏️ Para quem for dormir no Mosteiro</h4>
              <ul className="schedule-list">
                <li>Abertura dos quartos às 17h30</li>
                <li>Janta às 19h</li>
              </ul>
            </div>

            <div className="schedule-block">
              <h4>🚶 No dia da Caminhada</h4>
              <ul className="schedule-list">
                <li>Café Comunitário às 03h00</li>
                <li>Alongamento e aquecimento às 04h00</li>
                <li>Oração Inicial e saída às 04h30</li>
                <li>Chegada prevista às 14h</li>
                <li>Missa após a chegada</li>
                <li>Almoço após a Missa</li>
              </ul>
            </div>

            <div className="schedule-block">
              <h4>🗺️ Distância e paradas</h4>
              <p>Serão 25 km com várias paradas para hidratação e frutas. No meio do caminho, fazemos uma parada estratégica para repor as energias com um lanche reforçado.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Nossa História Section */}
      <section className="history-section" id="about">
        <div className="container">
          <h2 className="section-title">Nossa História</h2>
          <p className="history-text">
            O Caminho do Perdão nasceu do desejo de ajudar pessoas a encontrarem paz interior, reconciliação e propósito.
            Combinamos práticas de autoconhecimento, espiritualidade e relações saudáveis para guiar cada participante em uma
            jornada de cura e transformação.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">
            Por que escolher o Caminho do Perdão?
          </h2>
          <div className="features-grid">
            {content.features.map(feature => (
              <div
                key={feature.id}
                className="feature-card"
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">{content.callToAction.title}</h2>
            <p className="cta-description">
              {content.callToAction.description}
            </p>
            <button className="btn-cta" onClick={handleCallToAction}>
              {content.callToAction.buttonText}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" id="contact">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>Caminho do Perdão</h3>
              <p>Transformando vidas através do perdão e autoconhecimento.</p>
            </div>
            <div className="footer-section">
              <h4>Contato</h4>
              <p>Email: contato@caminhodoperdao.com</p>
              <p>Telefone: (11) 99999-9999</p>
            </div>
            <div className="footer-section">
              <h4>Redes sociais</h4>
              <ul className="footer-social">
                <li>
                  <a href="https://www.instagram.com/caminhadadoperdaodeassis/" className="social-icon instagram" target="_blank" rel="noreferrer">
                    <span className="sr-only">Instagram</span>
                  </a>
                </li>
                <li>
                  <a href="https://www.facebook.com/MosteirodeClaraval" className="social-icon facebook" target="_blank" rel="noreferrer">
                    <span className="sr-only">Facebook</span>
                  </a>
                </li>
                <li>
                  <a href="https://wa.me/5511999999999" className="social-icon whatsapp" target="_blank" rel="noreferrer">
                    <span className="sr-only">WhatsApp</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2007 Caminho do Perdão. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
