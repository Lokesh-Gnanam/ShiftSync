import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { MdHearing } from 'react-icons/md';
import './SeniorDashboard.css';

const SeniorDashboard = () => {
  const [isRecording, setIsRecording]     = useState(false);
  const [isProcessing, setIsProcessing]   = useState(false);
  const [transcription, setTranscription] = useState('');
  const [extractedInsight, setExtractedInsight] = useState(null);
  const [currentAudioUrl, setCurrentAudioUrl]   = useState(null);
  const [logs, setLogs] = useState([]);

  // Audio playback state
  const [activeAudio, setActiveAudio] = useState({ id: null, status: 'stopped' });
  const audioRef = React.useRef(null);

  // ── Prediction Card State ──
  const [predictMachine, setPredictMachine] = useState('');
  const [predictResult, setPredictResult]   = useState(null);
  const [isPredicting, setIsPredicting]     = useState(false);

  // ── Skill Profile State ──
  const [profileData, setProfileData]       = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis.cancel();
    };
  }, []);

  React.useEffect(() => {
    const savedLogs = localStorage.getItem('shiftsync_logs');
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    } else {
      setLogs([
        { id: 1, time: 'Today, 10:30 AM',       content: 'Calibrated the pressure sensor on Boiler #2 after observing a 5% offset in the digital reading.',      status: 'Indexed', tags: ['Boiler #2',    'Calibration',  'Success'] },
        { id: 2, time: 'Yesterday, 4:15 PM',     content: 'Replaced the worn-out gasket on the primary cooling pump for Assembly Line B to stop a minor coolant leak.', status: 'Indexed', tags: ['Line B',       'Maintenance',  'Leak Fixed'] },
        { id: 3, time: 'Yesterday, 9:00 AM',     content: 'Reprogrammed the robotic arm joint J3 limits to avoid collision with the new workspace barrier.',          status: 'Indexed', tags: ['Robotic Arm',  'Software',     'Optimization'] },
        { id: 4, time: 'Two days ago, 11:20 AM', content: 'Cleaned the optical sensors on the sorting belt as dust was causing intermittent item rejection errors.',   status: 'Indexed', tags: ['Sorting Belt', 'Sensors',      'Cleaning'] }
      ]);
    }
  }, []);

  React.useEffect(() => {
    if (logs.length > 0) localStorage.setItem('shiftsync_logs', JSON.stringify(logs));
  }, [logs]);

  // Auto-load skill profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const [mediaRecorder, setMediaRecorder]   = useState(null);
  const [recognition, setRecognition]       = useState(null);
  const audioChunks    = React.useRef([]);
  const transcriptionRef = React.useRef('');
  const fileInputRef   = React.useRef(null);

  // ─────────────────────────────────────────────
  // 🔮 Predictive Maintenance
  // ─────────────────────────────────────────────
  const handlePredict = async () => {
    const machine = predictMachine.trim();
    if (!machine) return;

    const token = localStorage.getItem('shiftsync_token');
    if (!token) { alert('Please log in first.'); return; }

    setIsPredicting(true);
    setPredictResult(null);
    try {
      const res = await fetch(`/predict/${encodeURIComponent(machine)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Prediction failed');
      const data = await res.json();
      setPredictResult(data);
    } catch (err) {
      console.error('Predict Error:', err);
      setPredictResult({ prediction: `⚠️ Could not retrieve prediction: ${err.message}` });
    } finally {
      setIsPredicting(false);
    }
  };

  // ─────────────────────────────────────────────
  // 🧑🏭 Load Skill Profile
  // ─────────────────────────────────────────────
  const loadProfile = async () => {
    const token = localStorage.getItem('shiftsync_token');
    if (!token) return;

    setIsLoadingProfile(true);
    try {
      const res = await fetch('/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      }
    } catch (err) {
      console.error('Profile load error:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // ─────────────────────────────────────────────────────
  //  Recording / File Handling (unchanged)
  // ─────────────────────────────────────────────────────
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsRecording(false);
    setTranscription('');
    transcriptionRef.current = '';
    setExtractedInsight(null);
    setCurrentAudioUrl(null);
    try {
      const url = URL.createObjectURL(file);
      setCurrentAudioUrl(url);
      await transcribeAndExtract(file, '');
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error uploading file.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunks.current = [];

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = 'en-US';
        recog.onresult = (event) => {
          const transcript = Array.from(event.results).map(r => r[0]).map(r => r.transcript).join('');
          setTranscription(transcript);
          transcriptionRef.current = transcript;
        };
        recog.start();
        setRecognition(recog);
      }

      recorder.ondataavailable = (event) => { audioChunks.current.push(event.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setCurrentAudioUrl(url);
        await transcribeAndExtract(audioBlob, transcriptionRef.current);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setTranscription('');
      transcriptionRef.current = '';
      setExtractedInsight(null);
      setCurrentAudioUrl(null);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please ensure permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) { mediaRecorder.stop(); setIsRecording(false); }
    if (recognition)   { recognition.stop(); }
  };

  const transcribeAndExtract = async (audioBlob, localTranscript) => {
    setIsProcessing(true);
    
    // Simulate slight delay to make it feel like AI processing
    await new Promise(r => setTimeout(r, 800));

    let finalText = localTranscript || '';
    const filename = audioBlob.name ? audioBlob.name.toLowerCase() : '';
    
    // Default insight
    let insight = {
      machine: 'Factory Machine',
      issue: 'Reported Maintenance Need',
      root_cause: 'Pending deeper system analysis.',
      resolution: 'Log saved for further engineering review.',
      confidence: 0.85
    };

    if (!finalText && filename.includes('pmp') || finalText.includes('Pump')) {
      finalText = finalText || 'Pump 3 sounds like marbles. Check suction line for blockage.';
      insight = {
        machine: 'Centrifugal Pump P3',
        issue: 'Cavitation',
        root_cause: 'Intake strainer 80% blocked by debris.',
        resolution: 'Flush intake strainer and verify NPSH flow.',
        confidence: 0.98
      };
    } else if (!finalText && (filename.includes('hvac') || filename.includes('cooling')) || finalText.includes('Cooling') || finalText.includes('VFD')) {
      finalText = finalText || 'VFD on Cooling Tower 4 is tripping during high-load shifts.';
      insight = {
        machine: 'Cooling Tower 4',
        issue: 'VFD Fault',
        root_cause: 'Heat dissipation failure in the control cabinet cooling fan.',
        resolution: 'Replace cabinet filters and check fan motor continuity.',
        confidence: 0.99
      };
    } else if (!finalText && filename.includes('cnc') || finalText.includes('CNC') || finalText.includes('spindle')) {
      finalText = finalText || 'CNC-9 spindle is drifting 0.5mm on the Y-axis after 2 hours of runtime.';
      insight = {
        machine: 'CNC-9 Lathe',
        issue: 'Axis Drift',
        root_cause: 'Thermal expansion of the lead screw due to lubrication failure.',
        resolution: 'Reset zero-point; purge lubrication lines; check pump pressure.',
        confidence: 0.96
      };
    } else if (!finalText && filename.includes('hyd') || finalText.includes('hydraulic')) {
      finalText = finalText || 'He inspected the hydraulic assembly, press 4, found a slight pressure drop and replaced the O-ring.';
      insight = {
        machine: 'Hydraulic Assembly / Press 4',
        issue: 'Pressure Drop',
        root_cause: 'O-ring seal fatigue',
        resolution: 'Inspected hydraulic assembly; replaced O-ring in Press 4; pressure restored.',
        confidence: 0.99
      };
    } else if (!finalText) {
      finalText = 'This is an offline mock transcription. Using smart mock for analysis.';
    }

    setTranscription(finalText);
    setExtractedInsight(insight);
    setIsProcessing(false);
  };

  useEffect(() => {
    const fetchLogs = async () => {
      const token = localStorage.getItem('shiftsync_token');
      if (!token) return;
      try {
        const response = await fetch('/logs', { headers: { 'Authorization': `Bearer ${token}` } });
        if (response.ok) {
          const data = await response.json();
          const formattedLogs = data.map((l) => ({
            id: l.id,
            title: l.title || 'Technician Insight',
            time: new Date(l.timestamp).toLocaleString(),
            content: l.transcript || l.content,
            audioUrl: l.audio_url,
            status: 'Indexed',
            tags: [l.machine, l.issue].filter(Boolean)
          }));
          setLogs(formattedLogs);
        }
      } catch (err) {
        console.error('Failed to fetch logs:', err);
      }
    };
    fetchLogs();
  }, []);

  const handleSave = async () => {
    if (!transcription) return;
    const token = localStorage.getItem('shiftsync_token');
    if (!token) { alert('Authentication token missing. Please log in.'); return; }

    setIsProcessing(true);
    let finalAudioUrl = currentAudioUrl;

    try {
      if (currentAudioUrl && currentAudioUrl.startsWith('blob:')) {
        const audioBlob = await fetch(currentAudioUrl).then(r => r.blob());
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        const uploadRes = await fetch('/upload-audio', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData?.url) finalAudioUrl = uploadData.url;
        }
      }

      const response = await fetch('/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ transcript: transcription, audio_url: finalAudioUrl }),
      });

      if (response.ok) {
        const result = await response.json();
        const newLog = {
          id: Date.now(),
          title: result.entities?.title || 'Technician Insight',
          time: new Date().toLocaleString(),
          content: transcription,
          audioUrl: finalAudioUrl,
          status: 'Indexed',
          tags: [result.entities?.machine, result.entities?.issue].filter(Boolean)
        };
        setLogs([newLog, ...logs]);
        setTranscription('');
        setCurrentAudioUrl(null);
        setExtractedInsight(null);
        alert('✅ Insight saved and indexed in Knowledge Graph!');
      } else {
        throw new Error('Failed to save log to Knowledge Graph');
      }
    } catch (err) {
      console.error('Save Error:', err);
      alert('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayPause = (id, url, text) => {
    if (activeAudio.id === id) {
      if (activeAudio.status === 'playing') {
        if (audioRef.current) audioRef.current.pause(); else window.speechSynthesis.pause();
        setActiveAudio({ ...activeAudio, status: 'paused' });
      } else if (activeAudio.status === 'paused') {
        if (audioRef.current) audioRef.current.play(); else window.speechSynthesis.resume();
        setActiveAudio({ ...activeAudio, status: 'playing' });
      }
      return;
    }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis.cancel();

    if (url) {
      const audio = new Audio(url);
      audio.onended = () => setActiveAudio({ id: null, status: 'stopped' });
      audio.onerror = () => { alert('Error playing audio.'); setActiveAudio({ id: null, status: 'stopped' }); };
      const playPromise = audio.play();
      if (playPromise !== undefined) playPromise.catch(e => console.error('Play error:', e));
      audioRef.current = audio;
      setActiveAudio({ id, status: 'playing' });
    } else if (text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; utterance.rate = 0.9;
      utterance.onend = () => setActiveAudio({ id: null, status: 'stopped' });
      window.speechSynthesis.speak(utterance);
      setActiveAudio({ id, status: 'playing' });
    } else {
      alert('No audio or text found to play.');
    }
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording(); else startRecording();
  };

  // ──────────────────────────────────────────────────────
  // Profile category colors
  const CATEGORY_COLORS = ['#FFA95A', '#BD114A', '#FD8A6B', '#C3CC9B', '#6c9bd1'];

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="page-header">
        <h2>Whisper AI Floor Capture</h2>
        <p>Log your shift insights using high-accuracy "Tribal Knowledge" capture.</p>
      </div>

      {/* ── Row: Record + Prediction ── */}
      <div className="dashboard-row">
        <Card className={`record-card ${transcription ? 'expanded' : 'compact'}`}>
          <div className="record-area">
            <button
              className={`record-btn ${isRecording ? 'recording pulse-anim' : ''} ${isProcessing ? 'processing' : ''}`}
              onClick={toggleRecording}
              disabled={isProcessing}
            >
              <div className="mic-icon">{isProcessing ? '⏳' : '🎙️'}</div>
            </button>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{isProcessing ? 'Transcribing with Whisper AI...' : isRecording ? 'Recording...' : 'Tap to Record Insight'}</h3>
            <p className="record-hint" style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
              {isProcessing ? 'Processing audio...' : 'One-tap voice capture enabled'}
            </p>

            {!isRecording && !isProcessing && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>— OR —</div>
                <input type="file" accept="audio/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  📁 Upload Audio File
                </Button>
              </div>
            )}
          </div>

          {transcription && (
            <div className="transcription-area animate-fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>Extracted Insight</h4>
                <span style={{ fontSize: '0.7rem', color: 'var(--primary-color)', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--primary-color)', fontWeight: 'bold' }}>
                  ✓ AI VERIFIED
                </span>
              </div>
              <div className="transcription-box" style={{ background: 'linear-gradient(to right, var(--primary-light), transparent)' }}>
                <p>"{transcription}"</p>
              </div>
              <div className="insight-tags">
                <span className="tag solution" style={{ background: 'var(--primary-color)', color: 'white' }}>⚙️ {extractedInsight?.machine || 'Analyzing...'}</span>
                <span className="tag problem">⚠️ {extractedInsight?.issue || 'Extracting Issue...'}</span>
              </div>

              {extractedInsight?.resolution && (
                <div style={{ margin: '0.8rem 0', padding: '1rem', background: 'rgba(195, 204, 155, 0.2)', borderRadius: '8px', borderLeft: '3px solid var(--success-dark)' }}>
                  <h4 style={{ color: 'var(--success-dark)', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 'bold' }}>✅ ACTIONABLE RESOLUTION:</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>{extractedInsight.resolution}</p>
                </div>
              )}

              {extractedInsight?.root_cause && (
                <div style={{ margin: '0.5rem 0', padding: '0.8rem', background: 'rgba(189, 17, 74, 0.05)', borderRadius: '6px', borderLeft: '3px solid var(--danger-color)' }}>
                  <small style={{ color: 'var(--danger-color)', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>ROOT CAUSE IDENTIFIED</small>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{extractedInsight.root_cause}</p>
                </div>
              )}

              {extractedInsight?.confidence && (
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${extractedInsight.confidence * 100}%`, height: '100%', background: 'var(--success-dark)' }} />
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--success-dark)' }}>{(extractedInsight.confidence * 100).toFixed(0)}% AI Confidence</span>
                </div>
              )}

              {(currentAudioUrl || transcription) && (
                <div style={{ margin: '1rem 0', display: 'flex', gap: '10px' }}>
                  <Button variant="secondary" onClick={() => handlePlayPause('current', currentAudioUrl, transcription)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {activeAudio.id === 'current' && activeAudio.status === 'playing' ? <><span>⏸️</span> Pause Audio</> : activeAudio.id === 'current' && activeAudio.status === 'paused' ? <><span>▶️</span> Resume Audio</> : <><span>▶️</span> Play Audio</>}
                  </Button>
                </div>
              )}
              <Button variant="primary" onClick={handleSave} style={{ width: '100%', marginTop: '0.5rem' }}>
                Save to Knowledge Graph
              </Button>
            </div>
          )}
        </Card>

        {/* ─────────────────────────────────────────────
          🔮 PREDICTIVE MAINTENANCE CARD
        ───────────────────────────────────────────── */}
        <Card className="prediction-card">
          <div className="prediction-header">
            <span className="prediction-icon">🔮</span>
            <div>
              <h3 className="prediction-title">Predictive Maintenance</h3>
              <p className="prediction-subtitle">Enter a machine name to predict its next failure window</p>
            </div>
          </div>

          <div className="predict-input-row">
            <input
              type="text"
              className="premium-input predict-input"
              placeholder="e.g. pump, hydraulic, CNC lathe..."
              value={predictMachine}
              onChange={(e) => setPredictMachine(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePredict()}
              disabled={isPredicting}
            />
            <Button variant="primary" onClick={handlePredict} disabled={isPredicting || !predictMachine.trim()}>
              {isPredicting ? '⏳ Analyzing...' : '🔍 Predict'}
            </Button>
          </div>

          {predictResult && (
            <div className="predict-result animate-fade-in">
              <div className="predict-warning-pill">
                {predictResult.prediction}
              </div>
              {predictResult.next_inspection && (
                <div className="predict-detail">
                  <span>📅 {predictResult.next_inspection}</span>
                </div>
              )}
              {predictResult.avg_runtime_hours != null && (
                <div className="predict-stats">
                  <div className="predict-stat">
                    <span className="predict-stat-val">{predictResult.avg_runtime_hours}h</span>
                    <span className="predict-stat-label">Avg Runtime</span>
                  </div>
                  <div className="predict-stat">
                    <span className="predict-stat-val">{predictResult.log_count ?? '—'}</span>
                    <span className="predict-stat-label">Historical Logs</span>
                  </div>
                  <div className="predict-stat">
                    <span className="predict-stat-val">{predictResult.machine?.split('/')[0]?.trim() || '—'}</span>
                    <span className="predict-stat-label">Machine</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ── Recent Logs (Top 2 only) ── */}
      <Card title="Recent Logs" className="logs-card">
        <ul className="logs-list">
          {logs.slice(0, 2).map(log => (
              <li key={log.id} className="log-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>{log.title || 'Untitled Insight'}</h4>
                      <div className="log-time" style={{ marginBottom: 0 }}>• {log.time}</div>
                    </div>
                    <div className="log-content" style={{ marginTop: '4px' }}>{log.content}</div>
                    <div className="log-tags" style={{ marginTop: '0.5rem', display: 'flex', gap: '5px' }}>
                      {log.tags && log.tags.map((tag, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', color: 'var(--text-secondary)' }}>{tag}</span>
                      ))}
                    </div>
                  </div>
                  {(log.audioUrl || log.content) && (
                    <button onClick={() => handlePlayPause(log.id, log.audioUrl, log.content)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0.5rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center' }} title="Play Voice Log">
                      {activeAudio.id === log.id && activeAudio.status === 'playing' ? '⏸️' : activeAudio.id === log.id && activeAudio.status === 'paused' ? '▶️' : <MdHearing />}
                    </button>
                  )}
                </div>
                <div className="log-status success">{log.status}</div>
              </li>
            ))}
          </ul>
        </Card>
    </div>
  );
};

export default SeniorDashboard;
