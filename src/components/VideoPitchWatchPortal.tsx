import React, { useState, useEffect, useRef } from 'react';
import { Play, CheckCircle2, Phone, Calendar, ArrowRight, ShieldCheck, Sparkles, Building2 } from 'lucide-react';
import { Lead } from '../types';

interface VideoPitchWatchPortalProps {
  pitchId: string;
  lead?: Lead | null;
  onExitPreview?: () => void;
}

export const VideoPitchWatchPortal: React.FC<VideoPitchWatchPortalProps> = ({
  pitchId,
  lead,
  onExitPreview,
}) => {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [reportedMilestones, setReportedMilestones] = useState<Record<number, boolean>>({});
  const [fetchedPitch, setFetchedPitch] = useState<{
    leadName?: string;
    videoUrl?: string;
    phone?: string;
    website?: string;
    images?: string[];
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(!lead);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Fetch pitch info from server if lead prop is not passed (e.g. external recipient)
  useEffect(() => {
    let active = true;
    const loadPitchData = async () => {
      try {
        const res = await fetch(`/api/video-pitch-stats/${pitchId}`);
        const data = await res.json();
        if (active && data.success && data.stats) {
          setFetchedPitch(data.stats);
        }
      } catch (err) {
        console.warn('Could not fetch pitch details from server:', err);
      } finally {
        if (active) setLoadingStats(false);
      }
    };

    loadPitchData();
    return () => { active = false; };
  }, [pitchId]);

  const companyName = lead?.name || fetchedPitch?.leadName || 'Exclusive Preview';
  const phone = lead?.phone || fetchedPitch?.phone || '';
  const website = lead?.website || fetchedPitch?.website || '';
  const scrapedImages = fetchedPitch?.images || [];
  const videoSrc =
    lead?.videoPitchTracking?.videoUrl ||
    lead?.demoVideoUrl ||
    fetchedPitch?.videoUrl ||
    'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-screen-close-up-41408-large.mp4';

  // Send telemetry tracking ping
  const sendTrackingPing = async (event: string, pct = 0, currentSec = 0, totalDur = 0) => {
    try {
      await fetch('/api/track-video-pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pitchId,
          leadId: lead?.id || '',
          leadName: companyName,
          videoUrl: videoSrc,
          event,
          watchedSeconds: Math.round(currentSec),
          durationSeconds: Math.round(totalDur),
          percentWatched: Math.round(pct),
          device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'iPhone / Mobile' : 'Desktop Browser'
        })
      });
    } catch (err) {
      console.warn('Tracking ping notice:', err);
    }
  };

  // Open ping when page loads
  useEffect(() => {
    sendTrackingPing('open', 0, 0, 0);
  }, [pitchId]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setWatchedSeconds(cur);
    setDuration(dur);
    const pct = (cur / dur) * 100;

    // Report milestones at 25%, 50%, 75%, 100%
    const milestones = [25, 50, 75, 95];
    for (const m of milestones) {
      if (pct >= m && !reportedMilestones[m]) {
        setReportedMilestones((prev) => ({ ...prev, [m]: true }));
        sendTrackingPing(m >= 95 ? 'completed' : `progress_${m}`, pct, cur, dur);
      }
    }
  };

  const handlePlay = () => {
    setHasPlayed(true);
    sendTrackingPing('play', 0, videoRef.current?.currentTime || 0, videoRef.current?.duration || 0);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-between p-4 sm:p-8 font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between py-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center font-black text-white shadow-lg shadow-rose-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-zinc-400 block">Private Showcase</span>
            <span className="text-sm font-bold text-white block">{companyName}</span>
          </div>
        </div>

        {onExitPreview && (
          <button
            onClick={onExitPreview}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
          >
            ← Back to CRM
          </button>
        )}
      </header>

      {/* Main Showcase Hero */}
      <main className="w-full max-w-4xl my-auto py-8 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold mb-4">
          <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
          <span>Prepared Exclusively for {companyName}</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3 max-w-2xl">
          A Quick 30-Second Preview Tailored For Your Brand
        </h1>
        <p className="text-zinc-400 text-xs sm:text-sm max-w-xl mb-6">
          We put together this personalized visual walkthrough highlighting exactly how we can accelerate engagement and conversions for {companyName}.
        </p>

        {/* Scraped Website / IG Photo Carousel */}
        {scrapedImages.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left space-y-3 w-full max-w-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Extracted Shop Photos ({scrapedImages.length})</span>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {scrapedImages.slice(0, 4).map((imgUrl, idx) => (
                <div key={idx} className="aspect-video bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800/80 relative group">
                  <img src={imgUrl} alt={`Shop asset ${idx}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Player Container */}
        <div className="w-full max-w-2xl aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl shadow-rose-500/10 relative group">
          <video
            ref={videoRef}
            src={videoSrc}
            controls
            playsInline
            onPlay={handlePlay}
            onTimeUpdate={handleTimeUpdate}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center">
          {phone && (
            <a
              href={`sms:${phone.replace(/[^\d+]/g, '')}&body=${encodeURIComponent("Hey, just watched the preview! Let's chat.")}`}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>Reply via iMessage</span>
            </a>
          )}

          <a
            href={website || '#'}
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule 10-Min Walkthrough</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl text-center py-4 border-t border-zinc-900 text-zinc-600 text-xs flex items-center justify-between flex-wrap gap-2">
        <span>© {new Date().getFullYear()} Private Client Showcase</span>
        <span className="flex items-center gap-1.5 text-zinc-500">
          <Building2 className="w-3.5 h-3.5" />
          Direct Outreach Portal
        </span>
      </footer>
    </div>
  );
};
