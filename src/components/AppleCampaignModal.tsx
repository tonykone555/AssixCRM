import React, { useState, useMemo } from 'react';
import {
  X,
  MessageSquare,
  Sparkles,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  Terminal,
  Users,
  CheckCircle2,
  ShieldCheck,
  Send,
  PhoneCall,
  Video,
  Upload,
  Play,
  Film,
  Link as LinkIcon,
  Loader2,
  Plus,
} from 'lucide-react';
import { Lead, VideoPitchTracking } from '../types';
import {
  extractLeadPhone,
  formatPhoneForDialing,
  formatPhoneDisplay,
  getIMessageUrl,
  getFaceTimeAudioUrl,
  triggerFaceTimeAudioCall
} from '../utils/phoneUtils';
import { uploadFileToStorage } from '../lib/firebase';

interface AppleCampaignModalProps {
  leads: Lead[];
  selectedLeadIds?: string[];
  onClose: () => void;
  onUpdateLead: (lead: Lead) => void;
  onBatchUpdateLeads?: (leads: Lead[]) => void;
  isDarkMode: boolean;
}

export const AppleCampaignModal: React.FC<AppleCampaignModalProps> = ({
  leads,
  selectedLeadIds = [],
  onClose,
  onUpdateLead,
  onBatchUpdateLeads,
}) => {
  // Target audience selection: 'selected' | 'apple_only' | 'all_phones'
  const hasSelected = selectedLeadIds.length > 0;
  const [filterMode, setFilterMode] = useState<'selected' | 'apple_only' | 'all_phones'>(
    hasSelected ? 'selected' : 'apple_only'
  );

  // Template text with placeholders
  const [template, setTemplate] = useState<string>(
    `Hey {firstName}! Saw your work on @{handle} and really love what you're building with {businessName}. Recorded a quick 1-min video demo for you: {videoUrl} — Do you have 2 mins to check it out?`
  );

  const [previewIndex, setPreviewIndex] = useState(0);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);
  const [verifiedAllSuccess, setVerifiedAllSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'interactive' | 'applescript' | 'export'>('interactive');

  // Video Pitch Studio State
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const [customVideoInput, setCustomVideoInput] = useState('');
  const [copiedVideoUrl, setCopiedVideoUrl] = useState(false);
  const [batchVideoSuccess, setBatchVideoSuccess] = useState(false);
  const [enablePixelTracking, setEnablePixelTracking] = useState(true);

  // Filter recipient leads who have phone numbers
  const recipientLeads = useMemo(() => {
    return leads.filter((lead) => {
      const phone = extractLeadPhone(lead);
      if (!phone) return false;

      if (filterMode === 'selected') {
        return selectedLeadIds.includes(lead.id);
      }
      if (filterMode === 'apple_only') {
        return Boolean(lead.isAppleVerified);
      }
      return true; // all_phones
    });
  }, [leads, selectedLeadIds, filterMode]);

  // Handle preview bounds
  const currentLead = recipientLeads[previewIndex] || recipientLeads[0];
  const currentPhone = currentLead ? extractLeadPhone(currentLead) : '';

  // Helper to generate pixel-tracked URL for a lead on assixcrm.ai.studio domain
  const getLeadVideoUrl = (lead: Lead | undefined): string => {
    if (!lead) return '';
    const rawVideoUrl = lead.videoPitchTracking?.videoUrl || lead.demoVideoUrl || '';
    if (!rawVideoUrl) return '';

    const pitchId = lead.videoPitchTracking?.pitchId || `pitch_${lead.id}`;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://assixcrm.ai.studio';

    // Register pitch on server in background
    fetch('/api/register-video-pitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pitchId,
        leadId: lead.id,
        leadName: lead.name,
        videoUrl: rawVideoUrl,
        phone: lead.phone || '',
        website: lead.website || '',
      })
    }).catch(() => {});

    return `${baseUrl}/?watch=${pitchId}`;
  };

  // Variable replacement helper
  const renderMessage = (lead: Lead | undefined, tmpl: string): string => {
    if (!lead) return tmpl;
    const fullName = lead.name || '';
    const firstName = fullName.split(' ')[0] || fullName;
    const cleanHandle = lead.instagramHandle.replace(/^@/, '');
    const phone = extractLeadPhone(lead);
    const formattedPhone = formatPhoneDisplay(phone);
    const city = lead.customFields?.['City'] || lead.customFields?.['Location'] || 'your area';
    const niche = lead.customFields?.['Niche'] || 'your industry';
    const website = lead.website || '';
    const videoUrl = getLeadVideoUrl(lead);

    let rendered = tmpl
      .replace(/{name}/g, fullName)
      .replace(/{firstName}/g, firstName)
      .replace(/{businessName}/g, fullName)
      .replace(/{handle}/g, cleanHandle)
      .replace(/{phone}/g, formattedPhone || phone)
      .replace(/{city}/g, city)
      .replace(/{niche}/g, niche)
      .replace(/{website}/g, website)
      .replace(/{videoUrl}/gi, videoUrl)
      .replace(/{video}/gi, videoUrl)
      .replace(/{demoVideoUrl}/gi, videoUrl);

    // Support custom fields dynamically
    if (lead.customFields) {
      Object.entries(lead.customFields).forEach(([key, value]) => {
        // Create regex to match {custom.FieldName} case-insensitively
        // We strip spaces from key for easier tag writing e.g. {custom.outreach_call}
        const regex = new RegExp(`{custom.${key.replace(/\s+/g, '_')}}`, 'gi');
        rendered = rendered.replace(regex, value);
      });
    }

    // Clean up unreplaced custom fields
    rendered = rendered.replace(/{custom\.[^}]+}/g, '');
    
    return rendered;
  };

  const currentCustomMessage = renderMessage(currentLead, template);

  // Helper to ensure video pitch tracking metadata is initialized on lead
  const prepareLeadWithVideo = (lead: Lead, url: string): Lead => {
    const pitchId = lead.videoPitchTracking?.pitchId || `pitch_${lead.id}`;
    const existingTracking = lead.videoPitchTracking;
    const updatedTracking: VideoPitchTracking = {
      pitchId,
      videoUrl: url,
      createdDate: existingTracking?.createdDate || new Date().toISOString(),
      sentVia: existingTracking?.sentVia || 'iMessage',
      lastViewedAt: existingTracking?.lastViewedAt,
      viewCount: existingTracking?.viewCount || 0,
      highestPercentWatched: existingTracking?.highestPercentWatched || 0,
      views: existingTracking?.views || [],
    };
    return {
      ...lead,
      demoVideoUrl: url,
      videoPitchTracking: updatedTracking,
    };
  };

  // Video Upload and Batch Assignment Handlers
  const handleVideoUpload = async (file: File, applyToAll: boolean) => {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      alert(`Video file size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 100MB.`);
      return;
    }

    setIsUploadingVideo(true);
    setVideoUploadProgress(0);
    try {
      const path = `videos/apple_campaign_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const url = await uploadFileToStorage(file, path, (progress) => {
        setVideoUploadProgress(progress);
      });

      if (applyToAll && recipientLeads.length > 0) {
        const updatedQueue = recipientLeads.map((l) => prepareLeadWithVideo(l, url));
        if (onBatchUpdateLeads) {
          onBatchUpdateLeads(updatedQueue);
        } else {
          updatedQueue.forEach((l) => onUpdateLead(l));
        }
        setBatchVideoSuccess(true);
        setTimeout(() => setBatchVideoSuccess(false), 3000);
      } else if (currentLead) {
        onUpdateLead(prepareLeadWithVideo(currentLead, url));
      }

      setCustomVideoInput(url);

      // Auto-insert {videoUrl} if template doesn't have it
      if (!template.toLowerCase().includes('{videourl}') && !template.toLowerCase().includes('{video}')) {
        setTemplate((prev) => `${prev} {videoUrl}`);
      }
    } catch (err) {
      console.error('Video upload error:', err);
      alert('Failed to upload video file. Please try again.');
    } finally {
      setIsUploadingVideo(false);
      setVideoUploadProgress(null);
    }
  };

  const handleApplyVideoUrlToAll = (urlToApply: string) => {
    const trimmed = urlToApply.trim();
    if (!trimmed || recipientLeads.length === 0) return;

    const updatedQueue = recipientLeads.map((l) => prepareLeadWithVideo(l, trimmed));
    if (onBatchUpdateLeads) {
      onBatchUpdateLeads(updatedQueue);
    } else {
      updatedQueue.forEach((l) => onUpdateLead(l));
    }

    // Ensure {videoUrl} tag exists in template
    if (!template.toLowerCase().includes('{videourl}') && !template.toLowerCase().includes('{video}')) {
      setTemplate((prev) => `${prev} {videoUrl}`);
    }

    setBatchVideoSuccess(true);
    setTimeout(() => setBatchVideoSuccess(false), 3000);
  };

  const handleCopyVideoUrl = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedVideoUrl(true);
    setTimeout(() => setCopiedVideoUrl(false), 2500);
  };

  // Dynamic chips that can be clicked to insert
  const tags = useMemo(() => {
    const baseTags = [
      { label: '{firstName}', desc: 'First Name' },
      { label: '{name}', desc: 'Full Name' },
      { label: '{handle}', desc: 'IG Handle' },
      { label: '{businessName}', desc: 'Company' },
      { label: '{videoUrl}', desc: 'Demo Video Link' },
      { label: '{city}', desc: 'City' },
      { label: '{website}', desc: 'Website' },
    ];

    // Collect unique custom field keys from recipient leads
    const customFieldKeys = new Set<string>();
    recipientLeads.forEach(lead => {
      if (lead.customFields) {
        Object.keys(lead.customFields).forEach(k => customFieldKeys.add(k));
      }
    });

    const customTags = Array.from(customFieldKeys).map(k => ({
      label: `{custom.${k.replace(/\s+/g, '_')}}`,
      desc: k.length > 15 ? k.substring(0, 15) + '...' : k
    }));

    return [...baseTags, ...customTags];
  }, [recipientLeads]);

  const insertTag = (tag: string) => {
    setTemplate((prev) => `${prev} ${tag}`);
  };

  // AppleScript & Mac Video Attachment State
  const [macVideoPath, setMacVideoPath] = useState('/Users/username/Desktop/my_pitch_video.mp4');
  const [attachLocalVideo, setAttachLocalVideo] = useState(false);

  // Generate AppleScript code for macOS Messages
  const appleScriptCode = useMemo(() => {
    if (recipientLeads.length === 0) return '# No leads selected with phone numbers';

    const items = recipientLeads.map((lead) => {
      const phone = formatPhoneForDialing(extractLeadPhone(lead));
      const msg = renderMessage(lead, template).replace(/"/g, '\\"').replace(/\n/g, '\\n');
      return `    {"${phone}", "${msg}"}`;
    });

    const cleanVideoPath = macVideoPath.trim() || '/Users/username/Desktop/my_pitch_video.mp4';

    if (attachLocalVideo) {
      return `(* 
  Assix CRM - 100% Free Bulk iMessage & Video Runner for macOS
  Sends personalized video attachments & messages via your Mac's native Messages app
*)

set videoFilePath to "${cleanVideoPath}"
set videoFile to POSIX file videoFilePath

set recipientQueue to { ¬
${items.join(', ¬\n')}
}

tell application "Messages"
    set iMessageService to 1st account whose service type = iMessage
    repeat with itemData in recipientQueue
        set phoneNum to item 1 of itemData
        set msgText to item 2 of itemData
        try
            set targetBuddy to participant phoneNum of iMessageService
            
            -- 1. Send the Video Attachment File
            send videoFile to targetBuddy
            delay 2
            
            -- 2. Send the Personalized Message
            send msgText to targetBuddy
            
            delay (3 + (random number from 1 to 3)) -- Humanized safe delay
        on error errMsg
            log "Failed to send to: " & phoneNum & " -> " & errMsg
        end try
    end repeat
end tell

display notification "All ${recipientLeads.length} videos & iMessages sent!" with title "Assix Campaign Complete"
`;
    }

    return `(* 
  Assix CRM - 100% Free Bulk iMessage Runner for macOS
  Sends personalized iMessages via your Mac's native Messages app
  with safe humanized 3-second intervals to avoid rate limits.
*)

set recipientQueue to { ¬
${items.join(', ¬\n')}
}

tell application "Messages"
    set iMessageService to 1st account whose service type = iMessage
    repeat with itemData in recipientQueue
        set phoneNum to item 1 of itemData
        set msgText to item 2 of itemData
        try
            set targetBuddy to participant phoneNum of iMessageService
            send msgText to targetBuddy
            delay (3 + (random number from 1 to 3)) -- Humanized interval
        on error errMsg
            log "Failed to send to: " & phoneNum & " -> " & errMsg
        end try
    end repeat
end tell

display notification "All ${recipientLeads.length} iMessages processed successfully!" with title "Assix Outreach Complete"
`;
  }, [recipientLeads, template, attachLocalVideo, macVideoPath]);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(appleScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([appleScriptCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assix_imessage_campaign_${new Date().toISOString().slice(0, 10)}.applescript`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyCsv = () => {
    const rows = [
      ['Name', 'Handle', 'Phone', 'Apple Verified', 'Personalized Message'],
      ...recipientLeads.map((l) => [
        `"${l.name.replace(/"/g, '""')}"`,
        `"${l.instagramHandle.replace(/"/g, '""')}"`,
        `"${extractLeadPhone(l)}"`,
        l.isAppleVerified ? 'Yes' : 'No',
        `"${renderMessage(l, template).replace(/"/g, '""')}"`
      ])
    ];
    const csvContent = rows.map((r) => r.join(',')).join('\n');
    navigator.clipboard.writeText(csvContent);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2500);
  };

  const handleVerifyAllAsApple = () => {
    if (recipientLeads.length === 0) return;
    const updated = recipientLeads.map((lead) => ({
      ...lead,
      isAppleVerified: true
    }));

    if (onBatchUpdateLeads) {
      onBatchUpdateLeads(updated);
    } else {
      updated.forEach((l) => onUpdateLead(l));
    }

    setVerifiedAllSuccess(true);
    setTimeout(() => setVerifiedAllSuccess(false), 3000);
  };

  const toggleCurrentAppleStatus = () => {
    if (!currentLead) return;
    const updated = {
      ...currentLead,
      isAppleVerified: !currentLead.isAppleVerified
    };
    onUpdateLead(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-900 dark:text-zinc-100">
        {/* Apple Cupertino Style Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#007AFF] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <MessageSquare className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Apple Outreach & iMessage Studio
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-[#007AFF] dark:text-blue-400 font-bold border border-blue-500/20 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>100% Free via Mac / iOS</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Personalized bulk messaging & one-click FaceTime Audio calling for Apple-compatible leads
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Target Audience Segmented Picker */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-900/70 border border-zinc-200/70 dark:border-zinc-800/70">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-[11px] shrink-0">
                Target Leads:
              </span>
              <div className="inline-flex flex-wrap rounded-xl p-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 shadow-xs gap-1">
                {hasSelected && (
                  <button
                    onClick={() => {
                      setFilterMode('selected');
                      setPreviewIndex(0);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      filterMode === 'selected'
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    Selected ({selectedLeadIds.length})
                  </button>
                )}
                <button
                  onClick={() => {
                    setFilterMode('apple_only');
                    setPreviewIndex(0);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterMode === 'apple_only'
                      ? 'bg-[#007AFF] text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Apple Blue Tick Only</span>
                </button>
                <button
                  onClick={() => {
                    setFilterMode('all_phones');
                    setPreviewIndex(0);
                  }}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    filterMode === 'all_phones'
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  All Leads with Phone
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-xs font-semibold text-zinc-500">
                Found <strong className="text-zinc-900 dark:text-white">{recipientLeads.length}</strong> recipient(s)
              </span>
              <button
                onClick={handleVerifyAllAsApple}
                disabled={recipientLeads.length === 0}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#007AFF] dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Mark all selected leads with Apple Blue Tick"
              >
                {verifiedAllSuccess ? <Check className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                <span>{verifiedAllSuccess ? 'Verified All!' : 'Batch Mark as Apple Verified'}</span>
              </button>
            </div>
          </div>

          {/* Campaign Video Attachment & Upload Studio */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <span>Campaign Video Link</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                      Tag: &#123;videoUrl&#125;
                    </span>
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Upload a video file to auto-attach a trackable <code className="bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1 py-0.5 rounded font-mono font-bold">?watch=pitch_id</code> video page link to your messages.
                  </p>
                </div>
              </div>

              {/* Simple Action Buttons: Upload Video & Copy URL */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {isUploadingVideo ? (
                  <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 text-xs font-bold flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading ({videoUploadProgress}%)</span>
                  </div>
                ) : (
                  <label className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Video</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleVideoUpload(file, true);
                      }}
                      className="hidden"
                    />
                  </label>
                )}

                {currentLead && (currentLead.demoVideoUrl || currentLead.videoPitchTracking?.videoUrl) && (
                  <button
                    type="button"
                    onClick={() => handleCopyVideoUrl(getLeadVideoUrl(currentLead))}
                    className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {copiedVideoUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedVideoUrl ? 'Copied Link!' : 'Copy URL'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Active Link Status Display */}
            {currentLead && (currentLead.demoVideoUrl || currentLead.videoPitchTracking?.videoUrl) && (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-mono">
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-200 truncate font-semibold">
                  <Play className="w-3.5 h-3.5 text-rose-500 shrink-0 fill-current" />
                  <span className="truncate">{getLeadVideoUrl(currentLead)}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold font-sans shrink-0">
                  Ready for &#123;videoUrl&#125;
                </span>
              </div>
            )}

            {batchVideoSuccess && (
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4" />
                <span>Video uploaded! &#123;videoUrl&#125; set to https://assixcrm.ai.studio/?watch=... for all campaign leads.</span>
              </div>
            )}
          </div>

          {/* Template Editor & Live Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Template Editor */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Personalized Template</span>
                </label>
                <span className="text-[11px] text-zinc-400">
                  {template.length} characters
                </span>
              </div>

              <textarea
                rows={5}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder="Type your message with dynamic tags..."
                className="w-full p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
              />

              {/* Variable Chips */}
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Click to insert dynamic contact tags:
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
                  {tags.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => insertTag(t.label)}
                      className="px-2 py-1 rounded-lg bg-zinc-100 hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-blue-900/30 text-zinc-700 hover:text-[#007AFF] dark:text-zinc-300 dark:hover:text-blue-300 border border-zinc-200 dark:border-zinc-700 text-[11px] font-mono font-semibold transition-colors cursor-pointer shrink-0"
                      title={t.desc}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Realistic Apple Messages Preview */}
            <div className="lg:col-span-6 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span>Apple iMessage Preview</span>
                </label>

                {recipientLeads.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span>
                      {previewIndex + 1} of {recipientLeads.length}
                    </span>
                    <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-0.5">
                      <button
                        onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                        disabled={previewIndex === 0}
                        className="p-1 rounded hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPreviewIndex((i) => Math.min(recipientLeads.length - 1, i + 1))}
                        disabled={previewIndex >= recipientLeads.length - 1}
                        className="p-1 rounded hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* iOS Style Messages Bubble Card */}
              <div className="flex-1 min-h-[190px] rounded-2xl bg-gradient-to-b from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 p-4 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between relative shadow-inner">
                {currentLead ? (
                  <>
                    {/* Top Contact Bar in iMessage Style */}
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-zinc-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center">
                          {currentLead.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span>{currentLead.name}</span>
                            {currentLead.isAppleVerified && (
                              <span className="text-[#007AFF]" title="Apple Verified / Blue Tick">
                                <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono">
                            {formatPhoneDisplay(currentPhone) || 'No phone'}
                          </div>
                        </div>
                      </div>

                      {/* Quick Direct Actions for this lead */}
                      <div className="flex items-center gap-1.5">
                        {currentPhone && (
                          <>
                            <a
                              href={getFaceTimeAudioUrl(currentPhone)}
                              target="_top"
                              onClick={(e) => {
                                e.preventDefault();
                                triggerFaceTimeAudioCall(currentPhone);
                              }}
                              className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-xs cursor-pointer"
                              title="Call via FaceTime Audio (Free internet audio)"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={getIMessageUrl(currentPhone, currentCustomMessage)}
                              className="px-2.5 py-1.5 rounded-xl bg-[#007AFF] text-white hover:bg-blue-600 transition-colors font-semibold text-xs flex items-center gap-1 shadow-xs"
                              title="Open in Apple Messages"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Open iMessage</span>
                            </a>
                          </>
                        )}
                        <button
                          onClick={toggleCurrentAppleStatus}
                          className={`p-1.5 rounded-xl border text-[10px] font-bold transition-colors ${
                            currentLead.isAppleVerified
                              ? 'bg-blue-50 text-[#007AFF] border-blue-200 dark:bg-blue-950/40 dark:border-blue-800'
                              : 'bg-white text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800'
                          }`}
                          title={currentLead.isAppleVerified ? 'Verified Apple user' : 'Click to mark as Apple Verified'}
                        >
                          {currentLead.isAppleVerified ? '🍎 Verified' : 'Mark 🍎'}
                        </button>
                      </div>
                    </div>

                    {/* Messages Blue Bubble */}
                    <div className="py-4 flex flex-col items-end gap-2">
                      <div className="max-w-[85%] bg-[#007AFF] text-white rounded-2xl rounded-br-xs px-4 py-2.5 shadow-md text-xs leading-relaxed font-normal select-text">
                        <p className="whitespace-pre-wrap">{currentCustomMessage}</p>
                        <div className="text-[10px] text-blue-100/80 text-right mt-1 font-medium">
                          Delivered • iMessage
                        </div>
                      </div>
                    </div>

                    <div className="text-center text-[10px] text-zinc-400">
                      Previewing contact @{currentLead.instagramHandle} • Tap Open iMessage above to launch
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs italic">
                    No matching leads found for this filter.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Execution Modes: Step-by-Step vs AppleScript 1-Click vs CSV */}
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="inline-flex flex-wrap rounded-xl p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 gap-1">
                <button
                  onClick={() => setActiveTab('interactive')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'interactive'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Step-Through Messenger</span>
                </button>
                <button
                  onClick={() => setActiveTab('applescript')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'applescript'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Mac AppleScript (Free)</span>
                </button>
                <button
                  onClick={() => setActiveTab('export')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'export'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV / Text</span>
                </button>
              </div>

              <div className="text-xs text-zinc-500 font-medium">
                {recipientLeads.length} leads in campaign queue
              </div>
            </div>

            {/* Tab 1: Interactive Step-Through */}
            {activeTab === 'interactive' && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Step-by-Step Safe Sender
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Sends to one contact at a time via native Apple Messages, automatically pre-filling their name and number.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {currentLead && currentPhone && (
                    <a
                      href={getIMessageUrl(currentPhone, currentCustomMessage)}
                      onClick={() => {
                        // Advance to next lead after click
                        if (previewIndex < recipientLeads.length - 1) {
                          setPreviewIndex((i) => i + 1);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#007AFF] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Send to {currentLead.name.split(' ')[0]} & Next &rarr;</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: AppleScript Free Mac Batch Runner */}
            {activeTab === 'applescript' && (
              <div className="space-y-3 p-4 rounded-2xl bg-zinc-950 text-zinc-200 border border-zinc-800 font-mono text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2 text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">AppleScript iMessage Dispatcher</span>
                  </div>
                  <div className="flex items-center gap-2 font-sans">
                    <button
                      onClick={handleCopyScript}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScript ? 'Copied Script!' : 'Copy Script'}</span>
                    </button>
                    <button
                      onClick={handleDownloadScript}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .applescript</span>
                    </button>
                  </div>
                </div>

                {/* Direct Mac Video File Attachment Options */}
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 font-sans space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-200">
                    <input
                      type="checkbox"
                      checked={attachLocalVideo}
                      onChange={(e) => setAttachLocalVideo(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-rose-500 focus:ring-rose-500"
                    />
                    <Video className="w-3.5 h-3.5 text-rose-400" />
                    <span>Attach Video File (.mp4 / .mov) directly from Mac</span>
                  </label>

                  {attachLocalVideo && (
                    <div className="space-y-1 pl-5">
                      <label className="text-[10px] font-semibold text-zinc-400 block">
                        Mac POSIX File Path to video:
                      </label>
                      <input
                        type="text"
                        value={macVideoPath}
                        onChange={(e) => setMacVideoPath(e.target.value)}
                        placeholder="/Users/yourusername/Desktop/my_pitch_video.mp4"
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-emerald-300 text-xs font-mono focus:outline-none focus:border-rose-500"
                      />
                      <p className="text-[10px] text-zinc-500">
                        AppleScript will send this video file as a native attachment to each contact before sending the text.
                      </p>
                    </div>
                  )}
                </div>

                <div className="max-h-52 overflow-y-auto p-3 bg-zinc-900 rounded-xl border border-zinc-800/80 text-[11px] leading-relaxed text-emerald-300">
                  <pre className="whitespace-pre-wrap">{appleScriptCode}</pre>
                </div>

                <p className="text-[11px] text-zinc-400 font-sans">
                  💡 <strong>How to run on Mac:</strong> Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">Cmd + Space</kbd>, type <em>Script Editor</em>, paste this script, and click ▶️ Run. Your Mac will safely send all {recipientLeads.length} messages for free!
                </p>
              </div>
            )}

            {/* Tab 3: Export CSV */}
            {activeTab === 'export' && (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Export Customized Messages
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Export all {recipientLeads.length} personalized messages with names and phone numbers to your clipboard as CSV.
                  </p>
                </div>
                <button
                  onClick={handleCopyCsv}
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                >
                  {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCsv ? 'Copied CSV Data!' : 'Copy Formatted CSV'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Zero carrier charges • Works natively with macOS & iOS</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-semibold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
