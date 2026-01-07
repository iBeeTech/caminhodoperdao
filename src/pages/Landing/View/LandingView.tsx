import React, { ChangeEvent, FormEvent, RefObject } from "react";
import Header from "../../../components/Header";
import assis from "../../../assets/assis.png";
import {
  AvailabilityState,
  LandingContent,
  LandingPhase,
  LandingTone,
} from "../Model";
import "./LandingView.css";

interface LandingViewProps {
  content: LandingContent;
  availability: AvailabilityState;
  phase: LandingPhase;
  errors: Record<string, string>;
  statusMessage: string | null;
  statusTone: LandingTone;
  currentStatus: string | null;
  qrCodeText: string | null;
  capacityCallout: string | null;
  isCheckingStatus: boolean;
  isSubmittingRegistration: boolean;
  isSleepLocked: boolean;
  refs: {
    nameRef: RefObject<HTMLInputElement | null>;
    emailRef: RefObject<HTMLInputElement | null>;
    phoneRef: RefObject<HTMLInputElement | null>;
    cepRef: RefObject<HTMLInputElement | null>;
    addressRef: RefObject<HTMLInputElement | null>;
    numberRef: RefObject<HTMLInputElement | null>;
    complementRef: RefObject<HTMLInputElement | null>;
    cityRef: RefObject<HTMLInputElement | null>;
    stateRef: RefObject<HTMLInputElement | null>;
    sleepAtMonasteryRef: RefObject<HTMLSelectElement | null>;
  };
  onCheckStatus: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitRegistration: (event: FormEvent<HTMLFormElement>) => void;
  onPhoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onCepChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onCallToAction: () => void;
  onReopenRegistration: () => void;
}

const renderStars = (rating: number) =>
  Array(rating)
    .fill(0)
    .map((_, index) => (
      <span key={index} className="star">
        ⭐
      </span>
    ));

const LandingView: React.FC<LandingViewProps> = ({
  content,
  availability,
  phase,
  errors,
  statusMessage,
  statusTone,
  currentStatus,
  qrCodeText,
  capacityCallout,
  isCheckingStatus,
  isSubmittingRegistration,
  isSleepLocked,
  refs,
  onCheckStatus,
  onSubmitRegistration,
  onPhoneChange,
  onCepChange,
  onPrimaryAction,
  onSecondaryAction,
  onCallToAction,
  onReopenRegistration,
}) => {
  const hasAvailabilityError = Boolean(availability.error);
  const {
    nameRef,
    emailRef,
    phoneRef,
    cepRef,
    addressRef,
    numberRef,
    complementRef,
    cityRef,
    stateRef,
    sleepAtMonasteryRef,
  } = refs;

  return (
    <div className="landing-page">
      <Header />

      <section className="hero-section" id="home">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">{content.hero.title}</h1>
            <h2 className="hero-subtitle">{content.hero.subtitle}</h2>
            <p className="hero-description">{content.hero.description}</p>
            <div className="hero-actions">
              <button className="btn-primary-large" onClick={onPrimaryAction}>
                {content.hero.primaryButtonText}
              </button>
              <button className="btn-secondary-large" onClick={onSecondaryAction}>
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
            {hasAvailabilityError && (
              <div className="callout warning">Algo de errado aconteceu, volte mais tarde para realizar sua inscrição!</div>
            )}
            {availability.totalFull && phase !== "status" && !capacityCallout && (
              <div className="callout warning">
                As inscrições estão esgotadas no momento. Se alguém desistir, uma vaga pode ser reaberta — volte mais tarde.
              </div>
            )}

            {!hasAvailabilityError && phase === "check" && !availability.totalFull && (
              <form className="signup-form" noValidate onSubmit={onCheckStatus}>
                <div className="form-group">
                  <label htmlFor="name">Nome completo</label>
                  <input id="name" name="name" type="text" placeholder="Seu nome" ref={nameRef} />
                  {errors.name && <span className="input-error">{errors.name}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" placeholder="seu@email.com" ref={emailRef} />
                  {errors.email && <span className="input-error">{errors.email}</span>}
                </div>
                <button className="btn-submit" type="submit" disabled={isCheckingStatus || availability.loading}>
                  {isCheckingStatus ? "Verificando..." : "Verificar inscrição ou Inscrever-se"}
                </button>
              </form>
            )}

            {!hasAvailabilityError && phase === "form" && !availability.totalFull && (
              <form className="signup-form" noValidate onSubmit={onSubmitRegistration}>
                <div className="form-group">
                  <label htmlFor="name-full">Nome completo</label>
                  <input id="name-full" name="name-full" type="text" placeholder="Seu nome" ref={nameRef} />
                  {errors.name && <span className="input-error">{errors.name}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="email-full">Email</label>
                  <input id="email-full" name="email-full" type="email" placeholder="seu@email.com" ref={emailRef} />
                  {errors.email && <span className="input-error">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="phone">WhatsApp</label>
                  <input id="phone" name="phone" type="text" placeholder="(DDD) 9XXXX-XXXX" ref={phoneRef} onChange={onPhoneChange} />
                  {errors.phone && <span className="input-error">{errors.phone}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="cep">CEP</label>
                  <input id="cep" name="cep" type="text" placeholder="00.000-000" ref={cepRef} onChange={onCepChange} />
                  {errors.cep && <span className="input-error">{errors.cep}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="address">Endereço</label>
                  <input id="address" name="address" type="text" placeholder="Rua, avenida, etc" ref={addressRef} />
                  {errors.address && <span className="input-error">{errors.address}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="number">Número</label>
                  <input id="number" name="number" type="text" placeholder="123" ref={numberRef} />
                  {errors.number && <span className="input-error">{errors.number}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="complement">Complemento</label>
                  <input id="complement" name="complement" type="text" placeholder="Apartamento, bloco, etc" ref={complementRef} />
                </div>
                <div className="form-group">
                  <label htmlFor="city">Cidade</label>
                  <input id="city" name="city" type="text" placeholder="Sua cidade" ref={cityRef} />
                  {errors.city && <span className="input-error">{errors.city}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="state">Estado</label>
                  <input id="state" name="state" type="text" maxLength={2} placeholder="UF" ref={stateRef} />
                  {errors.state && <span className="input-error">{errors.state}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="sleepAtMonastery">Irá dormir no Mosteiro?</label>
                  {isSleepLocked ? (
                    <div className="monastery-full-note">
                      Não há mais vagas para dormir no Mosteiro. Para saber se alguma vaga abriu, entre em contato conosco via WhatsApp.
                    </div>
                  ) : (
                    <select id="sleepAtMonastery" name="sleepAtMonastery" ref={sleepAtMonasteryRef} defaultValue="">
                      <option value="" disabled>
                        Selecione
                      </option>
                      <option value="yes" disabled={availability.monasteryFull}>
                        {availability.monasteryFull ? "Sim (sem vagas)" : "Sim"}
                      </option>
                      <option value="no">Não</option>
                    </select>
                  )}
                  {errors.sleepAtMonastery && <span className="input-error">{errors.sleepAtMonastery}</span>}
                </div>
                <button className="btn-submit" type="submit" disabled={isSubmittingRegistration}>
                  {isSubmittingRegistration ? "Enviando..." : "Verificar inscrição ou Inscrever-se"}
                </button>
              </form>
            )}

            {!hasAvailabilityError && phase === "status" && (
              <>
                {statusMessage && <div className={`status-message ${statusTone ? `status-${statusTone}` : ""}`}>{statusMessage}</div>}

                {currentStatus === "PENDING" && (
                  <div className="pix-box">
                    <p className="pix-label">Copia e Cola do PIX</p>
                    <textarea readOnly value={qrCodeText ?? "Aguardando"} />
                  </div>
                )}

                {(currentStatus === "CANCELED") && (
                  <div className="pix-box">
                    <p className="pix-label">PIX expirado</p>
                    <div className="pix-actions">
                      <button className="btn-primary" onClick={onReopenRegistration}>
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

      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Por que escolher o Caminho do Perdão?</h2>
          <div className="features-grid">
            {content.features.map(feature => (
              <div key={feature.id} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="testimonials-section">
        <div className="container">
          <h2 className="section-title">O que dizem os participantes</h2>
          <div className="testimonials-grid">
            {content.testimonials.map(testimonial => (
              <article key={testimonial.id} className="testimonial-card">
                <div className="testimonial-content">
                  <p className="testimonial-comment">{testimonial.comment}</p>
                  <div className="testimonial-rating">{renderStars(testimonial.rating)}</div>
                </div>
                <div className="testimonial-author">
                  <div className="author-avatar">{testimonial.name.charAt(0)}</div>
                  <div>
                    <div className="author-name">{testimonial.name}</div>
                    <p className="author-role">{testimonial.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">{content.callToAction.title}</h2>
            <p className="cta-description">{content.callToAction.description}</p>
            <button className="btn-cta" onClick={onCallToAction}>
              {content.callToAction.buttonText}
            </button>
          </div>
        </div>
      </section>

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
            <p>© 2007 Caminho do Perdão. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingView;
