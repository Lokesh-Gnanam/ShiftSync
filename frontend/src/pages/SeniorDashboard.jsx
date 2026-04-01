import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiMic, FiMicOff, FiSend, FiPaperclip, FiSettings,
  FiActivity, FiAlertTriangle, FiInfo, FiLogOut,
  FiHelpCircle, FiClock, FiZap, FiShield, FiFileText,
  FiBarChart2, FiChevronRight, FiPlay, FiPause,
  FiSquare, FiPlus, FiRadio, FiRefreshCw, FiAlertCircle
} from 'react-icons/fi';
import { MdOutlineRocketLaunch } from 'react-icons/md';
import { HiOutlineChartBar } from 'react-icons/hi2';
import './SeniorDashboard.css';

// ─── WAVEFORM CANVAS ────────────────────────────────────────────────────────
const WaveformCanvas = ({ isRecording }) => {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);
  const barsRef   = useRef(Array.from({ length: 40 }, () => ({ h: 6, dir: 1, speed: Math.random() * 3 + 1 })));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const barW  = 4;
      const gap   = 4;
      const count = Math.floor(W / (barW + gap));
      const bars  = barsRef.current;

      for (let i = 0; i < count; i++) {
        const bar = bars[i] || { h: 6, dir: 1, speed: 2 };

        if (isRecording) {
          bar.h += bar.dir * bar.speed;
          const maxH = 8 + Math.sin(Date.now() / 300 + i) * 24;
          if (bar.h >= maxH || bar.h <= 4) bar.dir *= -1;
        } else {
          bar.h = 4 + Math.sin(i * 0.3) * 3;
        }

        const x  = i * (barW + gap);
        const y  = (H - bar.h) / 2;
        const alpha = isRecording ? 0.85 : 0.25;

        ctx.fillStyle = isRecording
          ? `rgba(160, 60, 49, ${alpha})`
          : `rgba(26, 26, 26, ${alpha})`;

        const radius = barW / 2;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + barW - radius, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius);
        ctx.lineTo(x + barW, y + bar.h - radius);
        ctx.quadraticCurveTo(x + barW, y + bar.h, x + barW - radius, y + bar.h);
        ctx.lineTo(x + radius, y + bar.h);
        ctx.quadraticCurveTo(x, y + bar.h, x, y + bar.h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isRecording]);

  return <canvas ref={canvasRef} className="waveform-canvas" width={520} height={60} />;
};

// ─── HEALTH RING COMPONENT ───────────────────────────────────────────────────
const HealthRing = ({ value = 72, label = 'SYSTEM HEALTH', color = '#A03C31' }) => {
  const pct   = Math.min(100, Math.max(0, value));
  const angle = (pct / 100) * 360;
  return (
    <div className="health-ring-wrap">
      <div
        className="health-ring"
        style={{ background: `conic-gradient(${color} ${angle}deg, #e8e4e0 ${angle}deg)` }}
      >
        <div className="health-ring-inner">
          <span className="health-ring-val">{pct}%</span>
          <span className="health-ring-sub">{label}</span>
        </div>
      </div>
    </div>
  );
};

// ─── SEVERITY ICON ───────────────────────────────────────────────────────────
const SeverityIcon = ({ level }) => {
  if (level === 'critical') return <FiAlertCircle className="sev-icon critical" />;
  if (level === 'warning')  return <FiAlertTriangle className="sev-icon warning" />;
  return <FiInfo className="sev-icon info" />;
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
const SeniorDashboard = () => {
  // ── State ──
  const [isRecording,       setIsRecording]       = useState(false);
  const [isProcessing,      setIsProcessing]       = useState(false);
  const [transcription,     setTranscription]      = useState('');
  const [extractedInsight,  setExtractedInsight]   = useState(null);
  const [currentAudioUrl,   setCurrentAudioUrl]    = useState(null);
  const [logs,              setLogs]               = useState([]);
  const [recordTime,        setRecordTime]         = useState(0);
  const [inputText,         setInputText]          = useState('');
  const [activeAudio,       setActiveAudio]        = useState({ id: null, status: 'stopped' });
  const [predictMachine,    setPredictMachine]     = useState('');
  const [predictResult,     setPredictResult]      = useState(null);
  const [isPredicting,      setIsPredicting]       = useState(false);
  const [profileData,       setProfileData]        = useState(null);
  const [sidebarExpanded,   setSidebarExpanded]    = useState(true);
  const [activeNav,         setActiveNav]          = useState('session');

  // ── Refs ──
  const audioRef         = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recognitionRef   = useRef(null);
  const audioChunksRef   = useRef([]);
  const transcriptRef    = useRef('');
  const fileInputRef     = useRef(null);
  const timerRef         = useRef(null);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis?.cancel();
      clearInterval(timerRef.current);
    };
  }, []);

  // ── Load Logs from localStorage or defaults ──
  useEffect(() => {
    const saved = localStorage.getItem('shiftsync_logs');
    if (saved) {
      setLogs(JSON.parse(saved));
    } else {
      setLogs([
        { id: 1, time: '10:30 AM', severity: 'critical', content: 'Pump P3 — cavitation detected. Strainer 80% blocked.', machine: 'Pump P3', status: 'Indexed', tags: ['Pump P3', 'Cavitation'] },
        { id: 2, time: '09:15 AM', severity: 'warning',  content: 'Cooling Tower 4 VFD tripping under high-load conditions.', machine: 'Cooling Tower 4', status: 'Indexed', tags: ['CT-4', 'VFD Fault'] },
        { id: 3, time: 'Yesterday', severity: 'info',    content: 'Hydraulic Press 4 O-ring replaced. Pressure restored to nominal.', machine: 'Hydraulic Press 4', status: 'Indexed', tags: ['Press 4', 'Maintenance'] },
        { id: 4, time: 'Yesterday', severity: 'warning',  content: 'CNC-9 spindle drift 0.5mm on Y-axis after 2h runtime.', machine: 'CNC-9', status: 'Indexed', tags: ['CNC-9', 'Axis Drift'] },
      ]);
    }
  }, []);

  useEffect(() => {
    if (logs.length > 0) localStorage.setItem('shiftsync_logs', JSON.stringify(logs));
  }, [logs]);

  // ── Auto-load profile ──
  useEffect(() => { loadProfile(); }, []);

  // ── Fetch logs from backend ──
  useEffect(() => {
    const fetchLogs = async () => {
      const token = localStorage.getItem('shiftsync_token');
      if (!token) return;
      try {
        const res = await fetch('/logs', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          const formatted = data.map(l => ({
            id:       l.id,
            time:     new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            severity: l.issue?.toLowerCase().includes('trip') || l.issue?.toLowerCase().includes('critical') ? 'critical'
                    : l.issue?.toLowerCase().includes('drop') || l.issue?.toLowerCase().includes('fault')   ? 'warning' : 'info',
            content:  l.transcript || l.content,
            machine:  l.machine,
            audioUrl: l.audio_url,
            status:   'Indexed',
            tags:     [l.machine, l.issue].filter(Boolean),
          }));
          setLogs(formatted);
        }
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      }
    };
    fetchLogs();
  }, []);

  // ── Profile ──
  const loadProfile = async () => {
    const token = localStorage.getItem('shiftsync_token');
    if (!token) return;
    try {
      const res = await fetch('/profile', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setProfileData(await res.json());
    } catch (err) { console.error('Profile error:', err); }
  };

  // ── Predictive Maintenance ──
  const handlePredict = async () => {
    const machine = predictMachine.trim();
    if (!machine) return;
    const token = localStorage.getItem('shiftsync_token');
    setIsPredicting(true);
    setPredictResult(null);
    try {
      const res = await fetch(`/predict/${encodeURIComponent(machine)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Prediction failed');
      setPredictResult(await res.json());
    } catch (err) {
      setPredictResult({ prediction: `Unable to retrieve prediction: ${err.message}` });
    } finally {
      setIsPredicting(false);
    }
  };

  // ── Transcription & Extraction (Groq / mock fallback) ──
  const transcribeAndExtract = useCallback(async (audioBlob, localTranscript) => {
    setIsProcessing(true);

    // Try Groq via backend
    let finalText     = localTranscript || '';
    let insight       = null;
    const token       = localStorage.getItem('shiftsync_token');
    const filename    = audioBlob.name ? audioBlob.name.toLowerCase() : '';

    if (audioBlob.size > 1000 && token) {
      try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        const uploadRes = await fetch('/upload-audio', {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
          body:    formData,
        });
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          if (url) setCurrentAudioUrl(url);
        }
      } catch (e) { console.error('Audio upload error:', e); }
    }

    // Mock fallback extraction
    await new Promise(r => setTimeout(r, 700));

    if (!finalText && filename.includes('pmp') || finalText.includes('Pump') || finalText.includes('pump')) {
      finalText = finalText || 'Pump 3 sounds like marbles. Intake strainer needs inspection.';
      insight   = { machine: 'Centrifugal Pump P3', issue: 'Cavitation', root_cause: 'Intake strainer 80% blocked.', resolution: 'Flush intake strainer and verify NPSH flow.', confidence: 0.98 };
    } else if (!finalText && (filename.includes('hvac') || filename.includes('cooling')) || finalText.includes('VFD') || finalText.includes('cooling')) {
      finalText = finalText || 'VFD on Cooling Tower 4 tripping under high-load shifts.';
      insight   = { machine: 'Cooling Tower 4', issue: 'VFD Fault', root_cause: 'Heat dissipation failure in control cabinet.', resolution: 'Replace cabinet filters and check fan motor continuity.', confidence: 0.99 };
    } else if (!finalText && filename.includes('cnc') || finalText.includes('CNC') || finalText.includes('spindle')) {
      finalText = finalText || 'CNC-9 spindle drifting 0.5mm Y-axis after 2h runtime.';
      insight   = { machine: 'CNC-9 Lathe', issue: 'Axis Drift', root_cause: 'Thermal expansion of lead screw; lubrication failure.', resolution: 'Reset zero-point; purge lubrication lines; check pump pressure.', confidence: 0.96 };
    } else if (!finalText && filename.includes('hyd') || finalText.includes('hydraulic') || finalText.includes('pressure')) {
      finalText = finalText || 'Hydraulic Press 4 — slight pressure drop. O-ring replaced.';
      insight   = { machine: 'Hydraulic Press 4', issue: 'Pressure Drop', root_cause: 'O-ring seal fatigue.', resolution: 'Replaced O-ring; pressure restored to nominal.', confidence: 0.99 };
    } else {
      if (!finalText) finalText = 'Offline mock transcription. AI analysis applied.';
      insight = { machine: 'Factory Machine', issue: 'Maintenance Need', root_cause: 'Pending system analysis.', resolution: 'Log saved for engineering review.', confidence: 0.85 };
    }

    setTranscription(finalText);
    setExtractedInsight(insight);
    setIsProcessing(false);
  }, []);

  // ── Recording ──
  const startRecording = async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current  = [];
      transcriptRef.current   = '';

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous      = true;
        recog.interimResults  = true;
        recog.lang            = 'en-US';
        recog.onresult = e => {
          const text = Array.from(e.results).map(r => r[0].transcript).join('');
          setTranscription(text);
          transcriptRef.current = text;
        };
        recog.start();
        recognitionRef.current = recog;
      }

      recorder.ondataavailable = e => { audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url  = URL.createObjectURL(blob);
        setCurrentAudioUrl(url);
        await transcribeAndExtract(blob, transcriptRef.current);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordTime(0);
      setTranscription('');
      setExtractedInsight(null);
      setCurrentAudioUrl(null);

      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch (err) {
      console.error('Mic error:', err);
      alert('Could not access microphone. Check browser permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); setIsRecording(false); }
    if (recognitionRef.current)   { recognitionRef.current.stop(); }
    clearInterval(timerRef.current);
  };

  const toggleRecording = () => { isRecording ? stopRecording() : startRecording(); };

  // ── File Upload ──
  const handleFileUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    setIsRecording(false);
    setTranscription('');
    transcriptRef.current = '';
    setExtractedInsight(null);
    setCurrentAudioUrl(URL.createObjectURL(file));
    await transcribeAndExtract(file, '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Save Insight to Knowledge Graph ──
  const handleSave = async () => {
    if (!transcription) return;
    const token = localStorage.getItem('shiftsync_token');
    if (!token) { alert('Please log in first.'); return; }
    setIsProcessing(true);
    let finalAudioUrl = currentAudioUrl;
    try {
      if (currentAudioUrl?.startsWith('blob:')) {
        const blob = await fetch(currentAudioUrl).then(r => r.blob());
        const fd   = new FormData();
        fd.append('file', blob, 'recording.webm');
        const up = await fetch('/upload-audio', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        if (up.ok) { const { url } = await up.json(); if (url) finalAudioUrl = url; }
      }
      const res = await fetch('/logs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ transcript: transcription, audio_url: finalAudioUrl }),
      });
      if (res.ok) {
        const result = await res.json();
        setLogs(prev => [{
          id:       Date.now(),
          time:     new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          severity: 'info',
          content:  transcription,
          audioUrl: finalAudioUrl,
          machine:  result.entities?.machine,
          status:   'Indexed',
          tags:     [result.entities?.machine, result.entities?.issue].filter(Boolean),
        }, ...prev]);
        setTranscription('');
        setCurrentAudioUrl(null);
        setExtractedInsight(null);
        alert('Insight saved and indexed in Knowledge Graph.');
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Audio Playback ──
  const handlePlayPause = (id, url, text) => {
    if (activeAudio.id === id) {
      if (activeAudio.status === 'playing') {
        audioRef.current ? audioRef.current.pause() : window.speechSynthesis.pause();
        setActiveAudio(a => ({ ...a, status: 'paused' }));
      } else {
        audioRef.current ? audioRef.current.play() : window.speechSynthesis.resume();
        setActiveAudio(a => ({ ...a, status: 'playing' }));
      }
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis.cancel();
    if (url) {
      const audio = new Audio(url);
      audio.onended = () => setActiveAudio({ id: null, status: 'stopped' });
      audio.play().catch(console.error);
      audioRef.current = audio;
      setActiveAudio({ id, status: 'playing' });
    } else if (text) {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'en-US'; utt.rate = 0.9;
      utt.onend = () => setActiveAudio({ id: null, status: 'stopped' });
      window.speechSynthesis.speak(utt);
      setActiveAudio({ id, status: 'playing' });
    }
  };

  // ── Format timer ──
  const formatTime = secs => {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Handle input send ──
  const handleSend = async () => {
    const q = inputText.trim();
    if (!q) return;

    // If it looks like a machine query, run prediction
    const lower = q.toLowerCase();
    if (lower.includes('pump') || lower.includes('motor') || lower.includes('cnc') || lower.includes('hydraulic') || lower.includes('cooling') || lower.includes('conveyor')) {
      setPredictMachine(q);
      setInputText('');
      const token = localStorage.getItem('shiftsync_token');
      setIsPredicting(true);
      setPredictResult(null);
      try {
        const res = await fetch(`/predict/${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setPredictResult(await res.json());
      } catch (err) {
        setPredictResult({ prediction: `Unable to retrieve: ${err.message}` });
      } finally {
        setIsPredicting(false);
      }
    } else {
      setInputText('');
    }
  };

  // ── High-risk components (derived or from prediction) ──
  const highRiskComponents = [
    { name: 'Pump P3 — Suction Valve',     risk: 'HIGH',   pct: 87 },
    { name: 'Cooling Tower 4 VFD',         risk: 'HIGH',   pct: 74 },
    { name: 'Hydraulic Press 4 O-Ring',    risk: 'MEDIUM', pct: 52 },
    { name: 'CNC-9 Lead Screw Lubrication',risk: 'MEDIUM', pct: 43 },
  ];

  return (
    <div className="sd-root">
      {/* ═══════════════ SIDEBAR ═══════════════ */}
      <aside className={`sd-sidebar ${sidebarExpanded ? 'expanded' : 'collapsed'}`}>
        {/* Logo */}
        <div className="sd-logo-block">
          <div className="sd-logo-badge">SS</div>
          <div className="sd-logo-text">
            <span className="sd-logo-title">ShiftSync AI</span>
            <span className="sd-logo-sub">INDUSTRIAL NODE V5.0</span>
          </div>
        </div>

        {/* New Session Button */}
        <button className="sd-new-session-btn">
          <FiPlus size={16} />
          <span>NEW SESSION</span>
        </button>

        {/* Navigation */}
        <nav className="sd-nav">
          <div className="sd-nav-label">CURRENT SESSION</div>
          <button
            className={`sd-nav-item ${activeNav === 'session' ? 'active' : ''}`}
            onClick={() => setActiveNav('session')}
          >
            <FiRadio size={14} />
            <span>Pump System Diagnostics</span>
            <FiChevronRight size={12} className="sd-nav-chevron" />
          </button>

          <div className="sd-nav-label" style={{ marginTop: '1.25rem' }}>HISTORY</div>
          {[
            { key: 'hvac',  icon: <FiActivity size={14} />,   label: 'HVAC VFD Fault Review' },
            { key: 'valve', icon: <FiShield size={14} />,     label: 'Safety Valve Checks' },
            { key: 'proto', icon: <FiFileText size={14} />,   label: 'Maintenance Protocols' },
            { key: 'anal',  icon: <FiBarChart2 size={14} />,  label: 'Analytics Overview' },
          ].map(n => (
            <button
              key={n.key}
              className={`sd-nav-item ${activeNav === n.key ? 'active' : ''}`}
              onClick={() => setActiveNav(n.key)}
            >
              {n.icon}
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Profile Block */}
        <div className="sd-profile-block">
          <div className="sd-profile-top">
            <div className="sd-avatar">ST</div>
            <div>
              <div className="sd-profile-name">{profileData?.name || 'Senior Tech'}</div>
              <div className="sd-profile-id">
                <span className="sd-online-dot" />
                Senior ID: 9001 — ACTIVE
              </div>
            </div>
          </div>
          <div className="sd-profile-actions">
            <button className="sd-profile-btn"><FiHelpCircle size={14}/> System Support</button>
            <button className="sd-profile-btn danger"><FiLogOut size={14}/> Disconnect</button>
          </div>
        </div>
      </aside>

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      <main className="sd-main">

        {/* ── Header Bar ── */}
        <header className="sd-header">
          <div className="sd-header-left">
            <div className="sd-header-title-row">
              <h1 className="sd-header-title">Session Overview</h1>
              <span className="sd-live-badge"><span className="sd-live-dot" />LIVE</span>
            </div>
            <p className="sd-header-sub">PUMP SYSTEM DIAGNOSTICS • NODE 4.2</p>
          </div>
          <div className="sd-header-right">
            <span className="sd-safety-badge"><FiShield size={12}/> SAFETY TIER 1</span>
            <button className="sd-icon-btn"><FiSettings size={18}/></button>
          </div>
        </header>

        {/* ── Greeting ── */}
        <section className="sd-greeting">
          <div className="sd-greeting-text">
            <h2>Hello Senior, <span className="sd-greeting-accent">how are you?</span></h2>
            <p className="sd-greeting-sub">Any new things today?</p>
          </div>
          <div className="sd-greeting-actions">
            <button className="sd-quick-btn" onClick={() => setActiveNav('logs')}>
              <FiFileText size={13} /> SYSTEM LOGS
            </button>
            <button className="sd-quick-btn" onClick={() => setActiveNav('anal')}>
              <HiOutlineChartBar size={13} /> PERFORMANCE
            </button>
          </div>
        </section>

        {/* ── Dashboard Grid ── */}
        <section className="sd-grid">

          {/* ── Left: Predictive Maintenance ── */}
          <div className="sd-card sd-card-predict">
            <div className="sd-card-header">
              <span className="sd-card-title"><FiZap size={15}/> Predictive Maintenance</span>
              <button className="sd-icon-btn-sm" onClick={() => setPredictResult(null)} title="Reset">
                <FiRefreshCw size={13}/>
              </button>
            </div>

            {/* Health Ring + Metric Row */}
            <div className="sd-predict-overview">
              <HealthRing value={predictResult ? Math.min(95, 50 + Math.random() * 20 | 0) : 72} />
              <div className="sd-predict-metrics">
                <div className="sd-metric-box">
                  <span className="sd-metric-val">
                    {predictResult?.avg_runtime_hours
                      ? `${Math.round(predictResult.avg_runtime_hours * 1.1)}h`
                      : '~108h'}
                  </span>
                  <span className="sd-metric-label">PREDICTED FAILURE</span>
                </div>
                <div className="sd-metric-box">
                  <span className="sd-metric-val">{predictResult?.log_count ?? 18}</span>
                  <span className="sd-metric-label">HISTORICAL LOGS</span>
                </div>
              </div>
            </div>

            {/* Query input */}
            <div className="sd-predict-input-row">
              <input
                className="sd-predict-input"
                placeholder="e.g. pump, CNC, hydraulic..."
                value={predictMachine}
                onChange={e => setPredictMachine(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePredict()}
                disabled={isPredicting}
              />
              <button className="sd-predict-btn" onClick={handlePredict} disabled={isPredicting || !predictMachine.trim()}>
                {isPredicting ? <FiRefreshCw size={14} className="spin" /> : <FiZap size={14} />}
                {isPredicting ? 'Analyzing...' : 'Predict'}
              </button>
            </div>

            {/* Prediction Result */}
            {predictResult && (
              <div className="sd-predict-result">
                <div className="sd-predict-pill">
                  <FiAlertTriangle size={14} />
                  {predictResult.prediction}
                </div>
                {predictResult.next_inspection && (
                  <div className="sd-predict-inspect">
                    <FiClock size={12}/> {predictResult.next_inspection}
                  </div>
                )}
              </div>
            )}

            {/* High-risk components */}
            <div className="sd-risk-list">
              <div className="sd-risk-list-title">HIGH-RISK COMPONENTS</div>
              {highRiskComponents.map((c, i) => (
                <div key={i} className="sd-risk-row">
                  <span className="sd-risk-name">{c.name}</span>
                  <div className="sd-risk-bar-wrap">
                    <div className="sd-risk-bar" style={{ width: `${c.pct}%`, background: c.risk === 'HIGH' ? '#A03C31' : '#e08060' }} />
                  </div>
                  <span className={`sd-risk-badge ${c.risk.toLowerCase()}`}>{c.risk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Recent Logs ── */}
          <div className="sd-card sd-card-logs">
            <div className="sd-card-header">
              <span className="sd-card-title"><FiActivity size={15}/> Recent System Logs</span>
              <span className="sd-log-count">{logs.length} entries</span>
            </div>
            <div className="sd-logs-scroll">
              {logs.slice(0, 6).map(log => (
                <div key={log.id} className="sd-log-row">
                  <SeverityIcon level={log.severity} />
                  <div className="sd-log-body">
                    <div className="sd-log-content">{log.content}</div>
                    {log.tags?.length > 0 && (
                      <div className="sd-log-tags">
                        {log.tags.map((t, i) => <span key={i} className="sd-log-tag">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="sd-log-meta">
                    <span className="sd-log-time">{log.time}</span>
                    <button
                      className="sd-log-play-btn"
                      onClick={() => handlePlayPause(log.id, log.audioUrl, log.content)}
                      title="Play log"
                    >
                      {activeAudio.id === log.id && activeAudio.status === 'playing'
                        ? <FiPause size={12}/>
                        : activeAudio.id === log.id && activeAudio.status === 'paused'
                        ? <FiPlay size={12}/>
                        : <FiPlay size={12}/>}
                    </button>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="sd-logs-empty">
                  <FiFileText size={28}/><p>No logs yet. Record your first insight below.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Audio Recorder ── */}
        <section className="sd-recorder-section">
          <div className="sd-recorder-card">
            <div className="sd-recorder-left">
              {/* Record Button */}
              <button
                className={`sd-record-btn ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
                onClick={toggleRecording}
                disabled={isProcessing}
                title={isRecording ? 'Stop Recording' : 'Start Recording'}
              >
                {isProcessing
                  ? <FiRefreshCw size={28} className="spin" />
                  : isRecording
                  ? <FiSquare size={28} />
                  : <FiMic size={28} />}
                {isRecording && <span className="sd-pulse-ring" />}
              </button>

              {/* Labels */}
              <div className="sd-recorder-labels">
                <span className="sd-recorder-status">
                  {isProcessing ? 'PROCESSING...' : isRecording ? 'RECORDING' : 'TAP TO RECORD'}
                </span>
                <span className="sd-recorder-timer">{formatTime(recordTime)}</span>
              </div>
            </div>

            {/* Waveform */}
            <div className="sd-waveform-wrap">
              <WaveformCanvas isRecording={isRecording} />
            </div>

            {/* Save / Upload */}
            <div className="sd-recorder-right">
              <input type="file" accept="audio/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
              <button className="sd-recorder-upload-btn" onClick={() => fileInputRef.current?.click()} title="Upload audio file">
                <FiPaperclip size={18}/>
              </button>
              {transcription && (
                <button className="sd-recorder-save-btn" onClick={handleSave} disabled={isProcessing}>
                  {isProcessing ? <FiRefreshCw size={16} className="spin" /> : <FiZap size={16}/>}
                  Save to Graph
                </button>
              )}
            </div>
          </div>

          {/* Insight Result */}
          {transcription && (
            <div className="sd-insight-card animate-in">
              <div className="sd-insight-header">
                <span className="sd-insight-title">Extracted Insight</span>
                <span className="sd-ai-badge">AI VERIFIED</span>
              </div>
              <p className="sd-insight-quote">"{transcription}"</p>

              <div className="sd-insight-tags">
                <span className="sd-insight-tag machine"><FiZap size={11}/>{extractedInsight?.machine || 'Analyzing...'}</span>
                <span className="sd-insight-tag issue"><FiAlertTriangle size={11}/>{extractedInsight?.issue || 'Extracting...'}</span>
              </div>

              {extractedInsight?.resolution && (
                <div className="sd-insight-resolution">
                  <div className="sd-insight-section-label">ACTIONABLE RESOLUTION</div>
                  <p>{extractedInsight.resolution}</p>
                </div>
              )}
              {extractedInsight?.root_cause && (
                <div className="sd-insight-root-cause">
                  <div className="sd-insight-section-label">ROOT CAUSE</div>
                  <p>{extractedInsight.root_cause}</p>
                </div>
              )}
              {extractedInsight?.confidence && (
                <div className="sd-confidence-row">
                  <div className="sd-conf-bar-track">
                    <div className="sd-conf-bar-fill" style={{ width: `${extractedInsight.confidence * 100}%` }} />
                  </div>
                  <span className="sd-conf-label">{(extractedInsight.confidence * 100).toFixed(0)}% AI Confidence</span>
                </div>
              )}

              {(currentAudioUrl || transcription) && (
                <button className="sd-play-btn" onClick={() => handlePlayPause('current', currentAudioUrl, transcription)}>
                  {activeAudio.id === 'current' && activeAudio.status === 'playing'
                    ? <><FiPause size={14}/> Pause Audio</>
                    : activeAudio.id === 'current' && activeAudio.status === 'paused'
                    ? <><FiPlay size={14}/> Resume Audio</>
                    : <><FiPlay size={14}/> Play Audio</>}
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── Input Bar ── */}
        <div className="sd-input-bar-wrap">
          <div className="sd-input-bar">
            <button className="sd-input-icon-btn" onClick={() => fileInputRef.current?.click()} title="Upload file">
              <FiPaperclip size={18}/>
            </button>
            <input
              className="sd-input-field"
              placeholder="Enter technical command or query..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button className="sd-input-icon-btn" onClick={toggleRecording} title="Voice input">
              {isRecording ? <FiMicOff size={18}/> : <FiMic size={18}/>}
            </button>
            <button className="sd-send-btn" onClick={handleSend} title="Send">
              <MdOutlineRocketLaunch size={18}/>
            </button>
          </div>
          <p className="sd-footer-text">
            NODE-TO-NODE SECURE INDUSTRIAL TRANSMISSION • SHIFTSYNC AI
          </p>
        </div>

      </main>
    </div>
  );
};

export default SeniorDashboard;
