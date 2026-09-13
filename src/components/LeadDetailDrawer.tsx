import React, { useState } from 'react';
import {
  X,
  Instagram,
  Globe,
  Calendar,
  Share2,
  Trash2,
  Upload,
  Plus,
  MessageSquare,
  Save,
  Tag,
  FileText,
  Clock,
  ImageIcon,
  Video,
  Loader2,
  Download,
  FolderOpen,
  Layers,
  Users,
  Sparkles,
  Copy,
  Check,
  PhoneCall,
  Phone,
  CheckCircle2,
  Mail,
  Eye,
  Flame,
  ShieldAlert,
  BrainCircuit,
} from 'lucide-react';
import { Lead, LeadStatus, CustomFieldDefinition, Interaction } from '../types';
import { uploadFileToStorage } from '../lib/firebase';
import { compressImage, compressAndGetInstantDataUrl } from '../utils/imageCompressor';
import { AccountOption } from './AddLeadModal';
import { ProductDemoModal } from './ProductDemoModal';
import { LeadVirtualTryOn } from './LeadVirtualTryOn';
import { CallDialerRecorder } from './CallDialerRecorder';
import {
  extractLeadPhone,
  formatPhoneDisplay,
  getFaceTimeAudioUrl,
  getIMessageUrl,
  triggerFaceTimeAudioCall
} from '../utils/phoneUtils';
import { SocialLogosRow, PriorityBadge, OutreachScriptsBox } from './SocialAndPriorityBadges';

interface LeadDetailDrawerProps {
  lead: Lead;
  customFieldsDefs: CustomFieldDefinition[];
  availableAccounts?: AccountOption[];
  isSuperAdmin?: boolean;
  onClose: () => void;
  onSaveLead: (updatedLead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onShareLead: (lead: Lead) => void;
  onOpenScreenshotLightbox: (lead: Lead, imageIndex?: number) => void;
  onOpenLiveCoPilot?: (lead: Lead) => void;
  onOpenVideoPitch?: (lead: Lead) => void;
  onOpenCallSimulator?: (lead: Lead) => void;
  isDarkMode: boolean;
  existingBatches?: { id: string; name: string; count: number }[];
  onRenameBatch?: (oldBatchIdOrName: string, newName: string) => void;
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({
  lead,
  customFieldsDefs,
  availableAccounts,
  isSuperAdmin,
  onClose,
  onSaveLead,
  onDeleteLead,
  onShareLead,
  onOpenScreenshotLightbox,
  onOpenLiveCoPilot,
  onOpenVideoPitch,
  onOpenCallSimulator,
  isDarkMode,
  existingBatches = [],
  onRenameBatch,
}) => {
  const [name, setName] = useState(lead.name);
  const [handle, setHandle] = useState(lead.instagramHandle || '');
  const [email, setEmail] = useState(lead.email || '');
  const [phone, setPhone] = useState(lead.phone || extractLeadPhone(lead) || '');
  const [isNormalLead, setIsNormalLead] = useState(lead.isNormalLead || false);
  const [isAppleVerified, setIsAppleVerified] = useState(lead.isAppleVerified || false);
  const [website, setWebsite] = useState(lead.website || '');
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [assignedEmail, setAssignedEmail] = useState<string>(
    lead.ownerEmail || 'tonykone21@gmail.com'
  );
  const [tagsInput, setTagsInput] = useState(lead.tags?.join(', ') || '');
  const [batchName, setBatchName] = useState(lead.uploadBatchName || '');
  const [applyBatchToAll, setApplyBatchToAll] = useState(false);
  const [notes, setNotes] = useState(lead.notes || '');
  const [productImage, setProductImage] = useState(lead.productImage || '');
  const [screenshots, setScreenshots] = useState<string[]>(lead.screenshots || []);
  const [demoVideoUrl, setDemoVideoUrl] = useState(lead.demoVideoUrl || '');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);

  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftCopied, setDraftCopied] = useState(false);

  const handleGenerateDraft = async () => {
    if (screenshots.length === 0) {
      alert("Please upload a screenshot first so the AI can analyze their products!");
      return;
    }
    
    setIsGeneratingDraft(true);
    try {
      const res = await fetch('/api/generate-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ imageBase64: screenshots[0] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDraftMessage(data.message);
      setDraftCopied(false);
    } catch(err: any) {
      console.error(err);
      alert(err.message || 'Failed to generate message');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(draftMessage);
    setDraftCopied(true);
    setTimeout(() => setDraftCopied(false), 2000);
  };

  const [isUploadingScreenshots, setIsUploadingScreenshots] = useState(false);

  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB limit per video
  const [customFields, setCustomFields] = useState<Record<string, string>>(
    lead.customFields || {}
  );
  const [interactions, setInteractions] = useState<Interaction[]>(lead.interactions || []);

  const [newLogNote, setNewLogNote] = useState('');
  const [newLogType, setNewLogType] = useState<Interaction['type']>('Note');

  // Editing state for existing logs
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogNote, setEditingLogNote] = useState('');
  const [editingLogType, setEditingLogType] = useState<Interaction['type']>('Note');
  const [editingLogDate, setEditingLogDate] = useState('');

  const cleanHandle = (handle || '').replace(/^@/, '');
  const igUrl = cleanHandle ? `https://instagram.com/${cleanHandle}` : '';
  const dmUrl = cleanHandle ? `https://ig.me/m/${cleanHandle}` : '';

  const handleSave = () => {
    const updatedTags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const targetAcc = availableAccounts?.find(
      (a) => a.email.toLowerCase() === assignedEmail.toLowerCase()
    );

    const finalOwner = targetAcc?.email || assignedEmail;
    const existingAssigned = lead.assignedAccountEmails || [];
    const mergedAssigned = Array.from(
      new Set([finalOwner.toLowerCase(), ...existingAssigned.map((a) => a.toLowerCase())])
    );

    const trimmedBatch = batchName.trim();
    
    // Check if user requested to rename the entire batch across all leads
    if (applyBatchToAll && lead.uploadBatchName && trimmedBatch && trimmedBatch !== lead.uploadBatchName && onRenameBatch) {
      onRenameBatch(lead.uploadBatchId || lead.uploadBatchName, trimmedBatch);
    }

    const matchedExistingBatch = existingBatches.find(b => b.name === trimmedBatch);
    const batchId = matchedExistingBatch
      ? matchedExistingBatch.id
      : trimmedBatch
      ? lead.uploadBatchName === trimmedBatch && lead.uploadBatchId
        ? lead.uploadBatchId
        : `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      : undefined;

    const updatedLead: Lead = {
      ...lead,
      name: name.trim(),
      instagramHandle: cleanHandle || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      isNormalLead,
      isAppleVerified,
      website: website.trim(),
      status,
      uploadBatchName: trimmedBatch || undefined,
      uploadBatchId: batchId,
      uploadBatchDate: trimmedBatch ? (lead.uploadBatchDate || new Date().toISOString()) : undefined,
      tags: updatedTags,
      notes: notes.trim(),
      productImage: productImage.trim(),
      screenshots,
      demoVideoUrl,
      customFields,
      interactions,
      lastInteractionDate: interactions[0]?.date || lead.lastInteractionDate,
      updatedAt: new Date().toISOString(),
      ownerEmail: finalOwner,
      ownerId: targetAcc?.uid || lead.ownerId || '',
      assignedAccountEmails: mergedAssigned,
    };

    onSaveLead(updatedLead);
    onClose();
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogNote.trim()) return;

    const newInteraction: Interaction = {
      id: `int_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: newLogType,
      notes: newLogNote.trim(),
    };

    setInteractions([newInteraction, ...interactions]);
    setNewLogNote('');
  };

  const startEditLog = (item: Interaction) => {
    setEditingLogId(item.id);
    setEditingLogNote(item.notes);
    setEditingLogType(item.type);
    setEditingLogDate(item.date);
  };

  const handleSaveEditedLog = (logId: string) => {
    setInteractions(
      interactions.map((item) =>
        item.id === logId
          ? { ...item, notes: editingLogNote.trim(), type: editingLogType, date: editingLogDate }
          : item
      )
    );
    setEditingLogId(null);
  };

  const handleDeleteLog = (logId: string) => {
    setInteractions(interactions.filter((item) => item.id !== logId));
  };

  const [dragActive, setDragActive] = useState(false);

  const processFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setIsUploadingScreenshots(true);
    try {
      // 1. Instantly compress & generate Data URLs locally (< 50ms)
      const processedList = await Promise.all(
        imageFiles.map((file) => compressAndGetInstantDataUrl(file))
      );

      // 2. Immediately render screenshot previews in UI
      const instantUrls = processedList.map((item) => item.dataUrl).filter(Boolean);
      if (instantUrls.length > 0) {
        setScreenshots((prev) => [...prev, ...instantUrls]);
      }

      // Hide loading spinner immediately so user doesn't wait
      setIsUploadingScreenshots(false);

      // 3. Asynchronously upload to Firebase Storage in background
      processedList.forEach(async ({ file, dataUrl }) => {
        if (!dataUrl) return;
        try {
          const sanitizeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `screenshots/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${sanitizeName}`;
          const remoteUrl = await uploadFileToStorage(file, path);
          if (remoteUrl) {
            setScreenshots((prev) =>
              prev.map((url) => (url === dataUrl ? remoteUrl : url))
            );
          }
        } catch (err) {
          console.warn('Background screenshot upload failed, retaining Data URL:', err);
        }
      });
    } catch (err) {
      console.error('Error processing screenshots:', err);
      setIsUploadingScreenshots(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDeleteScreenshot = (indexToRemove: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setScreenshots((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-zinc-950/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-xl h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-lg shrink-0">
              {cleanHandle ? (
                <Instagram className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
              ) : (
                <Users className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-base text-zinc-900 dark:text-white leading-snug">
                  {name || 'Lead Details'}
                </h2>
                <PriorityBadge lead={lead} />
                {isNormalLead && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Normal Lead
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {cleanHandle ? (
                  <a
                    href={igUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-rose-500 font-medium hover:underline flex items-center gap-1"
                  >
                    @{cleanHandle}
                  </a>
                ) : email ? (
                  <a
                    href={`mailto:${email}`}
                    className="text-xs text-blue-500 font-medium hover:underline flex items-center gap-1 font-mono"
                  >
                    <Mail className="w-3 h-3 text-blue-500" />
                    <span>{email}</span>
                  </a>
                ) : null}
                {lead.uploadBatchName && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold inline-flex items-center gap-1">
                    <FolderOpen className="w-3 h-3" />
                    <span>{lead.uploadBatchName}</span>
                  </span>
                )}
                {/* Social Media Logos Quick Bar */}
                <SocialLogosRow lead={lead} compact />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {email && (
              <a
                href={`mailto:${email}`}
                className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-semibold text-xs transition-colors flex items-center gap-1.5"
                title={`Send Email to ${email}`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Email</span>
              </a>
            )}

            {phone && (
              <>
                <a
                  href={getFaceTimeAudioUrl(phone)}
                  target="_top"
                  onClick={(e) => {
                    e.preventDefault();
                    triggerFaceTimeAudioCall(phone);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={`FaceTime Audio Call (${formatPhoneDisplay(phone)}) - Free over Wi-Fi`}
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">FaceTime</span>
                </a>

                <a
                  href={getIMessageUrl(phone)}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-[#007AFF] font-semibold text-xs transition-colors flex items-center gap-1.5"
                  title={`Send iMessage / SMS (${formatPhoneDisplay(phone)})`}
                >
                  <Phone className="w-3.5 h-3.5 text-[#007AFF]" />
                  <span className="hidden sm:inline">iMessage</span>
                </a>
              </>
            )}

            {cleanHandle ? (
              <a
                href={dmUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-semibold text-xs transition-colors flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                <span>IG DM</span>
              </a>
            ) : null}

            <button
              onClick={() => onShareLead(lead)}
              className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
              title="Share Lead"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-medium">
          {/* Normal Lead Checkbox */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isNormalLead}
                onChange={(e) => setIsNormalLead(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-zinc-700 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  Normal Business Lead (Not Instagram Lead)
                </span>
                <span className="text-[11px] text-zinc-500 block">
                  Designates lead as email & phone driven; Instagram handle is optional.
                </span>
              </div>
            </label>
            {isNormalLead && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                Normal Lead
              </span>
            )}
          </div>

          {/* Main Info Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-500 font-semibold text-[11px] uppercase mb-1">
                Company / Lead Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div>
              <label className="block text-zinc-500 font-semibold text-[11px] uppercase mb-1">
                {isNormalLead ? 'Instagram Handle (Optional)' : 'Instagram Handle'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-400 font-bold">@</span>
                <input
                  type="text"
                  value={handle}
                  placeholder={isNormalLead ? 'optional_handle' : 'handle'}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-500 font-semibold text-[11px] uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="contact@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div>
              <label className="block text-zinc-500 font-semibold text-[11px] uppercase mb-1">
                Status Stage
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-semibold cursor-pointer focus:outline-none"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Follow Up">Follow Up</option>
                <option value="Responded">Responded</option>
                <option value="Interested">Interested</option>
                <option value="Proposal Sent">Proposal</option>
                <option value="Closed Won">Closed Won</option>
                <option value="Closed Lost">Closed Lost</option>
              </select>
            </div>

            <div className="col-span-1 sm:col-span-2">
              <label className="block text-zinc-500 font-semibold text-[11px] uppercase mb-1">
                Website
              </label>
              <input
                type="text"
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {/* Direct Phone & Apple Verification */}
            <div className="col-span-1 sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-zinc-500 font-semibold text-[11px] uppercase">
                  Phone Number (FaceTime / iMessage)
                </label>
                <button
                  type="button"
                  onClick={() => setIsAppleVerified(!isAppleVerified)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                    isAppleVerified
                      ? 'bg-blue-500/10 text-[#007AFF] border-blue-500/30 dark:bg-blue-950/50 dark:border-blue-700'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:text-zinc-800'
                  }`}
                  title="Click to toggle Apple Blue Tick verification"
                >
                  <CheckCircle2 className={`w-3 h-3 ${isAppleVerified ? 'fill-[#007AFF] text-white' : 'text-zinc-400'}`} />
                  <span>{isAppleVerified ? '🍎 Apple FaceTime Verified' : 'Mark Apple Verified'}</span>
                </button>
              </div>
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono font-medium focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {/* Assigned Account / Owner Selection */}
            {isSuperAdmin && (
              <div className="col-span-1 sm:col-span-2 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800">
                <label className="block text-zinc-700 dark:text-zinc-300 font-bold text-xs mb-1.5 flex items-center justify-between">
                  <span>Assigned Account / Owner</span>
                  <span className="text-[10px] text-rose-500 font-bold">Super Admin</span>
                </label>
                <select
                  value={assignedEmail}
                  onChange={(e) => setAssignedEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-xs"
                >
                  {availableAccounts && availableAccounts.length > 0 ? (
                    availableAccounts.map((acc) => (
                      <option key={acc.email} value={acc.email}>
                        {acc.displayName || acc.email.split('@')[0]} ({acc.email})
                      </option>
                    ))
                  ) : (
                    <option value={lead.ownerEmail || 'tonykone21@gmail.com'}>
                      {lead.ownerEmail || 'tonykone21@gmail.com'}
                    </option>
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-zinc-500 font-semibold text-[11px] uppercase mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              <span>Tags (comma separated)</span>
            </label>
            <input
              type="text"
              placeholder="E-commerce, Luxury, Warm"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-medium focus:outline-none"
            />
          </div>

          {/* Upload Batch */}
          <div className="space-y-2">
            <label className="block text-zinc-500 font-semibold text-[11px] uppercase flex items-center justify-between">
              <span className="flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5 text-rose-500" />
                <span>Upload Batch</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-normal lowercase">organize into batch tab</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Summer Campaign, Batch 1"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-medium focus:outline-none text-xs"
            />

            {/* Quick Pick Existing Batches */}
            {existingBatches.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-zinc-400 font-medium">Existing:</span>
                {existingBatches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBatchName(b.name)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                      batchName === b.name
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-rose-400'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            )}

            {/* Rename All in Batch Checkbox */}
            {lead.uploadBatchName && batchName.trim() !== lead.uploadBatchName && (
              <label className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-800 dark:text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyBatchToAll}
                  onChange={(e) => setApplyBatchToAll(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Rename batch title for ALL leads in "{lead.uploadBatchName}"</span>
              </label>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-zinc-500 font-semibold text-[11px] uppercase mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Notes & Context</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add key notes about conversation or requirements..."
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-medium focus:outline-none"
            />
          </div>

          
          {/* AI Outreach Generator */}
          <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 uppercase">
                <Sparkles className="w-4 h-4" />
                AI Outreach Message
              </label>
              <button
                onClick={handleGenerateDraft}
                disabled={isGeneratingDraft || screenshots.length === 0}
                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                {isGeneratingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {draftMessage ? 'Regenerate Draft' : 'Draft Message'}
              </button>
            </div>
            
            {screenshots.length === 0 && !draftMessage && (
              <p className="text-xs text-rose-500/70 dark:text-rose-400/70 font-medium">
                Upload a screenshot below to let the AI write a personalized message based on their brand.
              </p>
            )}

            {draftMessage && (
              <div className="mt-2 space-y-2">
                <div className="relative">
                  <textarea
                    value={draftMessage}
                    onChange={(e) => setDraftMessage(e.target.value)}
                    rows={4}
                    className="w-full p-3 rounded-xl bg-white dark:bg-zinc-950/80 border border-rose-200 dark:border-rose-900/50 text-zinc-900 dark:text-white text-sm font-medium focus:outline-none focus:border-rose-400 dark:focus:border-rose-600 resize-none"
                  />
                  <button
                    onClick={handleCopyDraft}
                    className="absolute bottom-3 right-3 p-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md text-zinc-600 dark:text-zinc-300 transition-colors"
                    title="Copy to clipboard"
                  >
                    {draftCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <a
                    href={igUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={handleCopyDraft}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    <Instagram className="w-4 h-4" />
                    Copy & Open Instagram
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Outreach Scripts & Cold Calling Copy Box */}
          <OutreachScriptsBox lead={lead} />

          {/* Custom Fields / Real Estate Metrics Section */}
          {(() => {
            const hiddenKeys = [
              'cold call outreach', 'instagram dm outreach', 'email outreach',
              'cold call', 'instagram dm', 'email script', 'coldcallscript', 'igdmscript', 'emailtemplate',
              'facebook', 'linkedin', 'zillow profile', 'zillow', 'other socials', 'other social', 'instagram', 'instagram handle',
              'priority', 'priority score', 'priority tier', 'score', 'lead score', 'facebook profile', 'linkedin profile'
            ];

            // Gather all custom field keys from both definitions and lead's customFields
            const allKeysSet = new Set<string>();
            if (customFieldsDefs && customFieldsDefs.length > 0) {
              customFieldsDefs.forEach(d => allKeysSet.add(d.name));
            }
            if (customFields) {
              Object.keys(customFields).forEach(k => allKeysSet.add(k));
            }

            const visibleKeys = Array.from(allKeysSet).filter(
              (key) => !hiddenKeys.includes(key.toLowerCase().trim())
            );

            if (visibleKeys.length === 0) return null;

            return (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
                <h4 className="font-semibold text-xs text-zinc-900 dark:text-white uppercase tracking-wider">
                  Lead & Custom Attributes
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {visibleKeys.map((key) => (
                    <div key={key}>
                      <label className="block text-zinc-500 text-[11px] font-semibold mb-1 truncate" title={key}>
                        {key}
                      </label>
                      <input
                        type="text"
                        value={customFields[key] || ''}
                        onChange={(e) =>
                          setCustomFields({
                            ...customFields,
                            [key]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none font-medium"
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Screenshot / Proof Gallery */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`p-4 rounded-2xl border space-y-3 transition-all ${
              dragActive
                ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20'
                : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-rose-500" />
                <span>Proof & Screenshots ({screenshots.length})</span>
              </h4>
              <label className="px-3 py-1 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {screenshots.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {screenshots.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => onOpenScreenshotLightbox(lead, idx)}
                    className="aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative group cursor-pointer bg-zinc-100 dark:bg-zinc-900"
                  >
                    <img
                      src={url}
                      alt={`Proof ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <button
                      type="button"
                      onClick={(e) => handleDeleteScreenshot(idx, e)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-zinc-950/80 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete screenshot"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                <p className="text-zinc-400 text-xs italic">
                  No proof screenshots uploaded yet.
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Drag & drop images here or click Upload above.
                </p>
              </div>
            )}
          </div>

          {/* Demo Video Section */}
          <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-xs text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Video className="w-4 h-4 text-emerald-500" />
                <span>Demo Video (Max 100MB)</span>
              </h4>
              <label className="px-3 py-1 rounded-xl bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs cursor-pointer transition-colors flex items-center gap-1">
                {isUploadingVideo ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{demoVideoUrl ? 'Replace' : 'Upload'} Video</span>
                <input
                  type="file"
                  accept="video/*"
                  disabled={isUploadingVideo}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > MAX_VIDEO_SIZE) {
                      alert(`Video file size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum allowed limit of 100MB.`);
                      e.target.value = '';
                      return;
                    }
                    setIsUploadingVideo(true);
                    setVideoUploadProgress(0);
                    try {
                      const path = `videos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                      const url = await uploadFileToStorage(file, path, (progress) => {
                        setVideoUploadProgress(progress);
                      });
                      setDemoVideoUrl(url);
                    } catch (err) {
                      console.error('Error uploading demo video', err);
                      alert('Failed to upload video to Cloud Storage. Please try again.');
                    } finally {
                      setIsUploadingVideo(false);
                      setVideoUploadProgress(null);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            {videoUploadProgress !== null && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-emerald-500">
                  <span>Uploading video...</span>
                  <span>{videoUploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-200"
                    style={{ width: `${videoUploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            
            {demoVideoUrl ? (
              <div className="space-y-2">
                <div className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 relative">
                  <video src={demoVideoUrl} controls className="w-full h-auto max-h-[300px] object-contain" />
                  <button
                    type="button"
                    onClick={() => setDemoVideoUrl('')}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-950/80 hover:bg-black text-rose-400 opacity-90 hover:opacity-100 transition-opacity"
                    title="Remove video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <a
                  href={`/api/download?url=${encodeURIComponent(demoVideoUrl)}&filename=${encodeURIComponent((lead?.company || 'lead') + '_demo_video.mp4')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={`${lead?.company || 'lead'}_demo_video.mp4`}
                  className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download Demo Video (.mp4)
                </a>
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                <p className="text-zinc-400 text-xs italic">
                  No demo video uploaded.
                </p>
              </div>
            )}
          </div>

          
          {/* Virtual Try-On Module */}
          <LeadVirtualTryOn 
            lead={lead} 
            onUpdateLead={(updates) => onSaveLead({ ...lead, ...updates })} 
            isDarkMode={false}
          />

          {/* Interaction Log History */}
          
          
          {/* E-Commerce Demo Launcher */}
          {isSuperAdmin && (
            <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-xl p-4 text-white shadow-xl flex items-center justify-between border border-stone-700">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Demo
                </h3>
                <p className="text-[10px] text-stone-400 mt-1 max-w-[200px] leading-snug">
                  Launch a full-screen, screen-recordable mock product page using this lead's garment.
                </p>
              </div>
              <button
                onClick={() => setShowDemoModal(true)}
                className="px-4 py-2 bg-white text-stone-900 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-stone-100 transition-colors shadow-md active:scale-95"
              >
                Launch Demo
              </button>
            </div>
          )}

          {/* AI Sales Suite: Live Teleprompter, Video Pitch Tracker, Call Simulator */}
          <div className="p-4 rounded-2xl bg-slate-900 dark:bg-zinc-900 text-white shadow-xl space-y-3 border-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
                  <BrainCircuit className="w-5 h-5 text-cyan-200 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-white tracking-wider uppercase flex items-center gap-1.5">
                    <span>AI Sales Intelligence Suite</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold">PRO</span>
                  </h4>
                  <p className="text-[10px] text-zinc-400">
                    Next-gen outreach intelligence tailored for {lead.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Video Pitch Tracking Live Badge (if active) */}
            {lead.videoPitchTracking && lead.videoPitchTracking.viewCount > 0 && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <div>
                    <span className="font-bold text-xs text-emerald-300 block">
                      👀 Video Viewed ({lead.videoPitchTracking.viewCount}x • {lead.videoPitchTracking.highestPercentWatched || 100}% Watched)
                    </span>
                    <span className="text-[10px] text-emerald-400/80 block">
                      Sent via {lead.videoPitchTracking.sentVia || 'iMessage'} • Last watched {lead.videoPitchTracking.lastViewedAt ? new Date(lead.videoPitchTracking.lastViewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onOpenVideoPitch?.(lead)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500 text-zinc-950 font-bold text-[11px] hover:bg-emerald-400 transition-colors cursor-pointer"
                >
                  View Telemetry
                </button>
              </div>
            )}

            {/* 3 Quick Action Buttons - Frameless clean dark cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => onOpenLiveCoPilot?.(lead)}
                className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 transition-all text-left group cursor-pointer border-0 shadow-sm"
              >
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs mb-1">
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call Co-Pilot</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-snug">
                  Live teleprompter & objection battlecards during FaceTime/WhatsApp.
                </p>
              </button>

              <button
                onClick={() => onOpenVideoPitch?.(lead)}
                className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 transition-all text-left group cursor-pointer border-0 shadow-sm"
              >
                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs mb-1">
                  <Video className="w-3.5 h-3.5" />
                  <span>Video Pitch</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-snug">
                  Send preview via iMessage with real-time watch pixel.
                </p>
              </button>

              <button
                onClick={() => onOpenCallSimulator?.(lead)}
                className="p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 transition-all text-left group cursor-pointer border-0 shadow-sm"
              >
                <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Call Simulator</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-snug">
                  Practice roleplay pitch against this lead with AI scorecard.
                </p>
              </button>
            </div>
          </div>

          {/* Call Dialer & FaceTime Audio Recorder */}
          <CallDialerRecorder
            lead={lead}
            onUpdateLead={(updated) => onSaveLead(updated)}
            isDarkMode={isDarkMode}
          />

          <div className="space-y-3">
            <h4 className="font-semibold text-xs text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-purple-500" />
              <span>Activity History</span>
            </h4>

            {/* Quick Log Form */}
            <form onSubmit={handleAddLog} className="flex gap-2">
              <select
                value={newLogType}
                onChange={(e) => setNewLogType(e.target.value as Interaction['type'])}
                className="px-2.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs font-semibold cursor-pointer focus:outline-none shrink-0"
              >
                <option value="Note">Note</option>
                <option value="DM Sent">DM Sent</option>
                <option value="Reply Received">Reply</option>
                <option value="Follow Up">Follow Up</option>
                <option value="Call">Call</option>
                <option value="Proposal">Proposal</option>
                <option value="Meeting">Meeting</option>
                <option value="Closed">Closed</option>
              </select>
              <input
                type="text"
                placeholder="Log quick activity update..."
                value={newLogNote}
                onChange={(e) => setNewLogNote(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold text-xs transition-opacity hover:opacity-90 shrink-0 cursor-pointer"
              >
                Log
              </button>
            </form>

            {/* Log items */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {interactions?.length === 0 ? (
                <p className="text-xs text-zinc-400 italic text-center py-2">
                  No activity logged yet.
                </p>
              ) : (
                interactions.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 space-y-1.5 group"
                  >
                    {editingLogId === item.id ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={editingLogType}
                            onChange={(e) => setEditingLogType(e.target.value as Interaction['type'])}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold"
                          >
                            <option value="Note">Note</option>
                            <option value="DM Sent">DM Sent</option>
                            <option value="Reply Received">Reply</option>
                            <option value="Follow Up">Follow Up</option>
                            <option value="Call">Call</option>
                            <option value="Proposal">Proposal</option>
                            <option value="Meeting">Meeting</option>
                            <option value="Closed">Closed</option>
                          </select>
                          <input
                            type="date"
                            value={editingLogDate}
                            onChange={(e) => setEditingLogDate(e.target.value)}
                            className="px-2 py-1 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                          />
                        </div>
                        <input
                          type="text"
                          value={editingLogNote}
                          onChange={(e) => setEditingLogNote(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs"
                        />
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingLogId(null)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-[11px] font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEditedLog(item.id)}
                            className="px-3 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-semibold"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500">
                          <span className="text-rose-500 font-semibold">{item.type}</span>
                          <div className="flex items-center gap-2">
                            <span>{item.date}</span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEditLog(item)}
                                className="p-0.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                                title="Edit Log"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLog(item.id)}
                                className="p-0.5 text-zinc-400 hover:text-rose-500"
                                title="Delete Log"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                          {item.notes}
                        </p>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="px-6 py-4 pb-8 sm:pb-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => {
              if (confirm(`Delete lead "${lead.name}"?`)) {
                onDeleteLead(lead.id);
                onClose();
              }
            }}
            className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Delete Lead"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      
      {showDemoModal && (
        <ProductDemoModal 
          lead={lead} 
          onClose={() => setShowDemoModal(false)} 
        />
      )}
</div>
    </div>
  );
};
