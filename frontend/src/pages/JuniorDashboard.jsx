import React, { useState, useEffect, useRef } from 'react';
import { FiSettings, FiPaperclip, FiSend, FiMic, FiPlay, FiPause, FiPlus, FiClock, FiShield, FiLogOut, FiHelpCircle, FiChevronRight } from 'react-icons/fi';
import './JuniorDashboard.css';

const JuniorDashboard = () => {
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const uname = user.username || 'junior';
      const res = await fetch(`/api/v1/sessions/${uname}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSessions(data);
      if (data.length > 0) {
        loadChatThread(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  const loadChatThread = async (sessionId) => {
    try {
      const res = await fetch(`/api/v1/chat/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      // Normalize message structures for rendering
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
      const newSession = await res.json();
      setSessions([newSession, ...sessions]);
      setActiveSession(newSession.id);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create session:', err);
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
      const data = await res.json();
      
      if (data.botMessage) {
        setMessages(prev => [...prev, {
          ...data.botMessage,
          timestamp: new Date().toISOString()
        }]);
      } else {
        // Fallback for simple response or reload thread
        loadChatThread(activeSession);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsLoading(false);
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
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
      audioRef.current.onended = () => setAudioPlaying(null);
      setAudioPlaying(audioUrl);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="shiftsync-layout font-sans">
      {/* Sidebar */}
      <aside className="shiftsync-sidebar border-r border-gray-200">
        <div className="sidebar-header p-6">
          <div className="flex items-center gap-3">
            <div className="logo-circle h-10 w-10 rounded-full flex items-center justify-center text-white font-bold bg-[#E0664E]">SS</div>
            <div className="logo-text">
              <h1 className="text-lg font-bold text-gray-800 leading-tight">ShiftSync AI</h1>
              <p className="text-[10px] text-gray-500 font-mono">TECHNICIAN NODE V4.2</p>
            </div>
          </div>
        </div>

        <div className="px-4 mb-6">
          <button className="new-session-btn w-full flex items-center justify-center gap-2 bg-[#E0664E] text-white py-3 rounded-lg font-medium hover:bg-[#d0553d] transition-colors" onClick={createNewSession}>
            <FiPlus /> New Support Session
          </button>
        </div>

        <nav className="sidebar-nav flex-1 px-4 overflow-y-auto">
          <div className="sidebar-section mb-6">
            <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">CURRENT CHAT</h3>
            {sessions.slice(0, 1).map(sess => (
              <div
                key={sess.id}
                className={`sidebar-item flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${activeSession === sess.id ? 'bg-[#E0664E]/10 text-[#E0664E] font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
                onClick={() => loadChatThread(sess.id)}
              >
                <FiClock className="flex-shrink-0" />
                <span className="truncate text-sm">{sess.title}</span>
              </div>
            ))}
          </div>

          <div className="sidebar-section">
            <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">HISTORY</h3>
            {sessions.slice(1, 10).map(sess => (
              <div
                key={sess.id}
                className="sidebar-item flex items-center gap-3 p-2 rounded-lg cursor-pointer text-gray-500 hover:bg-gray-100 transition-all"
                onClick={() => loadChatThread(sess.id)}
              >
                <FiClock className="flex-shrink-0 text-xs" />
                <span className="truncate text-sm">{sess.title}</span>
              </div>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer p-4 border-t border-gray-100">
          <div className="user-profile flex items-center gap-3 mb-4 p-2">
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">JT</div>
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="overflow-hidden">
              <p className="user-name text-xs font-bold text-gray-800 truncate">Tech ID: 8829</p>
              <p className="user-status text-[10px] text-gray-500">System Online</p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <button className="footer-btn flex items-center gap-2 p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-all"><FiHelpCircle /> Help</button>
            <button className="footer-btn flex items-center gap-2 p-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-all" onClick={() => {
              localStorage.removeItem('shiftsync_token');
              window.location.href = '/login';
            }}><FiLogOut /> Logout</button>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="shiftsync-main flex flex-col bg-[#F8F6F4]">
        <header className="chat-header sticky top-0 z-10 flex items-center justify-between p-6 bg-[#F8F6F4]/80 backdrop-blur-md">
          <div className="header-left">
            <h2 className="text-xl font-bold text-gray-800 leading-tight">
              Welcome Junior, <span className="text-[#E0664E]">how can I assist you today?</span>
            </h2>
            <p className="header-subtitle text-xs text-gray-500 mt-1">
              ShiftSync AI Agent • Active Session
            </p>
          </div>
          <div className="header-right flex items-center gap-4">
            <button className="icon-btn p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-all"><FiSettings /></button>
            <span className="safety-badge flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200 uppercase tracking-tighter">
              <FiShield className="text-xs" /> SAFETY ACTIVE
            </span>
          </div>
        </header>

        <div className="chat-messages flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {messages.map((msg, idx) => (
            <div key={msg.id || idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`message-group flex max-w-[85%] gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                <div className={`avatar-container flex-shrink-0 mt-auto`}>
                  {msg.sender === 'bot' ? (
                    <div className="robot-icon h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-[10px] font-bold">AI</div>
                  ) : (
                    <div className="user-avatar h-8 w-8 rounded-full bg-[#E0664E]/20 flex items-center justify-center text-[#E0664E] text-[10px] font-bold">JT</div>
                  )}
                </div>

                <div className={`message-container flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`message-bubble p-4 rounded-2xl shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-[#E0664E] text-white rounded-tr-none' 
                      : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    
                    {/* Protocol Display */}
                    {msg.protocol && (
                      <div className="protocol-card mt-4 bg-[#F8F6F4] rounded-xl p-4 border border-[#E0664E]/10">
                        <h3 className="protocol-title text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide border-b border-[#E0664E]/10 pb-2">
                          {msg.protocol.title}
                        </h3>
                        <p className="protocol-desc text-xs text-gray-500 mb-4 italic">Follow these steps carefully for safe operation:</p>
                        
                        <div className="protocol-steps space-y-3">
                          {msg.protocol.steps.map((step, i) => (
                            <div key={i} className="flex gap-3">
                              <span className="step-number h-5 w-5 flex-shrink-0 bg-[#E0664E]/10 text-[#E0664E] text-[10px] font-bold rounded flex items-center justify-center border border-[#E0664E]/20">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <span className="step-text text-sm text-gray-700 leading-snug">{step}</span>
                            </div>
                          ))}
                        </div>

                        {/* Audio Player */}
                        {msg.protocol.audioUrl && (
                          <div className="audio-player mt-6 flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <button
                              className="play-btn-coral h-8 w-8 rounded-full bg-[#E0664E] text-white flex items-center justify-center hover:bg-[#d0553d] transition-transform active:scale-95"
                              onClick={() => handlePlayAudio(msg.protocol.audioUrl)}
                            >
                              {audioPlaying === msg.protocol.audioUrl ? <FiPause size={14} /> : <FiPlay size={14} className="ml-0.5" />}
                            </button>
                            <div className="waveform flex-1 flex items-end gap-0.5 h-6">
                              {[...Array(20)].map((_, i) => (
                                <span key={i} className="wave-bar w-0.5 bg-gray-200 rounded-t-full" style={{ height: `${Math.random() * 100}%` }}></span>
                              ))}
                            </div>
                            <span className="audio-time text-[10px] font-mono text-gray-500 tracking-tighter">
                              {msg.protocol.duration || '0:00'}
                            </span>
                          </div>
                        )}

                        {msg.protocol.safetyNote && (
                          <div className="safety-note mt-4 flex items-center gap-2 p-2 bg-yellow-50 text-yellow-700 text-[11px] font-medium rounded-md border border-yellow-100">
                            <FiShield className="flex-shrink-0" /> {msg.protocol.safetyNote}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <span className="message-time text-[9px] font-bold text-gray-400 mt-1.5 uppercase tracking-widest">
                    {msg.sender === 'user' ? 'SENT' : 'RECEIVED'} {formatTime(msg.timestamp)}
                  </span>
                </div>

              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="message-group flex gap-3">
                <div className="robot-icon h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center text-white text-[10px] font-bold">AI</div>
                <div className="message-bubble bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm">
                  <div className="flex gap-1.5 px-1 py-1">
                    <span className="h-1.5 w-1.5 bg-[#E0664E] rounded-full animate-bounce"></span>
                    <span className="h-1.5 w-1.5 bg-[#E0664E] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-1.5 w-1.5 bg-[#E0664E] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Actions */}
        <div className="suggested-actions px-6 py-4 flex gap-2 overflow-x-auto scrollbar-hide">
          <button className="action-pill px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-[#E0664E] hover:text-[#E0664E] transition-all whitespace-nowrap shadow-sm" onClick={() => sendMessage('Troubleshoot Pump 3')}>
            Troubleshoot Pump 3
          </button>
          <button className="action-pill px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-[#E0664E] hover:text-[#E0664E] transition-all whitespace-nowrap shadow-sm" onClick={() => sendMessage('Safety Protocols')}>
            Safety Protocols
          </button>
          <button className="action-pill px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-[#E0664E] hover:text-[#E0664E] transition-all whitespace-nowrap shadow-sm" onClick={() => sendMessage('Request Senior Tech')}>
            Request Senior Tech
          </button>
        </div>

        {/* Input Area */}
        <div className="p-6 pt-0">
          <div className="chat-input-area relative flex items-center bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 pr-2 focus-within:ring-2 focus-within:ring-[#E0664E]/20 transition-all">
            <button className="input-icon-btn p-3 text-gray-400 hover:text-[#E0664E] transition-colors"><FiPaperclip /></button>
            <input
              type="text"
              className="chat-input flex-1 px-2 py-3 text-sm focus:outline-none placeholder-gray-400 text-gray-800"
              placeholder="Type instructions or technical query..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <div className="flex items-center gap-2">
              <button className="input-icon-btn p-3 text-gray-400 hover:text-[#E0664E] transition-colors"><FiMic /></button>
              <button className="send-btn h-10 w-10 flex items-center justify-center bg-[#E0664E] text-white rounded-xl hover:bg-[#d0553d] transition-all transform active:scale-95" onClick={() => sendMessage()}>
                <FiSend size={18} />
              </button>
            </div>
          </div>

          <footer className="chat-footer text-center mt-6 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            END-TO-END ENCRYPTED TECHNICAL SESSION • SHIFTSYNC AI
          </footer>
        </div>
      </main>
    </div>
  );
};

export default JuniorDashboard;

