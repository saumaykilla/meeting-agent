"use client";

import { useEffect } from "react";
import Link from "next/link";
import "./landing.css";

export default function LandingPage() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!prefersReducedMotion) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            revealObserver.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
      });

      document.querySelectorAll('.reveal').forEach((el) => {
        revealObserver.observe(el);
      });

      const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('active');
            }, parseInt((entry.target as HTMLElement).dataset.delay || "0"));
            cardObserver.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
      });

      document.querySelectorAll('.reveal-card').forEach((el, index) => {
        (el as HTMLElement).dataset.delay = (index * 150).toString();
        cardObserver.observe(el);
      });
    } else {
      document.querySelectorAll('.reveal, .reveal-card').forEach(el => el.classList.add('active'));
    }
  }, []);

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="header-content">
          <div className="header-logo">
            Consensus AI
          </div>
         
          <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
            <Link href="/login" className="btn-hero-primary btn-hover-glow">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-bg">
            <img 
              alt="Abstract minimalist 3D background" 
              className="ambient-float" 
              src="/hero_bg.png"
            />
            <div className="hero-bg-overlay"></div>
          </div>
          <div className="landing-container" style={{position: 'relative'}}>
            <div className="hero-content">
              <div className="hero-text">
                <div className="hero-badge hero-entrance hero-delay-1">
                  <span className="material-symbols-outlined" style={{fontSize: '16px', color: 'var(--color-accent)'}}>memory</span>
                  <span>Consensus AI </span>
                </div>
                <h1 className="hero-title hero-entrance hero-delay-2">
                  Meetings with a <span style={{color: 'var(--color-accent)'}}>Memory.</span>
                </h1>
                <p className="hero-subtitle hero-entrance hero-delay-3">
                  The AI agent that listens in real-time and resurfaces solutions from past meetings before you even ask. Silence the noise, amplify the signal.
                </p>
                <div className="hero-actions hero-entrance hero-delay-4">
                  <Link href="/login" className="btn-hero-primary btn-hover-glow">
                    Get Started
                  </Link>
                
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="features-section">
          <div className="landing-container">
            <div className="features-header reveal">
              <h2>Intelligence in Action</h2>
              <p>
                A suite of tools designed to turn every conversation into an actionable asset.
              </p>
            </div>
            <div className="features-grid">
              <div className="feature-card reveal-card card-hover-tilt">
                <div className="feature-icon">
                  <span className="material-symbols-outlined" style={{fontSize: '24px'}}>bolt</span>
                </div>
                <h3 className="feature-title">Real-time Insight Sharing</h3>
                <p className="feature-desc">
                  AI surfaces past solutions instantly as you speak, providing relevant context precisely when it's needed during active discussions.
                </p>
              </div>
              <div className="feature-card offset reveal-card card-hover-tilt">
                <div className="feature-icon">
                  <span className="material-symbols-outlined" style={{fontSize: '24px'}}>hub</span>
                </div>
                <h3 className="feature-title">Deep Meeting Memory</h3>
                <p className="feature-desc">
                  Connect dots across months of transcripts. Our advanced vector search links seemingly unrelated ideas across your organization's history.
                </p>
              </div>
              <div className="feature-card reveal-card card-hover-tilt">
                <div className="feature-icon">
                  <span className="material-symbols-outlined" style={{fontSize: '24px'}}>history_edu</span>
                </div>
                <h3 className="feature-title">Precision Transcription</h3>
                <p className="feature-desc">
                  High-fidelity logs for every conversation. Captures nuance, technical jargon, and action items with unparalleled accuracy.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="how-it-works-section">
          <div className="landing-container">
            <div className="hiw-grid">
              <div className="reveal">
                <h2 className="hiw-title">How it operates.</h2>
                <div className="hiw-steps">
                  <div className="hiw-line"></div>
                  <div className="hiw-step reveal" style={{transitionDelay: '0.1s'}}>
                    <div className="hiw-number">1</div>
                    <div>
                      <h4 className="hiw-step-title">Integrate Silently</h4>
                      <p className="hiw-step-desc">Connects to your calendar and joins meetings as a silent observer, requiring zero manual setup per call.</p>
                    </div>
                  </div>
                  <div className="hiw-step reveal" style={{transitionDelay: '0.2s'}}>
                    <div className="hiw-number">2</div>
                    <div>
                      <h4 className="hiw-step-title">Analyze in Real-time</h4>
                      <p className="hiw-step-desc">Processes audio streams instantly, indexing context and intent to build a structured knowledge graph.</p>
                    </div>
                  </div>
                  <div className="hiw-step reveal" style={{transitionDelay: '0.3s'}}>
                    <div className="hiw-number">3</div>
                    <div>
                      <h4 className="hiw-step-title">Surface Solutions</h4>
                      <p className="hiw-step-desc">Pushes relevant historical context and decisions to your dashboard exactly when the topic arises.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="reveal" style={{transitionDelay: '0.4s'}}>
                <div className="hiw-image-wrapper">
                  <img 
                    alt="A sleek, high-tech abstract visualization representing data processing and AI intelligence." 
                    src="/how_it_works.png"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

 
    </div>
  );
}
