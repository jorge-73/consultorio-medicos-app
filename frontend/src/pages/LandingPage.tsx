import { Link } from 'react-router-dom';
import './LandingPage.css';

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  "name": "MediCare",
  "description": "Plataforma de gestión de citas médicas conectando pacientes con doctores especializados.",
  "url": "https://medicare.example.com",
  "telephone": "+52-555-123-4567",
  "address": {
    "@type": "PostalAddress",
    "addressCountry": "MX",
    "addressRegion": "Ciudad de México"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "07:00",
      "closes": "20:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Saturday"],
      "opens": "09:00",
      "closes": "14:00"
    }
  ],
  "priceRange": "$$"
};

const webSiteData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "MediCare",
  "url": "https://medicare.example.com"
};

export const LandingPage = () => {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(structuredData)}} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(webSiteData)}} />
    <div className="landing">
      <header className="landing-header" role="banner">
        <div className="landing-header-content">
          <Link to="/" className="landing-logo" aria-label="MediCare - Ir al inicio">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="currentColor"/>
              <path d="M16 8v16M8 16h16" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <span>MediCare</span>
          </Link>
          <nav className="landing-nav" aria-label="Navegación principal">
            <a href="#features">Servicios</a>
            <a href="#about">Nosotros</a>
            <a href="#contact">Contacto</a>
          </nav>
          <div className="landing-auth-buttons">
            <Link to="/login" className="landing-btn landing-btn-outline">Iniciar Sesión</Link>
            <Link to="/register" className="landing-btn landing-btn-primary">Registrarse</Link>
          </div>
        </div>
      </header>

      <main>
      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="landing-hero-bg">
          <img 
            src="/landing-bg.png" 
            alt="Consultorio médico moderno" 
            className="hero-full-image"
          />
          <div className="hero-image-overlay-full"></div>
          <div className="hero-glow"></div>
          <div className="hero-particles"></div>
          <div className="hero-shapes">
            <div className="hero-shape shape-1"></div>
            <div className="hero-shape shape-2"></div>
          </div>
        </div>
        <div className="landing-hero-content">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            Cuidado médico de calidad
          </div>
          <h1 className="hero-title" id="hero-title">
            Tu salud es nuestra
            <span className="hero-title-accent"> prioridad</span>
          </h1>
          <p className="hero-description">
            Gestiona tus citas médicas de forma inteligente. 
            Doctores especializados, horarios flexibles y una experiencia 
            diseñada para tu bienestar.
          </p>
          <div className="hero-cta">
            <Link to="/register" className="landing-btn landing-btn-primary landing-btn-lg">
              Comenzar Ahora
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10h12m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <a href="#features" className="landing-btn landing-btn-ghost">
              Descubrir más
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">5000+</span>
              <span className="stat-label">Pacientes atendidos</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">120+</span>
              <span className="stat-label">Doctores especializados</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">98%</span>
              <span className="stat-label">Satisfacción</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="landing-features" aria-labelledby="features-title">
        <div className="landing-features-header">
          <span className="features-label">¿Por qué elegirnos?</span>
          <h2 className="features-title" id="features-title">Una experiencia médica diseñada para ti</h2>
        </div>
        <div className="landing-features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Agenda Flexible</h3>
            <p>Reserva citas en cualquier momento. Nuestro sistema está disponible 24/7 para tu comodidad.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Doctores Especializados</h3>
            <p>Accede a un equipo médico multidiciplinario con años de experiencia en diversas áreas.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Seguridad y Privacidad</h3>
            <p>Tus datos médicos están protegidos con los más altos estándares de seguridad y privacidad.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Recordatorios Inteligentes</h3>
            <p>Recibe notificaciones automáticas sobre tus citas y nunca más pierdas una consulta.</p>
          </div>
        </div>
      </section>

      <section id="about" className="landing-about" aria-labelledby="about-title">
        <div className="landing-about-content">
          <div className="about-text">
            <span className="features-label">Sobre MediCare</span>
            <h2 id="about-title">Comprometidos con tu bienestar</h2>
            <p>
              MediCare nace con la misión de democratizar el acceso a servicios 
              médicos de calidad. Creamos una plataforma que conecta pacientes 
              con doctores especializados, facilitando la gestión de citas y 
              mejorando la experiencia de atención médica.
            </p>
            <p>
              Nuestro equipo está formado por profesionales de la salud y 
              tecnología, trabajando juntos para crear soluciones que cambian 
              la forma en que cuidamos de nuestra salud.
            </p>
            <div className="about-features">
              <div className="about-feature">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fill="currentColor"/>
                </svg>
                <span>Atención personalizada</span>
              </div>
              <div className="about-feature">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fill="currentColor"/>
                </svg>
                <span>Tecnología innovadora</span>
              </div>
              <div className="about-feature">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fill="currentColor"/>
                </svg>
                <span>Equipo multidisciplinario</span>
              </div>
            </div>
          </div>
          <div className="about-visual">
            <div className="about-image">
              <div className="about-image-inner">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <path d="M40 20v40M20 40h40" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
            <div className="about-decoration"></div>
          </div>
        </div>
      </section>

      <section className="landing-cta" aria-labelledby="cta-title">
        <div className="cta-bg">
          <div className="cta-gradient"></div>
          <div className="cta-pattern"></div>
        </div>
        <div className="cta-content">
          <h2 id="cta-title">¿Listo para cuidar tu salud?</h2>
          <p>Únete a miles de pacientes que ya disfrutan de una mejor experiencia médica.</p>
          <Link to="/register" className="landing-btn landing-btn-primary landing-btn-lg">
            Crear Cuenta Gratis
          </Link>
        </div>
      </section>
      </main>

      <footer className="landing-footer" role="contentinfo">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="landing-logo">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                <rect width="32" height="32" rx="8" fill="currentColor"/>
                <path d="M16 8v16M8 16h16" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              <span>MediCare</span>
            </div>
            <p>Tu salud, nuestra prioridad. Cuidado médico de calidad al alcance de todos.</p>
          </div>
          <nav className="footer-links" aria-label="Enlaces del pie">
            <div className="footer-column">
              <h4>Servicios</h4>
              <a href="#features">Citas Médicas</a>
              <a href="#features">Doctores</a>
              <a href="#features">Especialidades</a>
            </div>
            <div className="footer-column">
              <h4>Empresa</h4>
              <a href="#about">Nosotros</a>
              <a href="#contact">Contacto</a>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <a href="#">Privacidad</a>
              <a href="#">Términos</a>
            </div>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 MediCare. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
    </>
  );
};