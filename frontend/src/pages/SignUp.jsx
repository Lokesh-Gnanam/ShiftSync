import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const SignUp = () => {
  const { register, error, setError } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);

  const [formData, setFormData] = useState({
    name: '', username: '', password: '', role: 'junior', specialization: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await register(formData);
    if (success) {
      alert('Registration successful! Please log in.');
      navigate('/');
    }
  };

  return (
    <div className="login-page animate-fade-in">
      <div className="login-card-outer">

        {/* ── Left Panel ── */}
        <div className="login-left">
          {/* reuse same circuit art inline */}
          <svg className="circuit-art" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="100" y1="10"  x2="100" y2="50"  stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="4 2"/>
            <line x1="100" y1="150" x2="100" y2="190" stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="4 2"/>
            <line x1="10"  y1="100" x2="50"  y2="100" stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="4 2"/>
            <line x1="150" y1="100" x2="190" y2="100" stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="4 2"/>
            <line x1="50"  y1="50"  x2="80"  y2="80"  stroke="#a7f3d0" strokeWidth="1" strokeDasharray="3 3"/>
            <line x1="150" y1="50"  x2="120" y2="80"  stroke="#a7f3d0" strokeWidth="1" strokeDasharray="3 3"/>
            <line x1="50"  y1="150" x2="80"  y2="120" stroke="#a7f3d0" strokeWidth="1" strokeDasharray="3 3"/>
            <line x1="150" y1="150" x2="120" y2="120" stroke="#a7f3d0" strokeWidth="1" strokeDasharray="3 3"/>
            <circle cx="100" cy="100" r="88" stroke="rgba(103,232,249,0.18)" strokeWidth="1"/>
            <circle cx="100" cy="100" r="70" stroke="rgba(103,232,249,0.25)" strokeWidth="1.5"/>
            {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              return <line key={i}
                x1={100 + 70*Math.cos(rad)} y1={100 + 70*Math.sin(rad)}
                x2={100 + 80*Math.cos(rad)} y2={100 + 80*Math.sin(rad)}
                stroke="#67e8f9" strokeWidth="3" strokeLinecap="round"/>;
            })}
            <rect x="72" y="72" width="56" height="56" rx="6" fill="#134e4a" stroke="#67e8f9" strokeWidth="2"/>
            <rect x="80" y="80" width="40" height="40" rx="3" fill="#0d9488" stroke="#a7f3d0" strokeWidth="1"/>
            {[82,90,98,106,114].map((pos, i) => (
              <React.Fragment key={i}>
                <line x1={pos} y1="72" x2={pos} y2="66" stroke="#67e8f9" strokeWidth="1.5"/>
                <line x1={pos} y1="128" x2={pos} y2="134" stroke="#67e8f9" strokeWidth="1.5"/>
                <line x1="72" y1={pos} x2="66" y2={pos} stroke="#67e8f9" strokeWidth="1.5"/>
                <line x1="128" y1={pos} x2="134" y2={pos} stroke="#67e8f9" strokeWidth="1.5"/>
              </React.Fragment>
            ))}
            <line x1="100" y1="84" x2="100" y2="116" stroke="#67e8f9" strokeWidth="1.5" opacity="0.7"/>
            <line x1="84"  y1="100" x2="116" y2="100" stroke="#67e8f9" strokeWidth="1.5" opacity="0.7"/>
            <circle cx="100" cy="100" r="6" fill="#67e8f9" opacity="0.9"/>
            {[[30,30],[170,30],[30,170],[170,170]].map(([cx,cy],j) => (
              <circle key={j} cx={cx} cy={cy} r="14" stroke="#a7f3d0" strokeWidth="1.5" fill="none"/>
            ))}
            {[[100,10],[100,190],[10,100],[190,100]].map(([x,y],i) => (
              <circle key={i} cx={x} cy={y} r="3" fill="#67e8f9" opacity="0.8"/>
            ))}
          </svg>
          <div className="left-text">
            <h2>Join the Knowledge Network</h2>
            <p>Register as a technician and start contributing to ShiftSync's tribal knowledge base.</p>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="login-right">
          <div className="brand-logo">
            <span className="arrow-accent">➤</span> ShiftSync
          </div>

          <h2 className="form-heading">Create Account</h2>
          <p className="form-subheading">Fill in your details to register</p>

          <form onSubmit={handleSubmit} className="dual-form">
            <div className="input-group">
              <label className="input-label" htmlFor="name">Full Name</label>
              <input id="name" type="text" className="teal-input" placeholder="Your full name"
                value={formData.name} onChange={handleChange} required/>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="username">Employee ID / Username</label>
              <input id="username" type="text" className="teal-input" placeholder="e.g. TECH_01"
                value={formData.username} onChange={handleChange} required/>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="role">Role</label>
              <select id="role" className="teal-input" style={{ appearance: 'auto' }}
                value={formData.role} onChange={handleChange}>
                <option value="junior">Junior Technician</option>
                <option value="senior">Senior Technician</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="specialization">Specialization</label>
              <input id="specialization" type="text" className="teal-input" placeholder="e.g. Mechanical, Electrical"
                value={formData.specialization} onChange={handleChange} required/>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password">Password</label>
              <div className="pw-wrapper">
                <input id="password" type={showPw ? 'text' : 'password'} className="teal-input"
                  placeholder="Set a password" value={formData.password} onChange={handleChange} required/>
                <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="teal-btn">Complete Registration</button>
          </form>

          <p className="register-hint" style={{ marginTop: '0.6rem' }}>
            Already registered? <Link to="/">Login here</Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default SignUp;
