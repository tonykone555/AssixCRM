import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Award,
  Sparkles,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  Users,
  Flame,
  AlertCircle,
  Play,
  Check,
  UserCheck,
} from 'lucide-react';
import { Lead, Interaction } from '../types';

interface CallSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
  currentLead?: Lead | null;
  onSavePracticeNote?: (leadId: string, note: string) => void;
}

interface Message {
  speaker: 'rep' | 'prospect';
  text: string;
  sentiment?: 'cold' | 'neutral' | 'warm' | 'interested';
  objection?: string;
  coachingTip?: string;
  timestamp: string;
}

interface Scorecard {
  overallScore: number;
  letterGrade: string;
  hookScore: number;
  objectionScore: number;
  closingScore: number;
  callOutcome: string;
  summary: string;
  strengths: string[];
  missedOpportunities: string[];
  actionableTips: string[];
}

export const CallSimulatorModal: React.FC<CallSimulatorModalProps> = ({
  isOpen,
  onClose,
  leads,
  currentLead,
  onSavePracticeNote,
}) => {
  const [selectedLeadId, setSelectedLeadId] = useState<string>(currentLead?.id || leads[0]?.id || '');
  const [persona, setPersona] = useState<string>('busy_founder');
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [callTimer, setCallTimer] = useState(0);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [repInput, setRepInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProspectTyping, setIsProspectTyping] = useState(false);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [savedNote, setSavedNote] = useState(false);
  const [currentlyPlayingAudio, setCurrentlyPlayingAudio] = useState<HTMLAudioElement | null>(null);

  const recognitionRef = useRef<any>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || currentLead || leads[0];

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isProspectTyping]);

  // Timer while connected
  useEffect(() => {
    let interval: any;
    if (callState === 'connected') {
      interval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState]);

  // Speech Recognition setup for speaking aloud
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          handleSendMessage(transcript);
        }
        setIsListeningMic(false);
      };

      recognition.onerror = () => {
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        setIsListeningMic(false);
      };

      recognitionRef.current = recognition;
    }
  }, [callState]);

  if (!isOpen) return null;

  // Speak aloud prospect response
  const speakText = async (text: string) => {
    if (voiceMuted || !text) return;

    if (currentlyPlayingAudio) {
      currentlyPlayingAudio.pause();
    }

    // Clean text for natural speech rendering
    const cleanPrompt = text
      .replace(/\*.*?\*/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/#/g, '')
      .replace(/_/g, '')
      .trim();

    if (!cleanPrompt) return;

    try {
      // Use our high-quality Gemini TTS API
      const response = await fetch('/api/generate-voice-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: cleanPrompt, 
          // Match voice to persona
          voiceName: persona === 'friendly_gatekeeper' ? 'Kore' 
                   : persona === 'angry_skeptic' ? 'Fenrir' 
                   : persona === 'busy_founder' ? 'Zephyr'
                   : 'Puck' 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          audio.play();
          setCurrentlyPlayingAudio(audio);
          return;
        }
      }
      
      // Fallback to browser TTS if API fails
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error('TTS error:', e);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Start Simulated Call
  const handleStartCall = async () => {
    setCallState('calling');
    setCallTimer(0);
    setMessages([]);
    setScorecard(null);
    setSavedNote(false);

    // Simulate 2 seconds of ringing tone before answering
    setTimeout(async () => {
      setCallState('connected');
      const initialProspectLine = persona === 'friendly_gatekeeper'
        ? `Hello, thanks for calling ${selectedLead?.name || 'our office'}, this is Sam. How can I direct your call?`
        : `Hello, this is ${selectedLead?.name?.split(' ')[0] || 'Alex'}. Who is this?`;

      setMessages([
        {
          speaker: 'prospect',
          text: initialProspectLine,
          sentiment: 'neutral',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      speakText(initialProspectLine);
    }, 1500);
  };

  // Rep submits pitch line
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isProspectTyping) return;

    const repMsg: Message = {
      speaker: 'rep',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, repMsg];
    setMessages(updatedHistory);
    setRepInput('');
    setIsProspectTyping(true);

    try {
      const res = await fetch('/api/call-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: selectedLead?.name || 'Luxe Store',
          niche: selectedLead?.customFields?.['Niche'] || 'E-commerce',
          website: selectedLead?.website || '',
          persona,
          conversationHistory: updatedHistory,
          userSpeech: textToSend.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        const prospectMsg: Message = {
          speaker: 'prospect',
          text: data.response,
          sentiment: data.sentiment,
          objection: data.detectedObjection,
          coachingTip: data.coachingTip,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, prospectMsg]);
        speakText(data.response);
      }
    } catch (err) {
      console.error('Simulate call error:', err);
    } finally {
      setIsProspectTyping(false);
    }
  };

  // End Call & Grade
  const handleEndCall = async () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCallState('ended');
    setIsScoring(true);

    try {
      const res = await fetch('/api/call-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: selectedLead?.name || 'Prospect',
          conversationHistory: messages,
          durationSeconds: callTimer,
        }),
      });

      const data = await res.json();
      if (data.success && data.scorecard) {
        setScorecard(data.scorecard);
      }
    } catch (err) {
      console.error('Call scoring error:', err);
    } finally {
      setIsScoring(false);
    }
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert('Speech-to-text is supported on modern desktop & mobile browsers.');
      return;
    }
    if (isListeningMic) {
      recognitionRef.current.stop();
      setIsListeningMic(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListeningMic(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSaveScorecardToLead = () => {
    if (!scorecard || !selectedLead || !onSavePracticeNote) return;
    const noteContent = `[AI Call Simulator Scorecard] Score: ${scorecard.overallScore}/100 (${scorecard.letterGrade}). Outcome: ${scorecard.callOutcome}. Duration: ${Math.floor(callTimer / 60)}m ${callTimer % 60}s. Feedback: ${scorecard.summary}`;
    onSavePracticeNote(selectedLead.id, noteContent);
    setSavedNote(true);
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/60 dark:bg-zinc-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-950 dark:from-white dark:to-zinc-200 text-white dark:text-zinc-900 flex items-center justify-center shadow-md font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  AI Call Simulator & Roleplay Coach
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Voice Interactive
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Master your pitch, handle tough objections, and get instant VP of Sales scorecard grading.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setVoiceMuted(!voiceMuted)}
              className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 cursor-pointer"
              title={voiceMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
            >
              {voiceMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-emerald-500" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Setup Toolbar (When not connected) */}
        {callState === 'idle' && (
          <div className="p-6 overflow-y-auto space-y-6 text-xs font-medium">
            {/* Target Lead Selector */}
            <div className="space-y-1.5">
              <label className="text-zinc-600 dark:text-zinc-400 font-bold text-[11px] uppercase tracking-wider block">
                Select Lead to Practice Pitching Against:
              </label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-semibold cursor-pointer"
              >
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} {l.customFields?.['Niche'] ? `(${l.customFields['Niche']})` : ''} - Stage: {l.status}
                  </option>
                ))}
              </select>
            </div>

            {/* Persona Selector */}
            <div className="space-y-2">
              <label className="text-zinc-600 dark:text-zinc-400 font-bold text-[11px] uppercase tracking-wider block">
                Choose Prospect Personality / Difficulty:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: 'busy_founder',
                    name: 'Alex • Busy Founder',
                    level: 'Hard',
                    color: 'text-amber-500',
                    desc: 'Direct, impatient, cuts through fluff. Cares only about saving time & high ROI.',
                  },
                  {
                    id: 'skeptical_manager',
                    name: 'Jordan • Skeptical GM',
                    level: 'Very Hard',
                    color: 'text-red-500',
                    desc: 'Heard 100 pitches this month. Raises contract lockouts and "send an email".',
                  },
                  {
                    id: 'budget_conscious',
                    name: 'Taylor • Boutique Owner',
                    level: 'Medium',
                    color: 'text-blue-500',
                    desc: 'Interested in growth but hyper-cautious on retainers, hidden fees, and risks.',
                  },
                  {
                    id: 'friendly_gatekeeper',
                    name: 'Sam • Executive Assistant',
                    level: 'Tricky',
                    color: 'text-purple-500',
                    desc: 'Polite screening gatekeeper. Offers to take a message unless you hook them.',
                  },
                ].map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setPersona(p.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      persona === p.id
                        ? 'bg-blue-500/10 border-blue-500/50 shadow-md shadow-blue-500/10'
                        : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs">
                        {p.name}
                      </span>
                      <span className={`text-[10px] font-extrabold ${p.color}`}>{p.level}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-snug">{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Launch Call Button */}
            <div className="pt-4 text-center">
              <button
                onClick={handleStartCall}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 mx-auto transition-all cursor-pointer"
              >
                <PhoneCall className="w-5 h-5 animate-pulse" />
                <span>Start Practice Call with {selectedLead?.name || 'Prospect'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Calling / Ringing State */}
        {callState === 'calling' && (
          <div className="p-12 flex flex-col items-center justify-center space-y-4 my-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center animate-ping">
              <PhoneCall className="w-10 h-10" />
            </div>
            <h4 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
              Dialing {selectedLead?.name}...
            </h4>
            <p className="text-xs text-zinc-400">Simulating realistic phone line connection...</p>
          </div>
        )}

        {/* Connected State (Active Call & Dialogue) */}
        {callState === 'connected' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Live Call Banner */}
            <div className="px-6 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  Call Live with {selectedLead?.name}
                </span>
                <span className="text-xs font-mono font-bold text-zinc-600 dark:text-zinc-300 ml-2">
                  {formatTimer(callTimer)}
                </span>
              </div>

              <button
                onClick={handleEndCall}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>End Call & Grade Pitch</span>
              </button>
            </div>

            {/* Conversation Messages */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-medium">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.speaker === 'rep' ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-zinc-400">
                    <span>{m.speaker === 'rep' ? 'You (Sales Rep)' : `${selectedLead?.name} (Prospect)`}</span>
                    <span>• {m.timestamp}</span>
                    {m.sentiment && (
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                        m.sentiment === 'warm' || m.sentiment === 'interested'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : m.sentiment === 'cold'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-zinc-500/10 text-zinc-500'
                      }`}>
                        {m.sentiment}
                      </span>
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                      m.speaker === 'rep'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Real-time coaching whisper if available */}
                  {m.coachingTip && (
                    <div className="mt-1.5 max-w-[85%] p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      <span><strong>Coach Whisper:</strong> {m.coachingTip}</span>
                    </div>
                  )}
                </div>
              ))}

              {isProspectTyping && (
                <div className="flex items-center gap-2 text-xs text-zinc-400 italic">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                  <span>Prospect is responding...</span>
                </div>
              )}
            </div>

            {/* Rep Input Box */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(repInput);
                }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isListeningMic
                      ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                      : 'bg-white dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:text-zinc-800'
                  }`}
                  title="Speak your pitch aloud"
                >
                  {isListeningMic ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  placeholder={isListeningMic ? 'Listening to your voice...' : 'Type or speak your pitch line...'}
                  value={repInput}
                  onChange={(e) => setRepInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />

                <button
                  type="submit"
                  disabled={!repInput.trim() || isProspectTyping}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Say</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Ended State: Detailed Scorecard */}
        {callState === 'ended' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-medium">
            {isScoring ? (
              <div className="py-16 text-center space-y-3">
                <Sparkles className="w-10 h-10 text-purple-500 mx-auto animate-spin" />
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                  AI VP of Sales is Grading Your Pitch...
                </h4>
                <p className="text-zinc-500 text-xs">
                  Evaluating hook effectiveness, objection reframing, and closing assertiveness.
                </p>
              </div>
            ) : scorecard ? (
              <div className="space-y-6">
                {/* Scorecard Hero Banner */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-rose-50 dark:from-purple-950/40 dark:to-rose-950/30 border border-purple-200 dark:border-purple-800 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                        Call Scorecard Result
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                        {scorecard.callOutcome}
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white">
                      Overall Score: {scorecard.overallScore}/100
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1 max-w-md">
                      {scorecard.summary}
                    </p>
                  </div>

                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-rose-500 text-white flex items-center justify-center font-black text-3xl shadow-lg shadow-purple-500/30">
                    {scorecard.letterGrade}
                  </div>
                </div>

                {/* Sub-Pillar Scores */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">Opening Hook</span>
                    <span className="text-lg font-bold text-zinc-900 dark:text-white">{scorecard.hookScore}/10</span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">Objection Handling</span>
                    <span className="text-lg font-bold text-zinc-900 dark:text-white">{scorecard.objectionScore}/10</span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 text-center">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">Closing / Next Step</span>
                    <span className="text-lg font-bold text-zinc-900 dark:text-white">{scorecard.closingScore}/10</span>
                  </div>
                </div>

                {/* Strengths & Missed Opportunities */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-2">
                    <h5 className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Key Strengths</span>
                    </h5>
                    <ul className="space-y-1 text-zinc-700 dark:text-zinc-300 text-[11px] list-disc list-inside">
                      {scorecard.strengths?.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/20 space-y-2">
                    <h5 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>Missed Opportunities</span>
                    </h5>
                    <ul className="space-y-1 text-zinc-700 dark:text-zinc-300 text-[11px] list-disc list-inside">
                      {scorecard.missedOpportunities?.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Actionable Coaching Tips */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-2">
                  <h5 className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span>3 Actionable Coaching Fixes for Next Time:</span>
                  </h5>
                  <div className="space-y-1.5">
                    {scorecard.actionableTips?.map((tip, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
                        <strong>{i + 1}.</strong> {tip}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between flex-wrap gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={() => {
                      setCallState('idle');
                      setScorecard(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Try Another Practice Call</span>
                  </button>

                  <button
                    onClick={handleSaveScorecardToLead}
                    disabled={savedNote}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-emerald-600 text-white font-bold flex items-center gap-2 shadow-md shadow-purple-500/20 cursor-pointer"
                  >
                    {savedNote ? <Check className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                    <span>{savedNote ? 'Saved to Lead Activity!' : 'Save Scorecard to Lead Notes'}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
