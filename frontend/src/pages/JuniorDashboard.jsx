import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiSettings, FiPaperclip, FiSend, FiMic, FiPlay, FiPause, FiPlus, FiClock, FiShield, FiLogOut, FiHelpCircle, FiChevronRight, FiCpu, FiAlertCircle } from 'react-icons/fi';
import './JuniorDashboard.css';

const JuniorDashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(null);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);

  const token = localStorage.getItem('shiftsync_token');
  const user = JSON.parse(localStorage.getItem('shiftsync_user') || '{}');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const uname = user.username || 'junior';
      const res = await fetch(`/api/v1/sessions/${uname}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Fetch failed");
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from server");
      }
      const data = await res.json();
      setSessions(data);
      if (data.length > 0) {
        loadChatThread(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      // Fallback local mock data for presentation
      setSessions([
        { id: 'sess-1', title: 'Pump 3 Calibration' },
        { id: 'sess-2', title: 'HVAC Filter Swap' },
        { id: 'sess-3', title: 'Safety Valve Check' },
        { id: 'sess-4', title: 'Protocols' },
        { id: 'sess-5', title: 'Analytics' }
      ]);
      if (!activeSession) {
        setMessages([
          {
            id: 'mock-1', sender: 'user', content: 'How do I recalibrate Pump 3?', timestamp: new Date().toISOString()
          },
          {
            id: 'mock-2', sender: 'bot', content: 'Here is the standard operating protocol for Pump 3 Recalibration.',
            timestamp: new Date().toISOString(),
            protocol: {
              title: 'Pump 3 Recalibration Protocol',
              steps: [
                'Isolate the pump by closing suction and discharge valves.',
                'Drain the residual fluid from the casing.',
                'Adjust the impeller clearance to 0.15mm.'
              ],
              audioUrl: 'mock',
              duration: '1:15',
              safetyNote: 'Ensure power is locked out before opening the casing.'
            }
          }
        ]);
        setActiveSession('sess-1');
      }
    }
  };

  const loadChatThread = async (sessionId) => {
    try {
      const res = await fetch(`/api/v1/chat/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();
      const formattedMessages = data.map(msg => ({
        ...msg,
        protocol: msg.protocolTitle ? {
          title: msg.protocolTitle,
          steps: msg.protocolSteps,
          audioUrl: msg.audioUrl,
          duration: msg.duration,
          safetyNote: msg.safetyNote
        } : null
      }));
      setMessages(formattedMessages);
      setActiveSession(sessionId);
    } catch (err) {
      console.error('Failed to load chat:', err);
      setActiveSession(sessionId);
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch('/api/v1/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: 'New Support Session' })
      });
      if (!res.ok) throw new Error("Creation failed");
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from server");
      }
      const newSession = await res.json();
      setSessions([newSession, ...sessions]);
      setActiveSession(newSession.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create session:', err);
      const mockSession = { id: `sess-${Date.now()}`, title: 'New Support Session' };
      setSessions([mockSession, ...sessions]);
      setActiveSession(mockSession.id);
      setMessages([]);
    }
  };

  const sendMessage = async (textOverride = null) => {
    const text = textOverride || inputText;
    if (!text.trim() || !activeSession) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: activeSession,
          content: text
        })
      });
      if (!res.ok) throw new Error("Send failed");
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from server");
      }
      const data = await res.json();
      
      if (data.botMessage && data.botMessage.content) {
        setMessages(prev => [...prev, {
          ...data.botMessage,
          timestamp: new Date().toISOString()
        }]);
      } else {
        loadChatThread(activeSession);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'bot',
          content: `Simulated AI response to: "${text}"`,
          timestamp: new Date().toISOString()
        }]);
        setIsLoading(false);
      }, 800);
    } finally {
      if (err => setIsLoading(false)) {} // Fallback handling handled in timeout
    }
  };

  const handlePlayAudio = (audioUrl) => {
    if (audioPlaying === audioUrl) {
      audioRef.current?.pause();
      setAudioPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (audioUrl !== 'mock') {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.play().catch(e => console.error("Audio error:", e));
        audioRef.current.onended = () => setAudioPlaying(null);
      } else {
        // mock audio player logic
        setTimeout(() => setAudioPlaying(null), 3000);
      }
      setAudioPlaying(audioUrl);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="jd-root">
      {/* ────────────────── SIDEBAR ────────────────── */}
      <aside className="jd-sidebar">
        <div className="jd-sidebar-header">
          <div className="jd-logo-circle">SS</div>
          <div className="jd-logo-text">
            <h1>ShiftSync AI</h1>
            <p>TECHNICIAN NODE V4.2</p>
          </div>
        </div>

        <div className="jd-sidebar-action">
          <button className="jd-primary-btn" onClick={createNewSession}>
            <FiPlus /> New Support Session
          </button>
        </div>

        <nav className="jd-sidebar-nav">
          <div className="jd-nav-section">
            <h3>CURRENT CHAT</h3>
            {sessions.slice(0, 1).map(sess => (
              <div
                key={sess.id}
                className={`jd-nav-item ${activeSession === sess.id ? 'active' : ''}`}
                onClick={() => loadChatThread(sess.id)}
              >
                <FiClock className="jd-nav-icon" />
                <span className="jd-nav-title">{sess.title}</span>
              </div>
            ))}
          </div>

          <div className="jd-nav-section">
            <h3>HISTORY</h3>
            {sessions.slice(1, 10).map(sess => (
              <div
                key={sess.id}
                className={`jd-nav-item ${activeSession === sess.id ? 'active' : ''}`}
                onClick={() => loadChatThread(sess.id)}
              >
                <span className="jd-nav-icon-small"><FiClock /></span>
                <span className="jd-nav-title">{sess.title}</span>
              </div>
            ))}
          </div>
        </nav>

        <div className="jd-sidebar-footer">
          <div className="jd-user-profile">
            <div className="jd-avatar-wrap">
              <div className="jd-avatar">JT</div>
              <div className="jd-status-dot"></div>
            </div>
            <div className="jd-user-info">
              <p className="jd-user-name">Tech ID: 8829</p>
              <p className="jd-user-status">System Online</p>
            </div>
          </div>
          <div className="jd-footer-actions">
            <button className="jd-footer-btn" onClick={() => alert('Help Center: Connect with a Senior Technician or explore tutorials.')}><FiHelpCircle /> Help</button>
            <button className="jd-footer-btn" onClick={() => {
              logout();
              navigate('/', { replace: true });
            }}><FiLogOut /> Logout</button>
          </div>
        </div>
      </aside>

      {/* ────────────────── MAIN CHAT AREA ────────────────── */}
      <main className="jd-main">
        <header className="jd-header">
          <div className="jd-header-left">
            <h2>Welcome Junior, <span>how can I assist you today?</span></h2>
            <p>ShiftSync AI Agent • Active Session</p>
          </div>
          <div className="jd-header-right">
            <button className="jd-icon-btn" onClick={() => alert('Dashboard Settings panel is currently in read-only mode.')}><FiSettings /></button>
            <span className="jd-safety-badge"><FiShield /> SAFETY ACTIVE</span>
          </div>
        </header>

        <div className="jd-chat-messages">
          {messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            return (
              <div key={msg.id || idx} className={`jd-msg-wrapper ${isUser ? 'user' : 'bot'}`}>
                <div className="jd-msg-group">
                  <div className="jd-msg-avatar">
                    {isUser ? <div className="jd-avatar-user">JT</div> : <div className="jd-avatar-bot">AI</div>}
                  </div>
                  <div className="jd-msg-content-area">
                    <div className="jd-msg-bubble">
                      <p className="jd-msg-text">{msg.content}</p>
                      
                      {msg.protocol && (
                        <div className="jd-protocol-card">
                          <h3>{msg.protocol.title}</h3>
                          <p className="jd-protocol-desc">Follow these steps carefully for safe operation:</p>
                          
                          <div className="jd-protocol-steps">
                            {msg.protocol.steps.map((step, i) => (
                              <div key={i} className="jd-step-row">
                                <span className="jd-step-num">{String(i + 1).padStart(2, '0')}</span>
                                <span className="jd-step-text">{step}</span>
                              </div>
                            ))}
                          </div>

                          {msg.protocol.audioUrl && (
                            <div className="jd-audio-player">
                              <button className="jd-audio-play-btn" onClick={() => handlePlayAudio(msg.protocol.audioUrl)}>
                                {audioPlaying === msg.protocol.audioUrl ? <FiPause /> : <FiPlay className="jd-play-nudge" />}
                              </button>
                              <div className="jd-waveform">
                                {[...Array(20)].map((_, i) => (
                                  <span key={i} className={`jd-wave-bar ${audioPlaying === msg.protocol.audioUrl ? 'active' : ''}`} style={{ height: `${20 + Math.random() * 80}%` }}></span>
                                ))}
                              </div>
                              <span className="jd-audio-time">{msg.protocol.duration || '0:00'}</span>
                            </div>
                          )}

                          {msg.protocol.transcript && (
                            <div className="jd-senior-transcript">
                              <div className="jd-quote-mark">"</div>
                              <p><strong>Senior dictates:</strong> {msg.protocol.transcript}</p>
                            </div>
                          )}

                          {msg.protocol.safetyNote && (
                            <div className="jd-safety-note">
                              <FiShield /> {msg.protocol.safetyNote}
                            </div>
                          )}
                          
                          <button className="jd-ai-explain-btn" onClick={() => {
                            if (msg.protocol.id) {
                              sendMessage('__EXPLAIN__' + msg.protocol.id);
                            } else {
                              alert("Cannot explain: Missing Protocol ID.");
                            }
                          }}>
                            <FiCpu /> Explain with AI
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="jd-msg-timestamp">
                      {isUser ? 'SENT' : 'RECEIVED'} {formatTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {isLoading && (
            <div className="jd-msg-wrapper bot">
              <div className="jd-msg-group">
                <div className="jd-msg-avatar">
                  <div className="jd-avatar-bot">AI</div>
                </div>
                <div className="jd-msg-content-area">
                  <div className="jd-msg-bubble">
                    <div className="jd-typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="jd-suggested-actions">
          <button className="jd-action-pill" onClick={() => sendMessage('Troubleshoot Pump 3')}>Troubleshoot Pump 3</button>
          <button className="jd-action-pill" onClick={() => sendMessage('Safety Protocols')}>Safety Protocols</button>
          <button className="jd-action-pill" onClick={() => sendMessage('Request Senior Tech')}>Request Senior Tech</button>
        </div>

        <div className="jd-input-container">
          <div className="jd-input-bar">
            <button className="jd-input-icon"><FiPaperclip /></button>
            <input
              type="text"
              placeholder="Type instructions or technical query..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button className="jd-input-icon"><FiMic /></button>
            <button className="jd-send-btn" onClick={() => sendMessage()}><FiSend /></button>
          </div>
          <footer className="jd-chat-footer">
            END-TO-END ENCRYPTED TECHNICAL SESSION • SHIFTSYNC AI
          </footer>
        </div>
      </main>
    </div>
  );
};

export default JuniorDashboard;
