import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  PhoneCall,
  Phone,
  MessageSquare,
  Mic,
  MicOff,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Flame,
  HelpCircle,
  RotateCcw,
  Check,
  ChevronRight,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import { Lead, LeadStatus, Interaction } from '../types';
import {
  extractLeadPhone,
  formatPhoneDisplay,
  getFaceTimeAudioUrl,
  getIMessageUrl,
  getWhatsAppUrl,
  getTelUrl,
  triggerFaceTimeAudioCall,
} from '../utils/phoneUtils';

interface LiveCallCoPilotModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onSaveCallOutcome: (updatedLead: Lead) => void;
}

interface Battlecard {
  id: string;
  trigger: string;
  keywords: string[];
  rebuttal: string;
  followUpQuestion: string;
}

const DEFAULT_BATTLECARDS: Battlecard[] = [
  {
    id: 'budget',
    trigger: 'Too Expensive / No Budget',
    keywords: ['expensive', 'cost', 'price', 'budget', 'afford', 'money', 'rates'],
    rebuttal:
      'Completely understand budget is strictly prioritized right now. Most brands we work with actually see a 3x ROI within 14 days by cutting wasted turnaround time.',
    followUpQuestion: 'If we can prove the numbers pay for themselves before you spend a dime, would that be worth a quick look?',
  },
  {
    id: 'vendor',
    trigger: 'Already Have an Agency / Supplier',
    keywords: ['already have', 'agency', 'supplier', 'vendor', 'partner', 'in-house', 'team'],
    rebuttal:
      "That is awesome you already have a workflow in place. We don't ask partners to replace their team. Most of our clients use us as a high-speed bolt-on to handle extra volume.",
    followUpQuestion: 'When is the last time you stress-tested your current costs against modern AI turnaround speeds?',
  },
  {
    id: 'email',
    trigger: 'Just Send Me an Email',
    keywords: ['email', 'send info', 'deck', 'brochure', 'pdf', 'information'],
    rebuttal:
      "I can definitely send an email over! But to be completely honest, both of our inboxes get flooded with 200 emails a day and it gets lost in spam.",
    followUpQuestion: 'If I take 45 seconds right now to share the one biggest metric we improved for a similar brand, can we decide if an email is even worth your time?',
  },
  {
    id: 'busy',
    trigger: 'Too Busy / Call Next Quarter',
    keywords: ['busy', 'next month', 'next quarter', 'later', 'bad time', 'meeting'],
    rebuttal:
      "Totally get it, you are running a business. If I call you in 90 days you will still be swamped. The reason I reached out now is we can save your team 5 hours a week starting tomorrow.",
    followUpQuestion: 'Can we lock down a quick 7-minute visual demo on Tuesday morning, and if it is not a fit, I promise not to follow up again?',
  },
  {
    id: 'not_interested',
    trigger: 'Not Interested',
    keywords: ['not interested', 'no thanks', 'pass', 'don\'t need'],
    rebuttal:
      "Fair enough. Nobody is interested in a random sales call. But leaders are usually interested in cutting operational costs by 35%.",
    followUpQuestion: 'Just out of curiosity, what is your single biggest bottleneck right now when converting new leads?',
  },
];

export const LiveCallCoPilotModal: React.FC<LiveCallCoPilotModalProps> = ({
  lead,
  isOpen,
  onClose,
  onSaveCallOutcome,
}) => {
  const phone = lead.phone || extractLeadPhone(lead) || '';
  const [activeTab, setActiveTab] = useState<'script' | 'battlecards'>('script');
  const [callTimer, setCallTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedBattlecard, setSelectedBattlecard] = useState<Battlecard>(DEFAULT_BATTLECARDS[0]);
  const [activeKeywordMatch, setActiveKeywordMatch] = useState<string | null>(null);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [scriptStep, setScriptStep] = useState<number>(1);
  const recognitionRef = useRef<any>(null);

  // Call timer effect
  useEffect(() => {
    let interval: any;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setCallTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Speech Recognition listener for real-time objection detection
  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListeningMic(false);
      setIsTimerRunning(false);
      setCallTimer(0);
      return;
    }

    // Auto-start timer when modal opens
    setIsTimerRunning(true);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentText += event.results[i][0].transcript;
        }
        setLiveTranscript(currentText);

        // Analyze for objection keywords
        const lower = currentText.toLowerCase();
        for (const card of DEFAULT_BATTLECARDS) {
          for (const kw of card.keywords) {
            if (lower.includes(kw)) {
              setSelectedBattlecard(card);
              setActiveKeywordMatch(kw);
              setActiveTab('battlecards');
              break;
            }
          }
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition notice:', e.error);
        setIsListeningMic(false);
      };

      recognition.onend = () => {
        if (isListeningMic) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isOpen]);

  const toggleMicListener = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is supported on Chrome, Safari, and Edge.');
      return;
    }

    if (isListeningMic) {
      recognitionRef.current.stop();
      setIsListeningMic(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListeningMic(true);
      } catch (err) {
        console.error('Failed to start mic listener:', err);
      }
    }
  };

  if (!isOpen) return null;

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const handleOutcomeLog = (outcome: 'Demo Booked' | 'Follow Up' | 'Left Voicemail' | 'Not Interested') => {
    let newStatus: LeadStatus = lead.status;
    if (outcome === 'Demo Booked') newStatus = 'Interested';
    if (outcome === 'Follow Up') newStatus = 'Follow Up';
    if (outcome === 'Left Voicemail') newStatus = 'Contacted';
    if (outcome === 'Not Interested') newStatus = 'Closed Lost';

    const newInteraction: Interaction = {
      id: `call_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'Call',
      notes: `[FaceTime/Call Co-Pilot] Outcome: ${outcome} (${formatTimer(callTimer)} duration). ${callNotes ? `Notes: ${callNotes}` : ''}`,
    };

    const updatedLead: Lead = {
      ...lead,
      status: newStatus,
      lastInteractionDate: new Date().toISOString().split('T')[0],
      interactions: [newInteraction, ...(lead.interactions || [])],
    };

    onSaveCallOutcome(updatedLead);
    onClose();
  };

  const companyFirstName = lead.name.split(' ')[0];
  const niche = lead.customFields?.['Niche'] || 'business';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 font-bold">
              <PhoneCall className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  Live AI Call Co-Pilot & Teleprompter
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimer(callTimer)}</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Connected with <span className="font-semibold text-zinc-800 dark:text-zinc-200">{lead.name}</span> {phone ? `(${formatPhoneDisplay(phone)})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Live Mic Listener Button */}
            <button
              onClick={toggleMicListener}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                isListeningMic
                  ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/30 animate-pulse'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400'
              }`}
              title="Listens to speaker audio to automatically detect objections in real-time"
            >
              {isListeningMic ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
              <span>{isListeningMic ? 'AI Ear Listening...' : 'Enable AI Mic Listener'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1-Click Call Dialers Toolbar */}
        <div className="px-6 py-2.5 bg-zinc-100/70 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="font-semibold text-zinc-500 text-[11px] uppercase tracking-wider">
            Quick Connect:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {phone ? (
              <>
                <a
                  href={getFaceTimeAudioUrl(phone)}
                  target="_top"
                  onClick={(e) => {
                    e.preventDefault();
                    triggerFaceTimeAudioCall(phone);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>FaceTime Audio</span>
                </a>

                <a
                  href={getWhatsAppUrl(phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Call/Chat</span>
                </a>

                <a
                  href={getTelUrl(phone)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 font-bold flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Phone Dialer</span>
                </a>
              </>
            ) : (
              <span className="text-zinc-400 italic">No phone number attached to lead.</span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-6 bg-white dark:bg-zinc-900 shrink-0">
          <button
            onClick={() => setActiveTab('script')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'script'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Teleprompter Script</span>
          </button>

          <button
            onClick={() => setActiveTab('battlecards')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'battlecards'
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Instant Objection Battlecards</span>
            {activeKeywordMatch && (
              <span className="text-[10px] px-1.5 py-0.2 bg-rose-500 text-white rounded-full animate-bounce">
                Detected
              </span>
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs font-medium">
          {/* TAB 1: TELEPROMPTER SCRIPT */}
          {activeTab === 'script' && (
            <div className="space-y-4">
              {/* Script Progression Pills */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { step: 1, title: '1. Pattern Hook' },
                  { step: 2, title: '2. Value Prop' },
                  { step: 3, title: '3. Discovery Q' },
                  { step: 4, title: '4. Soft Close' },
                ].map((s) => (
                  <button
                    key={s.step}
                    onClick={() => setScriptStep(s.step)}
                    className={`p-2 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer ${
                      scriptStep === s.step
                        ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                        : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>

              {/* Step 1: The Hook */}
              {scriptStep === 1 && (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-2">
                  <div className="flex items-center justify-between text-zinc-500 text-[11px] font-bold uppercase">
                    <span>The 7-Second Pattern Interrupt</span>
                    <span className="text-emerald-500">Goal: Earn 30 Seconds</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    &ldquo;Hey {companyFirstName}, I know I am catching you completely out of the blue. You don&rsquo;t know me, but I spent 10 minutes reviewing {lead.name}&rsquo;s current catalog and noticed a specific bottleneck in your visual conversions. Do you have 30 seconds, or did I catch you in the middle of a meeting?&rdquo;
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    💡 Tip: Acknowledging you are a stranger immediately lowers their guard and builds authentic trust.
                  </p>
                </div>
              )}

              {/* Step 2: The Value Prop */}
              {scriptStep === 2 && (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-2">
                  <div className="flex items-center justify-between text-zinc-500 text-[11px] font-bold uppercase">
                    <span>Targeted Value Proposition</span>
                    <span className="text-blue-500">Goal: Create Curiosity</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    &ldquo;The reason I am calling is that brands in the {niche} space usually lose 20-30 hours a week on manual content shoots and revisions. We deployed an AI visual asset engine that automates photorealistic renders in 48 hours for a fraction of agency retainers.&rdquo;
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    💡 Tip: Focus on specific operational headaches rather than generic product features.
                  </p>
                </div>
              )}

              {/* Step 3: Discovery Question */}
              {scriptStep === 3 && (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-2">
                  <div className="flex items-center justify-between text-zinc-500 text-[11px] font-bold uppercase">
                    <span>High-Leverage Discovery Question</span>
                    <span className="text-amber-500">Goal: Uncover Pain Point</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    &ldquo;Just curious, when you guys are preparing a new product launch or social campaign, how are you currently handling that creative turnaround? Is that in-house or outsourced?&rdquo;
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    💡 Tip: Stop speaking and listen. The first one who speaks after the question loses leverage.
                  </p>
                </div>
              )}

              {/* Step 4: Frictionless Close */}
              {scriptStep === 4 && (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 space-y-2">
                  <div className="flex items-center justify-between text-zinc-500 text-[11px] font-bold uppercase">
                    <span>Low-Friction Closing Ask</span>
                    <span className="text-purple-500">Goal: Book 8-Min Demo</span>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed bg-white dark:bg-zinc-900 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    &ldquo;Look, I don&rsquo;t expect you to make any decision today over the phone. How about we spend 8 minutes next Tuesday? I will generate 3 custom sample renders of your products completely free. If you like it, great. If not, you keep the assets. Does Tuesday at 10 AM or 2 PM work better?&rdquo;
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    💡 Tip: Giving an alternative choice (10 AM vs 2 PM) increases acceptance rate by 40%.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INSTANT OBJECTION BATTLECARDS */}
          {activeTab === 'battlecards' && (
            <div className="space-y-4">
              {/* Objection Category Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {DEFAULT_BATTLECARDS.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedBattlecard(card)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      selectedBattlecard.id === card.id
                        ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                        : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {card.trigger}
                  </button>
                ))}
              </div>

              {/* Selected Battlecard Rebuttal Box */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800/80 border border-zinc-200 dark:border-zinc-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
                    Prospect Says: &ldquo;{selectedBattlecard.trigger}&rdquo;
                  </span>
                  <span className="text-[11px] text-zinc-400">Say this word-for-word:</span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-relaxed">
                  &ldquo;{selectedBattlecard.rebuttal}&rdquo;
                </div>

                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs">
                  <strong className="block mb-1">Follow-up control question:</strong>
                  &ldquo;{selectedBattlecard.followUpQuestion}&rdquo;
                </div>
              </div>
            </div>
          )}

          {/* Call Outcome Quick Logger */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-zinc-600 dark:text-zinc-400 font-bold text-xs uppercase tracking-wider">
                Log Call Outcome & Advance Pipeline
              </label>
              <input
                type="text"
                placeholder="Optional call note (e.g. Founder interested, follow up on Tuesday)"
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                className="w-1/2 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleOutcomeLog('Demo Booked')}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Demo Booked</span>
              </button>

              <button
                onClick={() => handleOutcomeLog('Follow Up')}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                <span>Follow-Up Needed</span>
              </button>

              <button
                onClick={() => handleOutcomeLog('Left Voicemail')}
                className="p-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Phone className="w-4 h-4" />
                <span>Left Voicemail</span>
              </button>

              <button
                onClick={() => handleOutcomeLog('Not Interested')}
                className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-red-500/10 hover:text-red-500 text-zinc-500 font-bold text-xs transition-all border border-zinc-200 dark:border-zinc-800 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Not Interested</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
