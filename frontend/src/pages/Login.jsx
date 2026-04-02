import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

/* ── Inline SVG circuit/gear illustration ── */
const CircuitArt = () => (
  <svg className="circuit-art" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* circuit traces */}
    <line x1="100" y1="10"  x2="100" y2="50"  stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="4 2"/>
    <line x1="100" y1="150" x2="100" y2="190" stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="4 2"/>
    <line x1="10"  y1="100" x2="50"  y2="100" stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="4 2"/>
    <line x1="150" y1="100" x2="190" y2="100" stroke="#67e8f9" strokeWidth="1.5" strokeDasharray="4 2"/>
    <line x1="50"  y1="50"  x2="80"  y2="80"  stroke="#a7f3d0" strokeWidth="1" strokeDasharray="3 3"/>
    <line x1="150" y1="50"  x2="120" y2="80"  stroke="#a7f3d0" strokeWidth="1" strokeDasharray="3 3"/>
    <line x1="50"  y1="150" x2="80"  y2="120" stroke="#a7f3d0" strokeWidth="1" strokeDasharray="3 3"/>
    <line x1="150" y1="150" x2="120" y2="120" stroke="#a7f3d0" strokeWidth="1" strokeDasharray="3 3"/>

    {/* outer ring */}
    <circle cx="100" cy="100" r="88" stroke="rgba(103,232,249,0.18)" strokeWidth="1"/>
    <circle cx="100" cy="100" r="70" stroke="rgba(103,232,249,0.25)" strokeWidth="1.5"/>

    {/* gear teeth (outer) */}
    {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
      const r = 70, tr = 80;
      const rad = (deg * Math.PI) / 180;
      const x1 = 100 + r * Math.cos(rad), y1 = 100 + r * Math.sin(rad);
      const x2 = 100 + tr * Math.cos(rad), y2 = 100 + tr * Math.sin(rad);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#67e8f9" strokeWidth="3" strokeLinecap="round"/>;
    })}

    {/* central chip */}
    <rect x="72" y="72" width="56" height="56" rx="6" fill="#134e4a" stroke="#67e8f9" strokeWidth="2"/>
    <rect x="80" y="80" width="40" height="40" rx="3" fill="#0d9488" stroke="#a7f3d0" strokeWidth="1"/>

    {/* chip pins */}
    {[82,90,98,106,114].map((pos, i) => (
      <React.Fragment key={i}>
        <line x1={pos} y1="72" x2={pos} y2="66" stroke="#67e8f9" strokeWidth="1.5"/>
        <line x1={pos} y1="128" x2={pos} y2="134" stroke="#67e8f9" strokeWidth="1.5"/>
        <line x1="72" y1={pos} x2="66" y2={pos} stroke="#67e8f9" strokeWidth="1.5"/>
        <line x1="128" y1={pos} x2="134" y2={pos} stroke="#67e8f9" strokeWidth="1.5"/>
      </React.Fragment>
    ))}

    {/* inner glow cross */}
    <line x1="100" y1="84" x2="100" y2="116" stroke="#67e8f9" strokeWidth="1.5" opacity="0.7"/>
    <line x1="84"  y1="100" x2="116" y2="100" stroke="#67e8f9" strokeWidth="1.5" opacity="0.7"/>
    <circle cx="100" cy="100" r="6" fill="#67e8f9" opacity="0.9"/>

    {/* small gears */}
    <circle cx="30"  cy="30"  r="14" stroke="#a7f3d0" strokeWidth="1.5" fill="none"/>
    <circle cx="170" cy="30"  r="14" stroke="#a7f3d0" strokeWidth="1.5" fill="none"/>
    <circle cx="30"  cy="170" r="14" stroke="#a7f3d0" strokeWidth="1.5" fill="none"/>
    <circle cx="170" cy="170" r="14" stroke="#a7f3d0" strokeWidth="1.5" fill="none"/>
    {[0,45,90,135,180,225,270,315].map((deg, i) => {
      const corners = [[30,30],[170,30],[30,170],[170,170]];
      return corners.map(([cx,cy], j) => {
        const rad = (deg * Math.PI) / 180;
        return <line key={`${i}-${j}`}
          x1={cx + 14*Math.cos(rad)} y1={cy + 14*Math.sin(rad)}
          x2={cx + 18*Math.cos(rad)} y2={cy + 18*Math.sin(rad)}
          stroke="#a7f3d0" strokeWidth="2" strokeLinecap="round"/>;
      });
    })}

    {/* glow dots */}
    {[[100,10],[100,190],[10,100],[190,100]].map(([x,y],i) => (
      <circle key={i} cx={x} cy={y} r="3" fill="#67e8f9" opacity="0.8"/>
    ))}
  </svg>
);

const Login = () => {
  const { user, login, error, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (user) {
      const rolePath = `/${user.role?.toLowerCase() || 'junior'}`;
      navigate(rolePath, { replace: true });
    }
  }, [user, navigate]);

  // Trap back button immediately to force users out of a dashboard backward loop
  useEffect(() => {
    if (!user) {
      window.history.pushState(null, "", window.location.href);
      window.onpopstate = () => {
        navigate("/", { replace: true });
      };
    }
    
    return () => {
      window.onpopstate = null;
    };
  }, [navigate, user]);

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="spinner"/>
        <p>Authenticating with ShiftSync Agent...</p>
      </div>
    </div>
  );

  if (user) return (
    <div className="loading-screen">
      <div className="loading-content">
        <p style={{ color: '#0d9488', fontWeight: 'bold' }}>✓ Login Successful!</p>
        <p>Redirecting to {user.role?.toUpperCase()} Dashboard...</p>
      </div>
    </div>
  );

  const handleSubmit = (e) => { e.preventDefault(); login(username, password); };

  return (
    <div className="login-page animate-fade-in">
      <div className="login-card-outer">

        {/* ── Left Panel ── */}
        <div className="login-left">
          <CircuitArt />
          <div className="left-text">
            <h2>Propelling Technical Innovation!</h2>
            <p>Ignite your technical purpose, pursue precision engineering, and witness the code-driven transformation.</p>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="login-right">
          <div className="brand-logo">
            <span className="arrow-accent">➤</span> ShiftSync
          </div>

          <h2 className="form-heading">Sign In</h2>
          <p className="form-subheading">Enter your account details to log in</p>

          <form onSubmit={handleSubmit} className="dual-form">
            <div className="input-group">
              <label className="input-label" htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                className="teal-input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password">Password</label>
              <div className="pw-wrapper">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  className="teal-input"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="forgot-row">
              <a href="#" className="forgot-link">Forgot Password?</a>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="teal-btn">Login</button>
          </form>

          <div className="divider-row">
            <hr/><span>Connect with us</span><hr/>
          </div>

          <div className="social-row">
            <a href="#" className="social-icon instagram" title="Instagram">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.014 7.052.072 5.197.157 3.355.673 2.014 2.014.673 3.355.157 5.197.072 7.052.014 8.332 0 8.741 0 12c0 3.259.014 3.668.072 4.948.085 1.855.601 3.697 1.942 5.038 1.341 1.341 3.183 1.857 5.038 1.942C8.332 23.986 8.741 24 12 24s3.668-.014 4.948-.072c1.855-.085 3.697-.601 5.038-1.942 1.341-1.341 1.857-3.183 1.942-5.038.058-1.28.072-1.689.072-4.948s-.014-3.668-.072-4.948c-.085-1.855-.601-3.697-1.942-5.038C20.645.673 18.803.157 16.948.072 15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
            </a>
            <a href="#" className="social-icon youtube" title="YouTube">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
            </a>
            <a href="#" className="social-icon linkedin" title="LinkedIn">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
          </div>

          <p className="register-hint">
            New Technician? <Link to="/signup">Register Here</Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
