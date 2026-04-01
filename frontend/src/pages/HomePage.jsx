import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

// ─────────────────────────────────────────────
// FRAME CONFIG — 120-frame animation
// ─────────────────────────────────────────────
const TOTAL_FRAMES = 120;
const FRAME_URL = (n) => `/animated/ezgif-frame-${String(n).padStart(3, '0')}.jpg`;
const FPS = 30;

// ─────────────────────────────────────────────
// Preload all frames
// ─────────────────────────────────────────────
function loadAllFrames(onProgress) {
  const images = new Array(TOTAL_FRAMES).fill(null);
  let loaded = 0;

  return new Promise((resolve) => {
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = FRAME_URL(i + 1);
      const idx = i;
      const finish = () => {
        images[idx] = img;
        loaded++;
        if (onProgress) onProgress(Math.round((loaded / TOTAL_FRAMES) * 100));
        if (loaded === TOTAL_FRAMES) resolve(images);
      };
      img.onload = finish;
      img.onerror = finish;
    }
  });
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function HomePage() {
  const canvasRef = useRef(null);
  const imagesRef = useRef([]);
  const frameIdxRef = useRef(0);
  const animationRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // ── Draw frame ──────
  const drawFrame = (idx) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imgs = imagesRef.current;
    const img = imgs[idx];
    if (!img || !img.naturalWidth) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;

    if (canvas.width !== W * dpr) canvas.width = W * dpr;
    if (canvas.height !== H * dpr) canvas.height = H * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Cover-fit
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const drawX = (W - drawW) / 2;
    const drawY = (H - drawH) / 2;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, W, H);
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  };

  // ── Load frames ──────────────────────
  useEffect(() => {
    loadAllFrames((p) => setProgress(p)).then((imgs) => {
      imagesRef.current = imgs;
      setLoaded(true);
      drawFrame(0);
    });
  }, []);

  // ── Animation loop (only when playing) ──────────────
  useEffect(() => {
    if (!loaded || !isPlaying) return;

    let lastTime = performance.now();
    const frameTime = 1000 / FPS;

    const animate = (currentTime) => {
      const elapsed = currentTime - lastTime;

      if (elapsed >= frameTime) {
        frameIdxRef.current = (frameIdxRef.current + 1) % TOTAL_FRAMES;
        drawFrame(frameIdxRef.current);
        lastTime = currentTime - (elapsed % frameTime);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [loaded, isPlaying]);

  // ── Resize handler ──────────────────
  useEffect(() => {
    if (!loaded) return;
    const onResize = () => drawFrame(frameIdxRef.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [loaded]);

  // ── Handle hover ──────────────────
  const handleMouseEnter = () => {
    setIsHovered(true);
    setIsPlaying(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsPlaying(false);
    frameIdxRef.current = 0;
    drawFrame(0);
  };

  return (
    <div className="homepage">

      {/* ── LOADING SCREEN ────────────── */}
      {!loaded && (
        <div className="hp-loading">
          <div className="hp-loading-overlay">
            <div className="hp-loading-logo">ShiftSync</div>
            <div className="hp-loading-bar-wrap">
              <div className="hp-loading-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="hp-loading-pct">{progress}%</p>
          </div>
        </div>
      )}

      {/* ── HERO SPLIT LAYOUT ──────────── */}
      <section className="hp-hero-split">
        
        {/* LEFT: Content */}
        <div className="hp-hero-left">
          <span className="hp-eyebrow">Industrial AI Platform</span>
          <h1 className="hp-h1">
            Intelligence for the<br />
            <span className="hp-accent">Modern Factory</span>
          </h1>
          <p className="hp-tagline">Predict. Optimize. Prevent.</p>
          <p className="hp-subtitle">
            Real-time monitoring, AI-powered predictions, and actionable insights
            to eliminate downtime and maximize efficiency.
          </p>
          <div className="hp-cta-row">
            <Link to="/signup" className="hp-btn hp-btn--primary">Get Started</Link>
            <Link to="/about" className="hp-btn hp-btn--ghost">Explore Platform</Link>
          </div>
        </div>

        {/* RIGHT: Video Canvas */}
        <div className="hp-hero-right">
          <div 
            className="hp-video-container"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <canvas ref={canvasRef} className="hp-canvas-4k" />
            {!isHovered && loaded && (
              <div className="hp-play-hint">
                <div className="hp-play-icon">▶</div>
                <span>Hover to Play</span>
              </div>
            )}
          </div>
        </div>

      </section>

      {/* ── FEATURES ─────────────────────────── */}
      <section className="hp-section hp-features">
        <div className="hp-container">
          <p className="hp-label">Core Capabilities</p>
          <h2 className="hp-h2">Built for the Factory Floor</h2>
          <p className="hp-desc">
            Every feature is engineered to eliminate downtime, preserve expertise,
            and keep your operations running at peak efficiency.
          </p>

          <div className="hp-features-grid">
            {[
              { icon: '⚡', title: 'Predictive Maintenance',   body: 'Detect anomalies before failures occur. AI models trained on your exact machine signatures.' },
              { icon: '📡', title: 'Real-time Monitoring',     body: 'Live sensor dashboards stream from every asset. Total visibility, zero blind spots.' },
              { icon: '🧠', title: 'AI Knowledge Capture',     body: 'Voice-to-insight: veteran expertise is transcribed and embedded into your knowledge graph.' },
              { icon: '🔍', title: 'Semantic Search',          body: 'Find past failure fixes by meaning — not keywords. Context-aware, instant retrieval.' },
              { icon: '🛡️', title: 'Safety-Aware AI',          body: 'Every recommendation is validated against safety protocols before reaching your team.' },
              { icon: '📊', title: 'Failure Insights',         body: 'Deep root-cause analysis with trend visualizations and actionable repair timelines.' },
            ].map((f, i) => (
              <div className="hp-feat-card" key={i} style={{ '--i': i }}>
                <div className="hp-feat-icon">{f.icon}</div>
                <h3 className="hp-feat-title">{f.title}</h3>
                <p  className="hp-feat-body">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI SYSTEM ────────────────────────── */}
      <section className="hp-section hp-ai-section">
        <div className="hp-container hp-ai-grid">
          <div className="hp-ai-text">
            <p className="hp-label">The Intelligence Layer</p>
            <h2 className="hp-h2">A Brain for Your Operations</h2>
            <p className="hp-desc">
              ShiftSync's knowledge graph weaves together machines, failures,
              technicians, and solutions into one unified, queryable intelligence layer.
            </p>
            <ul className="hp-ai-bullets">
              {[
                '📌 Neo4j-powered knowledge graph',
                '🎙️ Voice-to-AI processing pipeline',
                '⚡ Groq LLM for sub-second inference',
                '🔗 Semantic links between failures & fixes',
              ].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <Link to="/about" className="hp-btn hp-btn--primary" style={{ marginTop: '2rem', display: 'inline-flex' }}>
              Explore Architecture →
            </Link>
          </div>

          {/* Neural network visualization */}
          <div className="hp-neural">
            <div className="hp-neural-core" />
            {[...Array(8)].map((_, i) => (
              <React.Fragment key={i}>
                <div className="hp-neural-node" style={{ '--a': `${i * 45}deg`, '--d': `${i * 0.15}s` }} />
                <div className="hp-neural-line" style={{ '--a': `${i * 45}deg` }} />
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ────────────────── */}
      <section className="hp-section hp-dashboard">
        <div className="hp-container">
          <p className="hp-label">Platform Preview</p>
          <h2 className="hp-h2">Your Command Center</h2>

          <div className="hp-stat-cards">
            {[
              { label: 'Machines Online',      value: '247',   badge: '+3',      type: 'up' },
              { label: 'Active Alerts',         value: '12',    badge: '↑ 2',     type: 'warn' },
              { label: 'Avg. Efficiency',       value: '94.2%', badge: '+1.8%',   type: 'up' },
              { label: 'Failures Predicted',    value: '3',     badge: 'This week', type: 'info' },
            ].map((s, i) => (
              <div className="hp-stat-card" key={i}>
                <p className="hp-stat-label">{s.label}</p>
                <p className="hp-stat-value">{s.value}</p>
                <span className={`hp-stat-badge hp-stat-badge--${s.type}`}>{s.badge}</span>
              </div>
            ))}
          </div>

          <div className="hp-chart-card">
            <p className="hp-chart-title">Machine Health — Last 7 Days</p>
            <div className="hp-bars">
              {[82, 87, 91, 85, 94, 92, 96].map((h, i) => (
                <div className="hp-bar-col" key={i}>
                  <div className="hp-bar" style={{ '--h': `${h}%`, '--d': `${i * 0.08}s` }} />
                  <span>{['M','T','W','T','F','S','S'][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────── */}
      <section className="hp-cta-banner">
        <div className="hp-container" style={{ textAlign: 'center' }}>
          <h2>Ready to Transform Your Factory?</h2>
          <p>Join the AI-driven industrial revolution. No credit card required.</p>
          <div className="hp-cta-row" style={{ justifyContent: 'center', marginTop: '2rem' }}>
            <Link to="/signup"  className="hp-btn hp-btn--white">Start Free Trial</Link>
            <Link to="/contact" className="hp-btn hp-btn--outline-white">Contact Sales</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────── */}
      <footer className="hp-footer">
        <div className="hp-container hp-footer-inner">
          <div>
            <span className="hp-footer-logo">ShiftSync</span>
            <p>AI-powered industrial intelligence platform.</p>
          </div>
          <div className="hp-footer-links">
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/login">Login</Link>
          </div>
        </div>
        <p className="hp-footer-copy">© 2026 ShiftSync. All rights reserved.</p>
      </footer>

    </div>
  );
}
