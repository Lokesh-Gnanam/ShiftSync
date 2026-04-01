import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './AboutPage.css';

function useScrollReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add('revealed'); },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function RevealSection({ children, className = '' }) {
  const ref = useScrollReveal();
  return <div ref={ref} className={`reveal-section ${className}`}>{children}</div>;
}

export default function AboutPage() {
  return (
    <div className="about-page">
      {/* Hero */}
      <section className="about-hero">
        <div className="about-hero-bg" />
        <div className="about-hero-content">
          <p className="about-eyebrow">Our Story</p>
          <h1 className="about-hero-title">
            Redefining Industrial<br />
            <span className="about-gradient-text">Intelligence</span>
          </h1>
          <p className="about-hero-subtitle">
            From human expertise to AI-powered decision systems
          </p>
        </div>
        {/* Decorative grid */}
        <div className="about-hero-grid">
          {[...Array(20)].map((_, i) => <div key={i} className="about-hero-grid-cell" />)}
        </div>
      </section>

      {/* SECTION 1 — THE PROBLEM */}
      <RevealSection className="about-problem">
        <div className="about-container">
          <div className="about-section-label">The Problem</div>
          <h2 className="about-section-title">The Knowledge That Gets Lost</h2>
          <p className="about-section-sub">
            Every year, factories lose irreplaceable expertise when experienced technicians retire or move on. This silent crisis costs the industry billions.
          </p>
          <div className="about-problem-cards">
            {[
              {
                icon: '👴',
                title: 'Vanishing Tacit Knowledge',
                desc: 'Years of hands-on expertise — the subtle sounds, patterns, and instincts — disappear when experienced technicians leave. No system captures it. No one inherits it.',
              },
              {
                icon: '⚙️',
                title: 'Repeated Failures & Downtime',
                desc: 'The same machines fail the same ways, over and over. Without intelligent memory, teams are doomed to repeat expensive mistakes that veteran technicians solved years ago.',
              },
              {
                icon: '🔎',
                title: 'No Intelligent Retrieval',
                desc: 'Paper logs, scattered spreadsheets, buried PDFs. When a machine breaks at 2AM, there is no fast, intelligent way to find what fixed it last time.',
              },
            ].map((item, i) => (
              <div className="about-problem-card" key={i} style={{ '--delay': `${i * 0.15}s` }}>
                <div className="about-problem-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* SECTION 2 — THE SOLUTION */}
      <RevealSection className="about-solution">
        <div className="about-container">
          <div className="about-section-label solution">The Solution</div>
          <h2 className="about-section-title">How ShiftSync Works</h2>
          <p className="about-section-sub">
            A seamless pipeline from human voice to structured AI knowledge — making expertise permanent and retrievable.
          </p>
          <div className="about-flow">
            {[
              { icon: '🎙️', label: 'Technician', desc: 'Voice Input' },
              { icon: '🔄', label: 'AI Processing', desc: 'Transcription + NLP' },
              { icon: '🕸️', label: 'Knowledge Graph', desc: 'Neo4j Storage' },
              { icon: '⚡', label: 'Smart Retrieval', desc: 'Semantic Search' },
            ].map((step, i) => (
              <React.Fragment key={i}>
                <div className="about-flow-step">
                  <div className="about-flow-icon">{step.icon}</div>
                  <p className="about-flow-label">{step.label}</p>
                  <p className="about-flow-desc">{step.desc}</p>
                </div>
                {i < 3 && <div className="about-flow-arrow">→</div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* SECTION 3 — CORE FEATURES */}
      <RevealSection className="about-features">
        <div className="about-container">
          <div className="about-section-label">Capabilities</div>
          <h2 className="about-section-title">Core Features</h2>
          <p className="about-section-sub">Five pillars engineered for industrial intelligence.</p>
          <div className="about-features-grid">
            {[
              {
                icon: '🧠',
                title: 'AI Knowledge Capture',
                desc: 'Voice recordings from technicians are transcribed and structurally embedded into the knowledge graph automatically.',
              },
              {
                icon: '🔍',
                title: 'Semantic Search',
                desc: 'Understands the meaning behind a query — not just keywords. Find past failure solutions even when phrased differently.',
              },
              {
                icon: '⚡',
                title: 'Predictive Maintenance',
                desc: 'Machine learning models detect early warning patterns and alert teams before failures escalate into costly downtime.',
              },
              {
                icon: '📊',
                title: 'Failure Insights',
                desc: 'Deep historical analysis of recurring failures, root causes, and repair timelines, visualized for decision-making.',
              },
              {
                icon: '🛡️',
                title: 'Safety-Aware AI',
                desc: 'Every recommendation is validated against safety protocols and compliance standards before it reaches a technician.',
              },
            ].map((f, i) => (
              <div className="about-feature-card" key={i} style={{ '--delay': `${i * 0.1}s` }}>
                <div className="about-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* SECTION 4 — TECH STACK */}
      <RevealSection className="about-tech">
        <div className="about-container">
          <div className="about-section-label">Engineering</div>
          <h2 className="about-section-title">Technology Stack</h2>
          <p className="about-section-sub">Built on best-in-class, production-grade infrastructure.</p>
          <div className="about-tech-grid">
            {[
              { label: 'Backend', value: 'FastAPI', icon: '⚡', color: '#009688' },
              { label: 'Frontend', value: 'React', icon: '⚛️', color: '#61DAFB' },
              { label: 'Database', value: 'Neo4j Graph DB', icon: '🕸️', color: '#018BFF' },
              { label: 'AI Engine', value: 'Groq LLM', icon: '🧠', color: '#6C47FF' },
              { label: 'Speech', value: 'Speech Recognition', icon: '🎙️', color: '#FF6B6B' },
              { label: 'Deployment', value: 'Docker', icon: '🐳', color: '#2496ED' },
            ].map((t, i) => (
              <div className="about-tech-badge" key={i} style={{ '--accent': t.color }}>
                <span className="about-tech-badge-icon">{t.icon}</span>
                <div>
                  <p className="about-tech-badge-label">{t.label}</p>
                  <p className="about-tech-badge-value">{t.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* SECTION 5 — VISION */}
      <RevealSection className="about-vision">
        <div className="about-container about-vision-inner">
          <div className="about-vision-orb" />
          <div className="about-section-label vision">Our Vision</div>
          <blockquote className="about-vision-quote">
            "ShiftSync transforms industrial operations into intelligent ecosystems where machines, data, and human expertise are seamlessly connected."
          </blockquote>
          <div className="about-vision-ctas">
            <Link to="/contact" className="about-btn about-btn-primary">Get in Touch</Link>
            <Link to="/login" className="about-btn about-btn-outline">Access Platform</Link>
          </div>
        </div>
      </RevealSection>
    </div>
  );
}
