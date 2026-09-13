import React, { useState, useMemo } from 'react';
import { X, Play, Download, Mic, Loader2, Sparkles, CheckCircle2, ChevronRight, Music } from 'lucide-react';
import { Lead } from '../types';

interface AIVoiceNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: Lead[];
}

export const AIVoiceNoteModal: React.FC<AIVoiceNoteModalProps> = ({
  isOpen,
  onClose,
  leads
}) => {
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [pitchOffer, setPitchOffer] = useState('');
  const [voiceName, setVoiceName] = useState('Zephyr');
  const [selectedBatch, setSelectedBatch] = useState<string>('ALL');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState<Record<string, { audioBase64: string, script: string, isPlaying: boolean }>>({});
  
  const [currentlyPlayingAudio, setCurrentlyPlayingAudio] = useState<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const allBatches = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      l.tags.forEach(t => {
        if (/batch/i.test(t)) {
          set.add(t);
        }
      });
    });
    return Array.from(set).sort();
  }, [leads]);

  const validLeads = leads
    .filter(l => l.status !== 'Closed Lost')
    .filter(l => selectedBatch === 'ALL' || l.tags.includes(selectedBatch));

  const toggleLead = (id: string) => {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === validLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(validLeads.map(l => l.id));
    }
  };

  const playAudio = (leadId: string, base64: string) => {
    if (currentlyPlayingAudio) {
      currentlyPlayingAudio.pause();
      if (playingId === leadId) {
        setCurrentlyPlayingAudio(null);
        setPlayingId(null);
        return;
      }
    }
    
    const audio = new Audio(`data:audio/wav;base64,${base64}`);
    audio.play();
    setCurrentlyPlayingAudio(audio);
    setPlayingId(leadId);
    
    audio.onended = () => {
      setCurrentlyPlayingAudio(null);
      setPlayingId(null);
    };
  };

  const downloadAudio = (leadName: string, base64: string) => {
    const a = document.createElement('a');
    a.href = `data:audio/wav;base64,${base64}`;
    a.download = `VoiceNote_${leadName.replace(/\s+/g, '_')}.wav`;
    a.click();
  };

  const previewVoiceActor = async (voice: string) => {
    setVoiceName(voice);
    if (currentlyPlayingAudio) {
      currentlyPlayingAudio.pause();
    }
    const sampleText = `Hi, I am ${voice}. This is how my voice sounds.`;
    try {
      const response = await fetch('/api/generate-voice-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: sampleText, voiceName: voice })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          audio.play();
          setCurrentlyPlayingAudio(audio);
          setPlayingId(`preview-${voice}`);
          audio.onended = () => {
            setCurrentlyPlayingAudio(null);
            setPlayingId(null);
          };
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generateBulkNotes = async () => {
    if (selectedLeads.length === 0 || !pitchOffer.trim()) return;
    
    setIsGenerating(true);
    
    try {
      const results: Record<string, any> = { ...generatedNotes };
      
      for (const leadId of selectedLeads) {
        const lead = validLeads.find(l => l.id === leadId);
        if (!lead) continue;
        
        // Use a generic structure matching what they provide + their business
        const leadName = lead.name || lead.storeName || lead.company || lead.handle || 'there';
        const businessInfo = lead.storeName || lead.company || 'your business';
        const script = `Hey ${leadName}, I saw what you guys are doing at ${businessInfo}. ${pitchOffer.trim()}`;
        
        const response = await fetch('/api/generate-voice-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: script, voiceName })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            results[leadId] = {
              audioBase64: data.audioBase64,
              script,
              isPlaying: false
            };
          }
        }
      }
      
      setGeneratedNotes(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-zinc-200 dark:border-zinc-800">
        
        {/* Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <Mic className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">AI Voice Note Generator</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Generate hyper-personalized audio pitches using Gemini TTS</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (currentlyPlayingAudio) currentlyPlayingAudio.pause();
              onClose();
            }}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Column: Configuration */}
          <div className="flex flex-col gap-5">
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-1.5">Value Proposition / Offer</label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                This will be appended after "Hey [Name], I saw what you guys are doing at [Business]."
              </p>
              <textarea
                value={pitchOffer}
                onChange={e => setPitchOffer(e.target.value)}
                placeholder="We help brands like yours scale their organic reach using..."
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-sm text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none h-24"
              />
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <label className="block text-sm font-semibold text-zinc-900 dark:text-white mb-3">AI Voice Actor</label>
              <div className="grid grid-cols-2 gap-2">
                {['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'].map(voice => (
                  <button
                    key={voice}
                    onClick={() => previewVoiceActor(voice)}
                    className={`p-2.5 rounded-lg border text-sm font-medium flex items-center justify-between cursor-pointer transition-all ${
                      voiceName === voice 
                        ? 'bg-emerald-50 border-emerald-500/50 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/50 dark:text-emerald-400' 
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span>{voice}</span>
                    <div className="flex items-center gap-2">
                      {playingId === `preview-${voice}` && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {voiceName === voice && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col min-h-0 h-[400px]">
              <div className="flex flex-col gap-2 mb-3 shrink-0">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                    Target Leads
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
                      {selectedLeads.length} selected
                    </span>
                  </label>
                  <button onClick={handleSelectAll} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer">
                    {selectedLeads.length === validLeads.length && validLeads.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Batch Mini Tabs */}
                {allBatches.length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar shrink-0">
                    <button
                      onClick={() => setSelectedBatch('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        selectedBatch === 'ALL'
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs font-bold'
                          : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      All Leads ({leads.filter(l => l.status !== 'Closed Lost').length})
                    </button>
                    {allBatches.map(b => {
                      const count = leads.filter(l => l.status !== 'Closed Lost' && l.tags.includes(b)).length;
                      return (
                        <button
                          key={b}
                          onClick={() => setSelectedBatch(b)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                            selectedBatch === b
                              ? 'bg-emerald-600 text-white dark:bg-emerald-500 shadow-xs font-bold'
                              : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          {b} ({count})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {validLeads.length === 0 ? (
                  <div className="text-center text-xs text-zinc-500 py-4">No leads found in this batch.</div>
                ) : (
                  validLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => toggleLead(lead.id)}
                      className={`p-2 rounded-lg border text-sm flex items-center gap-3 cursor-pointer transition-all ${
                        selectedLeads.includes(lead.id)
                          ? 'bg-white border-emerald-500/30 dark:bg-zinc-900 shadow-xs'
                          : 'bg-transparent border-transparent hover:bg-zinc-200/50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        selectedLeads.includes(lead.id)
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-zinc-300 dark:border-zinc-600'
                      }`}>
                        {selectedLeads.includes(lead.id) && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-zinc-900 dark:text-white truncate">
                          {lead.name || lead.storeName || lead.company || 'Unknown Lead'}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate">{lead.handle || lead.email || lead.phone}</p>
                      </div>
                      {generatedNotes[lead.id] && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-bold shrink-0">
                          Generated
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Generation & Results */}
          <div className="flex flex-col gap-4">
            <button
              onClick={generateBulkNotes}
              disabled={isGenerating || selectedLeads.length === 0 || !pitchOffer.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Audio ({selectedLeads.length} leads)...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate {selectedLeads.length} Voice Notes
                </>
              )}
            </button>

            <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Generated Audio</h3>
              
              {Object.keys(generatedNotes).length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                    <Music className="w-6 h-6 text-zinc-400" />
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No voice notes generated yet.</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                  {Object.entries(generatedNotes).map(([leadId, note]: [string, any]) => {
                    const lead = validLeads.find(l => l.id === leadId);
                    if (!lead) return null;
                    const isPlaying = playingId === leadId;

                    return (
                      <div key={leadId} className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-zinc-900 dark:text-white truncate">For: {lead.name || lead.storeName || lead.company || 'Unknown Lead'}</p>
                            <p className="text-[10px] text-zinc-500 leading-tight mt-0.5 line-clamp-2">{note.script}</p>
                          </div>
                          <button
                            onClick={() => downloadAudio(lead.name || lead.storeName || 'Lead', note.audioBase64)}
                            className="shrink-0 p-1.5 text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Download .wav file"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <button
                          onClick={() => playAudio(leadId, note.audioBase64)}
                          className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isPlaying 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                              : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {isPlaying ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Stop Playing
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" /> Play Audio
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
