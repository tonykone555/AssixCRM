import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneForwarded,
  Mic,
  Square,
  Play,
  Pause,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Volume2,
  Trash2,
  Download,
  Info,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { Lead, CallLogRecord, Interaction } from '../types';
import {
  extractLeadPhone,
  formatPhoneForDialing,
  formatPhoneDisplay,
  getFaceTimeAudioUrl,
  getIMessageUrl,
  getTelUrl,
  triggerFaceTimeAudioCall
} from '../utils/phoneUtils';

interface CallDialerRecorderProps {
  lead: Lead;
  onUpdateLead: (updatedLead: Lead) => void;
  isDarkMode?: boolean;
}

export const CallDialerRecorder: React.FC<CallDialerRecorderProps> = ({
  lead,
  onUpdateLead,
}) => {
  const currentPhone = extractLeadPhone(lead);
  const [phoneNumber, setPhoneNumber] = useState<string>(currentPhone);
  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(false);

  // Call Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  // In-call notes & outcome
  const [callOutcome, setCallOutcome] = useState<CallLogRecord['outcome']>('Connected');
  const [callNotes, setCallNotes] = useState<string>('');
  const [showMacTips, setShowMacTips] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  // Sync state if lead changes
  useEffect(() => {
    setPhoneNumber(extractLeadPhone(lead));
  }, [lead.phone, lead.customFields]);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleSavePhoneNumber = () => {
    onUpdateLead({
      ...lead,
      phone: phoneNumber.trim(),
    });
    setIsEditingPhone(false);
  };

  const handleToggleAppleVerified = () => {
    onUpdateLead({
      ...lead,
      isAppleVerified: !lead.isAppleVerified,
    });
  };

  // Start live audio recording
  const startAudioRecording = async () => {
    setRecordingError(null);
    audioChunksRef.current = [];
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedAudioBlob(blob);
        setRecordedAudioUrl(url);

        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250); // Collect slice every 250ms
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to start audio recording:', err);
      setRecordingError(err.message || 'Microphone access denied or unavailable.');
      setIsRecording(false);
    }
  };

  // Stop live audio recording
  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Save the call log to the lead
  const handleSaveCallLog = () => {
    if (!callNotes.trim() && !recordedAudioUrl) {
      alert('Please enter some notes about what was discussed or record call audio.');
      return;
    }

    const newCallLog: CallLogRecord = {
      id: `call_${Date.now()}`,
      timestamp: new Date().toISOString(),
      callerName: lead.name,
      outcome: callOutcome,
      durationSeconds: recordingDuration,
      notes: callNotes.trim(),
      audioRecordingUrl: recordedAudioUrl || undefined,
    };

    // Also auto-add an interaction item for the CRM timeline
    const newInteraction: Interaction = {
      id: `int_call_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: 'Call',
      notes: `[Call - ${callOutcome}]: ${callNotes.trim() || 'Call recorded'}`,
    };

    const updatedCallLogs = [newCallLog, ...(lead.callLogs || [])];
    const updatedInteractions = [newInteraction, ...(lead.interactions || [])];

    onUpdateLead({
      ...lead,
      callLogs: updatedCallLogs,
      interactions: updatedInteractions,
      lastInteractionDate: new Date().toISOString().split('T')[0],
    });

    // Reset local recording & form
    setCallNotes('');
    setRecordedAudioUrl(null);
    setRecordedAudioBlob(null);
    setRecordingDuration(0);
    setCallOutcome('Connected');
  };

  const handleDeleteCallLog = (logId: string) => {
    if (!confirm('Are you sure you want to delete this call record?')) return;
    const filtered = (lead.callLogs || []).filter((c) => c.id !== logId);
    onUpdateLead({
      ...lead,
      callLogs: filtered,
    });
  };

  return (
    <div className="space-y-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
      {/* Header & Apple Status */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <PhoneCall className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
              <span>FaceTime & Call Studio</span>
            </h4>
            <span className="text-[11px] text-zinc-500">
              Free Wi-Fi Calling & Audio Note Recording
            </span>
          </div>
        </div>

        {/* Apple Blue Tick Verification Toggle */}
        <button
          type="button"
          onClick={handleToggleAppleVerified}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs cursor-pointer ${
            lead.isAppleVerified
              ? 'bg-[#007AFF] text-white border-blue-600 shadow-blue-500/20'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-blue-400'
          }`}
          title="Click to toggle Apple FaceTime / iMessage blue tick status"
        >
          <CheckCircle2 className={`w-3.5 h-3.5 ${lead.isAppleVerified ? 'fill-current text-white' : 'text-zinc-400'}`} />
          <span>{lead.isAppleVerified ? '🍎 Apple Verified' : 'Mark as Apple Lead'}</span>
        </button>
      </div>

      {/* Phone Number Bar & Direct Launchers */}
      <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
              Direct Phone Number
            </label>
            {isEditingPhone ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleSavePhoneNumber}
                  className="px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-xs font-bold shrink-0"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingPhone(false)}
                  className="px-2 py-1.5 text-xs text-zinc-500"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-white">
                  {phoneNumber ? formatPhoneDisplay(phoneNumber) : 'No phone number added'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingPhone(true)}
                  className="text-[11px] text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline"
                >
                  {phoneNumber ? 'Edit' : '+ Add Phone'}
                </button>
              </div>
            )}
          </div>

          {/* Quick 1-Click Launch Buttons */}
          {phoneNumber && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* FaceTime Audio (Free internet audio) */}
              <a
                href={getFaceTimeAudioUrl(phoneNumber)}
                target="_top"
                onClick={(e) => {
                  e.preventDefault();
                  triggerFaceTimeAudioCall(phoneNumber);
                }}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                title="Launch FaceTime Audio call (100% Free over Wi-Fi/Internet)"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>FaceTime Audio</span>
              </a>

              {/* iMessage / SMS */}
              <a
                href={getIMessageUrl(phoneNumber)}
                className="px-3 py-2 rounded-xl bg-[#007AFF] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                title="Launch Apple Messages / iMessage"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>iMessage</span>
              </a>

              {/* Standard Tel: link */}
              <a
                href={getTelUrl(phoneNumber)}
                className="p-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                title="Open Native Phone Dialer"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Live Audio Call Recorder & Note Workspace */}
      <div className="p-4 rounded-2xl bg-zinc-900 text-white shadow-lg border border-zinc-800 space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isRecording ? 'bg-red-500 animate-ping' : 'bg-zinc-600'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              {isRecording ? 'Live Call Recording Active' : 'Call Logger & Audio Recording'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            {isRecording && (
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold border border-red-500/30 animate-pulse">
                REC {formatTimer(recordingDuration)}
              </span>
            )}
          </div>
        </div>

        {recordingError && (
          <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{recordingError}</span>
          </div>
        )}

        {/* Audio Recording Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {!isRecording ? (
            <button
              type="button"
              onClick={startAudioRecording}
              className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Record Call Audio (Mic / Speaker)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopAudioRecording}
              className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-white active:scale-95 text-zinc-900 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer animate-pulse"
            >
              <Square className="w-3.5 h-3.5 fill-current text-red-600" />
              <span>Stop Recording ({formatTimer(recordingDuration)})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowMacTips(!showMacTips)}
            className="text-[11px] text-zinc-400 hover:text-zinc-200 underline inline-flex items-center gap-1"
          >
            <Info className="w-3 h-3" />
            <span>How to record Mac FaceTime audio?</span>
          </button>
        </div>

        {/* Mac OS Recording Guidance Tip */}
        {showMacTips && (
          <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/70 text-xs text-zinc-300 space-y-1.5 animate-in fade-in duration-150">
            <div className="font-bold text-white flex items-center gap-1">
              <span>🍎 Recording Calls on Mac:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-300">
              1. <strong>Quickest:</strong> Click &quot;Record Call Audio&quot; above and put your FaceTime call on speakerphone so your Mac microphone records both you and the lead.
            </p>
            <p className="text-[11px] leading-relaxed text-zinc-300">
              2. <strong>Direct System Audio:</strong> Use macOS <em>BlackHole</em> (Free virtual cable) or QuickTime Audio Recording with Mac audio loopback.
            </p>
          </div>
        )}

        {/* Audio Preview if recorded */}
        {recordedAudioUrl && (
          <div className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-300">
              <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                <Volume2 className="w-3.5 h-3.5" />
                <span>Call Audio Captured ({formatTimer(recordingDuration)})</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setRecordedAudioUrl(null);
                  setRecordedAudioBlob(null);
                }}
                className="text-[11px] text-zinc-400 hover:text-rose-400"
              >
                Clear Recording
              </button>
            </div>
            <audio controls src={recordedAudioUrl} className="w-full h-8" />
          </div>
        )}

        {/* In-Call Outcome & Notes */}
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Call Outcome:
            </label>
            <div className="flex items-center gap-1 flex-wrap">
              {(['Connected', 'Left Voicemail', 'No Answer', 'Busy', 'Follow Up', 'Wrong Number'] as CallLogRecord['outcome'][]).map((outcome) => (
                <button
                  key={outcome}
                  type="button"
                  onClick={() => setCallOutcome(outcome)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                    callOutcome === outcome
                      ? 'bg-white text-zinc-950 shadow-xs'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {outcome}
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={2}
            value={callNotes}
            onChange={(e) => setCallNotes(e.target.value)}
            placeholder="Log key notes from conversation (pricing discussed, objections, next steps)..."
            className="w-full px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-white"
          />

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSaveCallLog}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              Save Call Record & Audio
            </button>
          </div>
        </div>
      </div>

      {/* Historical Call Logs List */}
      {lead.callLogs && lead.callLogs.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
            <span>Call History ({lead.callLogs.length})</span>
          </h5>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {lead.callLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                        log.outcome === 'Connected'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : log.outcome === 'Left Voicemail'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {log.outcome}
                    </span>
                    {log.durationSeconds && log.durationSeconds > 0 ? (
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {formatTimer(log.durationSeconds)}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">
                      {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCallLog(log.id)}
                      className="text-zinc-400 hover:text-rose-500 p-0.5"
                      title="Delete Call Log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {log.notes && (
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {log.notes}
                  </p>
                )}

                {log.audioRecordingUrl && (
                  <div className="pt-1">
                    <audio controls src={log.audioRecordingUrl} className="w-full h-7" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
