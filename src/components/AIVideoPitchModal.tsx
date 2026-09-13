import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Video,
  Send,
  Copy,
  Check,
  ExternalLink,
  Eye,
  RefreshCw,
  Clock,
  Play,
  Share2,
  CheckCircle2,
  Flame,
  Smartphone,
  MessageCircle,
} from 'lucide-react';
import { Lead, VideoPitchTracking } from '../types';
import { formatPhoneForDialing, getIMessageUrl, getWhatsAppUrl } from '../utils/phoneUtils';

interface AIVideoPitchModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onUpdateLead: (updatedLead: Lead) => void;
}

export const AIVideoPitchModal: React.FC<AIVideoPitchModalProps> = ({
  lead,
  isOpen,
  onClose,
  onUpdateLead,
}) => {
  const [channel, setChannel] = useState<'imessage' | 'whatsapp' | 'email'>('imessage');
  const [videoUrl, setVideoUrl] = useState(
    lead.videoPitchTracking?.videoUrl || lead.demoVideoUrl || 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-screen-close-up-41408-large.mp4'
  );
  const [pitchMessage, setPitchMessage] = useState('');
  const [hookAngle, setHookAngle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPollingStats, setIsPollingStats] = useState(false);
  const [liveStats, setLiveStats] = useState<any>(null);

  const pitchId = lead.videoPitchTracking?.pitchId || `pitch_${lead.id}_${Date.now()}`;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://assixcrm.ai.studio';
  const trackableWatchUrl = `${baseUrl}/?watch=${pitchId}`;

  // Register pitch details on server for external viewers
  const registerPitchOnServer = async () => {
    try {
      await fetch('/api/register-video-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pitchId,
          leadId: lead.id,
          leadName: lead.name,
          videoUrl: lead.videoPitchTracking?.videoUrl || lead.demoVideoUrl || '',
          phone: lead.phone || '',
          website: lead.website || '',
        })
      });
    } catch (e) {
      console.warn('Pitch registration notice:', e);
    }
  };

  // Fetch or generate initial pitch copy
  const generatePitchCopy = async (selectedChannel = channel) => {
    setIsGenerating(true);
    await registerPitchOnServer();
    try {
      const res = await fetch('/api/generate-video-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadName: lead.name,
          niche: lead.customFields?.['Niche'] || 'E-commerce',
          phone: lead.phone || '',
          instagramHandle: lead.instagramHandle || '',
          website: lead.website || '',
          channel: selectedChannel,
          watchUrl: trackableWatchUrl,
        }),
      });

      const data = await res.json();
      if (data.success && data.messageText) {
        setPitchMessage(data.messageText);
        setHookAngle(data.hookAngle || 'Visual Demonstration Hook');
      } else {
        // Fallback pitch copy
        const defaultText = `Hey ${lead.name.split(' ')[0] || 'there'}, put together a quick 30s custom preview of how our visual engine looks for your catalog: ${trackableWatchUrl} — let me know what you think!`;
        setPitchMessage(defaultText);
      }
    } catch (err) {
      console.error('Pitch generation error:', err);
      const defaultText = `Hey ${lead.name.split(' ')[0] || 'there'}, put together a quick 30s custom preview for ${lead.name}: ${trackableWatchUrl} — take a quick look when you have a second!`;
      setPitchMessage(defaultText);
    } finally {
      setIsGenerating(false);
    }
  };

  // Poll video pitch telemetry stats
  const fetchPitchStats = async () => {
    setIsPollingStats(true);
    try {
      const res = await fetch(`/api/video-pitch-stats/${pitchId}`);
      const data = await res.json();
      if (data.success && data.stats) {
        setLiveStats(data.stats);

        // Update lead object with new tracking data
        const updatedTracking: VideoPitchTracking = {
          pitchId,
          videoUrl,
          createdDate: lead.videoPitchTracking?.createdDate || new Date().toISOString(),
          sentVia: channel === 'imessage' ? 'iMessage' : channel === 'whatsapp' ? 'WhatsApp' : 'Email',
          lastViewedAt: data.stats.lastViewedAt,
          viewCount: data.stats.totalViews || 0,
          highestPercentWatched: data.stats.highestPercent || 0,
          views: data.stats.events || [],
        };

        const updatedLead: Lead = {
          ...lead,
          videoPitchTracking: updatedTracking,
          lastInteractionDate: new Date().toISOString().split('T')[0],
        };

        onUpdateLead(updatedLead);
      }
    } catch (err) {
      console.warn('Stats fetch notice:', err);
    } finally {
      setIsPollingStats(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (!pitchMessage) {
        generatePitchCopy('imessage');
      }
      fetchPitchStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(pitchMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendViaIMessage = () => {
    if (!lead.phone) {
      alert('This lead does not have a phone number saved.');
      return;
    }
    // Save sent tracking on lead
    const trackingObj: VideoPitchTracking = lead.videoPitchTracking || {
      pitchId,
      videoUrl,
      createdDate: new Date().toISOString(),
      sentVia: 'iMessage',
      viewCount: 0,
      highestPercentWatched: 0,
      views: [],
    };
    onUpdateLead({
      ...lead,
      videoPitchTracking: trackingObj,
      status: lead.status === 'New' ? 'Contacted' : lead.status,
    });

    const iMsgUrl = getIMessageUrl(lead.phone, pitchMessage);
    window.location.href = iMsgUrl;
  };

  const handleSendViaWhatsApp = () => {
    if (!lead.phone) {
      alert('This lead does not have a phone number saved.');
      return;
    }
    const trackingObj: VideoPitchTracking = lead.videoPitchTracking || {
      pitchId,
      videoUrl,
      createdDate: new Date().toISOString(),
      sentVia: 'WhatsApp',
      viewCount: 0,
      highestPercentWatched: 0,
      views: [],
    };
    onUpdateLead({
      ...lead,
      videoPitchTracking: trackingObj,
      status: lead.status === 'New' ? 'Contacted' : lead.status,
    });

    const waUrl = getWhatsAppUrl(lead.phone, pitchMessage);
    window.open(waUrl, '_blank');
  };

  const hasViews = (liveStats?.totalViews || lead.videoPitchTracking?.viewCount || 0) > 0;
  const viewCount = liveStats?.totalViews || lead.videoPitchTracking?.viewCount || 0;
  const highestPct = liveStats?.highestPercent || lead.videoPitchTracking?.highestPercentWatched || 0;
  const lastViewed = liveStats?.lastViewedAt || lead.videoPitchTracking?.lastViewedAt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-rose-500/20">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  AI Video Pitch & View Tracker
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  iMessage Pixel
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Send personalized preview video to <span className="font-semibold text-zinc-800 dark:text-zinc-200">{lead.name}</span> with instant watch notifications.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-medium">
          {/* Live View Telemetry Radar Banner */}
          <div className={`p-4 rounded-xl border transition-all ${
            hasViews 
              ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500/30' 
              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  hasViews 
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 animate-pulse' 
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                }`}>
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-white text-xs">
                      {hasViews ? `👀 Prospect Opened & Watched!` : 'Awaiting First Prospect View'}
                    </span>
                    {hasViews && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                        <Flame className="w-3 h-3 text-emerald-500" />
                        HOT LEAD
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {hasViews 
                      ? `Viewed ${viewCount} times • Completed ${highestPct}% • Last active ${lastViewed ? new Date(lastViewed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}`
                      : 'The moment the prospect clicks your iMessage link, this card updates in real-time.'}
                  </p>
                </div>
              </div>

              <button
                onClick={fetchPitchStats}
                disabled={isPollingStats}
                className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer text-[11px]"
              >
                <RefreshCw className={`w-3 h-3 ${isPollingStats ? 'animate-spin' : ''}`} />
                <span>Check Views</span>
              </button>
            </div>
          </div>

          {/* Video Attachment Preview & URL Config */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-zinc-600 dark:text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
                Video Preview Attachment
              </label>
              <a
                href={trackableWatchUrl}
                target="_blank"
                rel="noreferrer"
                className="text-rose-500 font-semibold hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Preview Prospect Watch Portal</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div className="sm:col-span-1 aspect-video rounded-xl bg-black overflow-hidden border border-zinc-200 dark:border-zinc-800 relative">
                <video src={videoUrl} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Play className="w-6 h-6 text-white/90 drop-shadow" />
                </div>
              </div>
              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://... MP4, Loom or demo video URL"
                    className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  <label className="shrink-0 px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5" />
                    Upload
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          setVideoUrl(url);
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                  <span className="flex-1">Using custom product demo attached to {lead.name}.</span>
                  <button 
                    onClick={() => {
                      // Attempt to generate a quick thumbnail and copy link
                      const video = document.createElement('video');
                      video.src = videoUrl;
                      video.crossOrigin = 'anonymous';
                      video.currentTime = 1; // get 1 second in
                      video.onloadeddata = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                          // Draw a play button
                          ctx.fillStyle = 'rgba(0,0,0,0.5)';
                          ctx.fillRect(0,0,canvas.width,canvas.height);
                          ctx.fillStyle = 'white';
                          ctx.beginPath();
                          ctx.moveTo(canvas.width/2 - 20, canvas.height/2 - 20);
                          ctx.lineTo(canvas.width/2 + 20, canvas.height/2);
                          ctx.lineTo(canvas.width/2 - 20, canvas.height/2 + 20);
                          ctx.fill();
                          
                          canvas.toBlob((blob) => {
                            if (blob) {
                              try {
                                const textBlob = new Blob([`${pitchMessage}`], { type: 'text/plain' });
                                navigator.clipboard.write([
                                  new ClipboardItem({
                                    'image/png': blob,
                                    'text/plain': textBlob
                                  })
                                ]);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              } catch(e) {
                                console.error('Failed to copy rich thumbnail to clipboard', e);
                                // Fallback
                                navigator.clipboard.writeText(pitchMessage);
                              }
                            }
                          }, 'image/png');
                        }
                      };
                    }}
                    className="text-rose-500 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" /> Copy Link & Thumbnail
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Channel Selector */}
          <div>
            <label className="text-zinc-600 dark:text-zinc-400 font-semibold text-[11px] uppercase tracking-wider block mb-1.5">
              Outreach Channel
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setChannel('imessage');
                  generatePitchCopy('imessage');
                }}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  channel === 'imessage'
                    ? 'bg-blue-500/10 text-[#007AFF] border-blue-500/40'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Apple iMessage</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setChannel('whatsapp');
                  generatePitchCopy('whatsapp');
                }}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  channel === 'whatsapp'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setChannel('email');
                  generatePitchCopy('email');
                }}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  channel === 'email'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/40'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Email Pitch</span>
              </button>
            </div>
          </div>

          {/* Generated Message Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-zinc-600 dark:text-zinc-400 font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                <span>AI Generated Outreach Script</span>
              </label>

              <button
                onClick={() => generatePitchCopy(channel)}
                disabled={isGenerating}
                className="text-rose-500 hover:underline flex items-center gap-1 font-semibold text-[11px] cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>Regenerate Angle</span>
              </button>
            </div>

            <div className="relative">
              <textarea
                rows={4}
                value={pitchMessage}
                onChange={(e) => setPitchMessage(e.target.value)}
                placeholder="Generating pitch..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            {hookAngle && (
              <p className="text-[11px] text-zinc-400 mt-1">
                Strategy: <span className="text-zinc-600 dark:text-zinc-300">{hookAngle}</span>
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            onClick={handleCopy}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Script & Link'}</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {channel === 'whatsapp' ? (
              <button
                onClick={handleSendViaWhatsApp}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Launch WhatsApp</span>
              </button>
            ) : channel === 'email' ? (
              <a
                href={`mailto:${lead.email || ''}?subject=${encodeURIComponent(`Custom 30s preview for ${lead.name}`)}&body=${encodeURIComponent(pitchMessage)}`}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Open Email Composer</span>
              </a>
            ) : (
              <button
                onClick={handleSendViaIMessage}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#007AFF] hover:bg-blue-600 font-bold text-xs text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer"
              >
                <Smartphone className="w-4 h-4" />
                <span>Send via iMessage</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
