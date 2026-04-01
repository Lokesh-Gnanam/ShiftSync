import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './ContactPage.css';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    setForm({ name: '', email: '', company: '', message: '' });
  };

  return (
    <div className="contact-page">
      {/* Hero */}
      <section className="contact-hero">
        <div className="contact-hero-radial" />
        <div className="contact-hero-content">
          <p className="contact-eyebrow">Reach Out</p>
          <h1 className="contact-hero-title">
            Let's Build Smarter<br />
            <span className="contact-gradient-text">Industries Together</span>
          </h1>
          <p className="contact-hero-sub">
            Reach out for collaboration, support, or product inquiries — we respond within 24 hours.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="contact-main">
        <div className="contact-container">
          <div className="contact-grid">
            {/* Form */}
            <div className="contact-form-wrap">
              {submitted ? (
                <div className="contact-success">
                  <div className="contact-success-icon">✓</div>
                  <h3>Message Sent!</h3>
                  <p>We'll be in touch within 24 hours. Thank you!</p>
                </div>
              ) : (
                <>
                  <h2 className="contact-form-title">Send a Message</h2>
                  <form className="contact-form" onSubmit={handleSubmit}>
                    <div className="contact-form-row">
                      <div className="contact-field">
                        <label htmlFor="name">Full Name</label>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          placeholder="John Doe"
                          value={form.name}
                          onChange={handleChange}
                          required
                          autoFocus
                        />
                      </div>
                      <div className="contact-field">
                        <label htmlFor="email">Email Address</label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="john@company.com"
                          value={form.email}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="contact-field">
                      <label htmlFor="company">Company / Organization</label>
                      <input
                        id="company"
                        name="company"
                        type="text"
                        placeholder="Industrial Corp Ltd."
                        value={form.company}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="contact-field">
                      <label htmlFor="message">Message</label>
                      <textarea
                        id="message"
                        name="message"
                        rows={5}
                        placeholder="Tell us about your operations, challenges, or how you'd like to collaborate..."
                        value={form.message}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <button type="submit" className="contact-submit">
                      Send Message
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8H14M14 8L9 3M14 8L9 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Contact info + AI box */}
            <div className="contact-info-col">
              {/* Contact card */}
              <div className="contact-info-card">
                <h3>Contact Information</h3>
                <div className="contact-info-list">
                  <div className="contact-info-item">
                    <div className="contact-info-icon">📧</div>
                    <div>
                      <p className="contact-info-label">Email</p>
                      <a href="mailto:support@shiftsync.ai" className="contact-info-value">support@shiftsync.ai</a>
                    </div>
                  </div>
                  <div className="contact-info-item">
                    <div className="contact-info-icon">📞</div>
                    <div>
                      <p className="contact-info-label">Phone</p>
                      <p className="contact-info-value">+91 98765 43210</p>
                    </div>
                  </div>
                  <div className="contact-info-item">
                    <div className="contact-info-icon">🏭</div>
                    <div>
                      <p className="contact-info-label">Location</p>
                      <p className="contact-info-value">Industrial Tech Hub, Bangalore, India</p>
                    </div>
                  </div>
                  <div className="contact-info-item">
                    <div className="contact-info-icon">🕐</div>
                    <div>
                      <p className="contact-info-label">Response Time</p>
                      <p className="contact-info-value">Within 24 hours</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Assist box */}
              <div className="contact-ai-box">
                <div className="contact-ai-glow" />
                <div className="contact-ai-inner">
                  <div className="contact-ai-icon">🤖</div>
                  <div>
                    <h4>Need help instantly?</h4>
                    <p>Get AI-powered answers about ShiftSync capabilities, pricing, or deployment within seconds.</p>
                  </div>
                </div>
                <Link to="/login" className="contact-ai-btn">
                  Ask AI Assistant →
                </Link>
              </div>

              {/* Badges */}
              <div className="contact-badges">
                {['Enterprise Ready', 'SOC2 Compliant', '24/7 Support', 'On-Prem Available'].map((b) => (
                  <span className="contact-badge" key={b}>{b}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
