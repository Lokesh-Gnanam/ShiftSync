import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { MdMic, MdMicNone } from 'react-icons/md';
import './JuniorDashboard.css';

const RANK_BADGES = ['🥇', '🥈', '🥉'];
const RANK_LABELS = ['Top 1', 'Top 2', 'Top 3'];

const JuniorDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [searchMessage, setSearchMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [safetyWarning, setSafetyWarning] = useState('');

  // Audio playback state
  const [activeAudio, setActiveAudio] = useState({ id: null, status: 'stopped' });
  const audioRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
      window.speechSynthesis.cancel();
    };
  }, []);

  const handlePlayPause = (id, url, text) => {
    if (activeAudio.id === id) {
      if (activeAudio.status === 'playing') {
        if (audioRef.current) audioRef.current.pause();
        else window.speechSynthesis.pause();
        setActiveAudio({ ...activeAudio, status: 'paused' });
      } else if (activeAudio.status === 'paused') {
        if (audioRef.current) audioRef.current.play();
        else window.speechSynthesis.resume();
        setActiveAudio({ ...activeAudio, status: 'playing' });
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();

    if (url) {
      const audio = new Audio(url);
      audio.onended = () => setActiveAudio({ id: null, status: 'stopped' });
      audio.onerror = () => {
        console.error('Playback Error');
        alert('Error playing audio. The recording might be unavailable.');
        setActiveAudio({ id: null, status: 'stopped' });
      };
      const playPromise = audio.play();
      if (playPromise !== undefined) playPromise.catch(e => console.error('Play error:', e));
      audioRef.current = audio;
      setActiveAudio({ id, status: 'playing' });
    } else if (text) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setActiveAudio({ id: null, status: 'stopped' });
      window.speechSynthesis.speak(utterance);
      setActiveAudio({ id, status: 'playing' });
    } else {
      alert('No audio recording or text available for this legacy log.');
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (query.length === 0) return;

    setIsSearching(true);
    setMatches([]);
    setSearchMessage('');
    setSafetyWarning('');

    const token = localStorage.getItem('shiftsync_token');
    if (!token) {
      alert('Authentication token missing. Please log in.');
      setIsSearching(false);
      return;
    }

    try {
      const response = await fetch('/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();

      // Support both new `matches` array and legacy `match` single result
      let resultMatches = [];
      if (data.matches && data.matches.length > 0) {
        resultMatches = data.matches;
      } else if (data.match) {
        resultMatches = [data.match];
      }

      if (resultMatches.length > 0) {
        setMatches(resultMatches);
        // Show safety from top match
        if (resultMatches[0].safety) {
          setSafetyWarning(resultMatches[0].safety);
        }
        if (data.message) setSearchMessage(data.message);
      } else {
        setSearchMessage(
          data.message || 'No match found. Please contact a senior technician.'
        );
      }
    } catch (err) {
      console.error('Search Error:', err);
      setSearchMessage('Search Error: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice search is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0])
        .map(r => r.transcript)
        .join('');
      setSearchQuery(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      setTimeout(() => {
        const currentQuery = document.querySelector('.search-input')?.value;
        if (currentQuery && currentQuery.trim().length > 0) handleSearch();
      }, 500);
    };

    recognition.onerror = (event) => {
      console.error('Speech Recognition Error:', event.error);
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="page-header">
        <h2>Knowledge Retrieval Agent</h2>
        <p>Ask a question or describe an issue to retrieve "Tribal Knowledge" from senior techs.</p>
      </div>

      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="premium-input search-input"
              placeholder="E.g., CNC vibration at 4000 RPM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearching}
            />
            <button
              type="button"
              className={`voice-search-btn ${isListening ? 'listening' : ''}`}
              onClick={startVoiceSearch}
              disabled={isSearching}
              title="Voice Search"
            >
              {isListening ? <MdMic className="pulse-icon" /> : <MdMicNone />}
            </button>
          </div>
          <Button type="submit" variant="primary" disabled={isSearching}>
            {isSearching ? '🤖 AI Reasoning...' : 'Search Knowledge Graph'}
          </Button>
        </form>
      </div>

      {/* ── Loading Shimmer ── */}
      {isSearching && (
        <div className="shimmer-wrapper">
          <div className="shimmer-card" />
          <div className="shimmer-card shimmer-sm" />
          <div className="shimmer-card shimmer-sm" />
        </div>
      )}

      {/* ── Safety Warning Banner ── */}
      {safetyWarning && !isSearching && (
        <div className="safety-banner animate-fade-in">
          <span className="safety-icon">🛡️</span>
          <div>
            <strong>Safety Protocol Active</strong>
            <p>{safetyWarning}</p>
          </div>
        </div>
      )}

      {/* ── No Match Message ── */}
      {searchMessage && matches.length === 0 && !isSearching && (
        <div className="results-section animate-fade-in">
          <Card className="result-card error-card" style={{ borderTop: '4px solid var(--danger-color)' }}>
            <div className="error-message">
              <span>🚫</span>
              <p><strong>No Match Found:</strong> {searchMessage}</p>
            </div>
            <Button
              variant="secondary"
              style={{ marginTop: '1rem', width: '100%' }}
              onClick={() => window.location.reload()}
            >
              Refresh Knowledge Graph
            </Button>
          </Card>
        </div>
      )}

      {/* ── Top 3 Ranked Results ── */}
      {matches.length > 0 && !isSearching && (
        <div className="results-section animate-fade-in">
          <div className="results-header">
            <h3 className="results-title">
              🤖 AI Found <span className="results-count">{matches.length}</span> Match{matches.length > 1 ? 'es' : ''}
            </h3>
            <p className="results-subtitle">Ranked by semantic similarity · confidence · frequency</p>
          </div>

          <div className="ranked-results-list">
            {matches.map((m, idx) => (
              <div
                key={idx}
                className={`ranked-result-card animate-fade-in ${idx === 0 ? 'top-match' : ''}`}
                style={{ animationDelay: `${idx * 0.08}s` }}
              >
                {/* Rank badge */}
                <div className="rank-strip">
                  <span className="rank-badge">{RANK_BADGES[idx] || `#${idx + 1}`}</span>
                  <span className="rank-label">{RANK_LABELS[idx] || `Result ${idx + 1}`}</span>
                  {idx === 0 && <span className="best-match-pill">Best Match</span>}
                </div>

                {/* Title + Meta row */}
                <div className="match-header">
                  <h4 className="match-title">{m.title || 'Technician Insight'}</h4>
                  <div className="match-meta">
                    <span className="confidence-pill">
                      ✅ {m.confidence ? `${(m.confidence * 100).toFixed(0)}%` : '95%'} Confidence
                    </span>
                    {m.frequency != null && (
                      <span className="frequency-badge">
                        🔁 Seen {m.frequency} time{m.frequency !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Per-match safety */}
                {m.safety && idx > 0 && (
                  <div className="inline-safety">⚠️ {m.safety}</div>
                )}

                {/* Audio player */}
                <div className="voice-note-player">
                  <button
                    className="play-btn"
                    onClick={() => handlePlayPause(`match-${idx}`, m.audio_url, m.transcript)}
                    title="Play/Pause Voice Log"
                  >
                    {activeAudio.id === `match-${idx}` && activeAudio.status === 'playing'
                      ? '⏸️'
                      : activeAudio.id === `match-${idx}` && activeAudio.status === 'paused'
                      ? '▶️'
                      : m.audio_url || m.transcript ? '▶️' : '🔇'}
                  </button>
                  <div className={`waveform ${activeAudio.id === `match-${idx}` && activeAudio.status === 'playing' ? 'waveform-active' : ''}`}>
                    <span/><span/><span/><span/><span/><span/><span/>
                  </div>
                  <div className="time">0:00 / 0:15</div>
                </div>

                {/* Solution details */}
                <div className="solution-details">
                  {m.root_cause && (
                    <div className="analysis-block">
                      <h4 style={{ color: 'var(--danger-color)' }}>🛠️ Root Cause</h4>
                      <p className="quote">{m.root_cause}</p>
                    </div>
                  )}
                  {m.solution && (
                    <div className="analysis-block">
                      <h4 style={{ color: 'var(--success-color)' }}>✅ Actionable Solution</h4>
                      <div className="solution-steps">{m.solution}</div>
                    </div>
                  )}
                  {!m.root_cause && (
                    <>
                      <h4>Original Transcription</h4>
                      <p className="quote">"{m.transcript}"</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Suggested Queries ── */}
      {matches.length === 0 && !isSearching && !searchMessage && (
        <div className="suggested-queries">
          <h3>Common Problems Today</h3>
          <div className="queries-grid">
            {['pump cavitation', 'VFD trip', 'CNC spindle drift', 'hydraulic pressure drop'].map((q) => (
              <div
                key={q}
                className="query-chip"
                onClick={() => { setSearchQuery(q); setTimeout(() => handleSearch(), 0); }}
              >
                {q}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default JuniorDashboard;
