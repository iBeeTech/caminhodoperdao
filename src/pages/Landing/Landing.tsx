import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import { LandingController } from '../../controllers/LandingController';
import { LandingContent } from '../../models/LandingModels';
import './Landing.css';

const Landing: React.FC = () => {
  const [content, setContent] = useState<LandingContent | null>(null);

  useEffect(() => {
    // Carrega o conteúdo através do controller
    const landingContent = LandingController.getLandingContent();
    setContent(landingContent);
  }, []);

  if (!content) {
    return <div className="loading">Carregando...</div>;
  }

  const handlePrimaryAction = () => {
    LandingController.trackUserInteraction('click', 'primary-hero-button');
    LandingController.handlePrimaryAction();
  };

  const handleSecondaryAction = () => {
    LandingController.trackUserInteraction('click', 'secondary-hero-button');
    LandingController.handleSecondaryAction();
  };

  const handleCallToAction = () => {
    LandingController.trackUserInteraction('click', 'cta-button');
    LandingController.handleCallToAction();
  };

  const renderStars = (rating: number) => {
    return Array(rating).fill(0).map((_, index) => (
      <span key={index} className="star">⭐</span>
    ));
  };

  return (
    <div className="landing-page">
      <Header />
      
      {/* Hero Section */}
      <section className="hero-section">
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
              🕊️
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Por que escolher o Caminho do Perdão?</h2>
          <div className="features-grid">
            {content.features.map((feature) => (
              <div 
                key={feature.id} 
                className={`feature-card ${feature.highlighted ? 'highlighted' : ''}`}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="container">
          <h2 className="section-title">O que nossos participantes dizem</h2>
          <div className="testimonials-grid">
            {content.testimonials.map((testimonial) => (
              <div key={testimonial.id} className="testimonial-card">
                <div className="testimonial-content">
                  <p className="testimonial-comment">"{testimonial.comment}"</p>
                  <div className="testimonial-rating">
                    {renderStars(testimonial.rating)}
                  </div>
                </div>
                <div className="testimonial-author">
                  <div className="author-avatar">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div className="author-info">
                    <h4 className="author-name">{testimonial.name}</h4>
                    <p className="author-role">{testimonial.role}</p>
                  </div>
                </div>
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
            <p className="cta-description">{content.callToAction.description}</p>
            <button 
              className="btn-cta"
              onClick={handleCallToAction}
            >
              {content.callToAction.buttonText}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>Caminho do Perdão</h3>
              <p>Transformando vidas através do perdão e autoconhecimento.</p>
            </div>
            <div className="footer-section">
              <h4>Links Úteis</h4>
              <ul>
                <li><a href="#sobre">Sobre Nós</a></li>
                <li><a href="#programas">Programas</a></li>
                <li><a href="#recursos">Recursos</a></li>
                <li><a href="#contato">Contato</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Contato</h4>
              <p>Email: contato@caminhodoperdao.com</p>
              <p>Telefone: (11) 99999-9999</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Caminho do Perdão. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;