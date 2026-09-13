import React, { useState } from 'react';
import { X, Instagram, Tag, FileText, Upload, Image as ImageIcon, Trash2, User as UserIcon, Sparkles, Phone, CheckCircle2, FolderOpen } from 'lucide-react';
import { Lead, LeadStatus, CustomFieldDefinition } from '../types';
import { uploadFileToStorage } from '../lib/firebase';
import { compressImage, compressAndGetInstantDataUrl } from '../utils/imageCompressor';
import { Loader2, Video } from 'lucide-react';

export interface AccountOption {
  email: string;
  uid: string;
  displayName?: string;
}

interface AddLeadModalProps {
  customFieldsDefs: CustomFieldDefinition[];
  availableAccounts?: AccountOption[];
  existingBatches?: string[];
  currentUserEmail?: string | null;
  currentUserUid?: string;
  isSuperAdmin?: boolean;
  onClose: () => void;
  onAddLead: (newLead: Lead) => void;
  isDarkMode: boolean;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({
  customFieldsDefs,
  availableAccounts,
  existingBatches,
  currentUserEmail,
  currentUserUid,
  isSuperAdmin,
  onClose,
  onAddLead,
}) => {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isNormalLead, setIsNormalLead] = useState(false);
  const [isAppleVerified, setIsAppleVerified] = useState(false);
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<LeadStatus>('New');
  const [batchName, setBatchName] = useState('');
  const [assignedEmail, setAssignedEmail] = useState<string>(
    currentUserEmail || 'tonykone21@gmail.com'
  );
  const [tagsInput, setTagsInput] = useState('Instagram, Warm');
  const [notes, setNotes] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, string>>({
    'Follower Count': '50K',
    Niche: 'E-commerce',
  });
  const [demoVideoFile, setDemoVideoFile] = useState<File | null>(null);
  const [demoVideoUrl, setDemoVideoUrl] = useState('');
  const [videoUploadPromise, setVideoUploadPromise] = useState<Promise<string> | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploadingScreenshots, setIsUploadingScreenshots] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  
  const handleAIExtraction = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      // 1. Instantly compress the image client-side to make the AI scan lightning fast
      const processed = await compressAndGetInstantDataUrl(file);
      
      const res = await fetch('/api/extract-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ imageBase64: processed.dataUrl }),
      });
      
      if (!res.ok) throw new Error('Extraction failed');
      const data = await res.json();
      
      if (data.name) setName(data.name);
      if (data.handle) setHandle(data.handle);
      if (data.website) setWebsite(data.website);
      if (data.bio) setNotes((prev) => prev ? `${prev}\n\nBio: ${data.bio}` : `Bio: ${data.bio}`);
      
      // Auto-add it to screenshots as proof!
      if (processed.dataUrl) {
         setScreenshots((prev) => [...prev, processed.dataUrl]);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to extract data. Please fill manually.');
    } finally {
      setIsExtracting(false);
      e.target.value = '';
    }
  };

  const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB limit per video

  const handleVideoSelect = (file: File) => {
    if (file.size > MAX_VIDEO_SIZE) {
      alert(`Selected video file (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum 100MB limit.`);
      return;
    }
    setDemoVideoFile(file);
    setVideoUploadError(false);
    setIsUploadingVideo(true);
    setUploadProgress(0);

    const path = `videos/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const promise = uploadFileToStorage(file, path, (percent) => {
      setUploadProgress(percent);
    })
      .then((remoteUrl) => {
        setDemoVideoUrl(remoteUrl);
        setUploadProgress(null);
        setIsUploadingVideo(false);
        setVideoUploadError(false);
        return remoteUrl;
      })
      .catch((err) => {
        console.error('Background video upload error:', err);
        setUploadProgress(null);
        setIsUploadingVideo(false);
        setVideoUploadError(true);
        setDemoVideoUrl('');
        throw err;
      });

    setVideoUploadPromise(promise);
  };

  const handleClearVideo = () => {
    setDemoVideoFile(null);
    setDemoVideoUrl('');
    setVideoUploadPromise(null);
    setIsUploadingVideo(false);
    setVideoUploadError(false);
    setUploadProgress(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!isNormalLead && !handle.trim()) return;

    setIsSubmitting(true);
    let finalVideoUrl = demoVideoUrl;

    if (videoUploadPromise) {
      try {
        finalVideoUrl = await videoUploadPromise;
      } catch (err) {
        console.error('Error awaiting video upload:', err);
      }
    }

    // If we have a video file but the url is empty or still a blob, attempt direct upload now
    if (demoVideoFile && (!finalVideoUrl || finalVideoUrl.startsWith('blob:'))) {
      try {
        setIsUploadingVideo(true);
        setUploadProgress(0);
        const path = `videos/${Date.now()}_${demoVideoFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        finalVideoUrl = await uploadFileToStorage(demoVideoFile, path, (percent) => {
          setUploadProgress(percent);
        });
        setDemoVideoUrl(finalVideoUrl);
        setIsUploadingVideo(false);
        setUploadProgress(null);
      } catch (err) {
        console.error('Final attempt video upload error:', err);
        setIsUploadingVideo(false);
        setUploadProgress(null);
        setIsSubmitting(false);
        alert('Failed to upload video to Cloud Storage. Please check connection and try again.');
        return;
      }
    }

    // Safety guard: Never store local blob: URLs into Firestore
    if (finalVideoUrl && finalVideoUrl.startsWith('blob:')) {
      finalVideoUrl = '';
    }

    const cleanHandle = handle.trim().replace(/^@/, '');
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const today = new Date().toISOString().split('T')[0];

    const initialInteraction = {
      id: `int_${Date.now()}`,
      date: today,
      type: 'Note' as const,
      notes: notes.trim() || 'Lead created.',
    };

    const targetAcc = availableAccounts?.find(
      (a) => a.email.toLowerCase() === assignedEmail.toLowerCase()
    );

    const trimmedBatch = batchName.trim();
    const batchId = trimmedBatch
      ? `batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      : undefined;

    const newLead: Lead = {
      id: `lead_${Date.now()}`,
      name: name.trim(),
      instagramHandle: cleanHandle || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      isNormalLead,
      isAppleVerified,
      website: website.trim(),
      status,
      tags,
      uploadBatchName: trimmedBatch || undefined,
      uploadBatchId: batchId,
      uploadBatchDate: trimmedBatch ? new Date().toISOString() : undefined,
      productImage: screenshots[0] || '',
      screenshots,
      demoVideoUrl: finalVideoUrl,
      notes: notes.trim(),
      customFields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastInteractionDate: today,
      interactions: [initialInteraction],
      ownerEmail: targetAcc?.email || assignedEmail,
      ownerId: targetAcc?.uid || currentUserUid || '',
    };

    onAddLead(newLead);
    setIsSubmitting(false);
    setUploadProgress(null);
    onClose();
  };

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

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs font-sans animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden p-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold shrink-0">
              <Instagram className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">Add New IG Lead</h3>
              <p className="text-xs text-zinc-500">Track and manage Instagram prospect</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        
        {/* AI Scan Button */}
        <div className="mb-4">
          <label className="relative flex items-center justify-center p-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/20 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors group">
            {isExtracting ? (
               <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                 <Loader2 className="w-4 h-4 animate-spin" />
                 <span className="text-xs font-semibold">Analyzing Image...</span>
               </div>
            ) : (
               <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                 <Sparkles className="w-4 h-4 text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors" />
                 <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Auto-Fill from Screenshot</span>
               </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAIExtraction} 
              disabled={isExtracting} 
            />
          </label>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
          {/* Normal Lead vs Instagram Lead Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isNormalLead}
                onChange={(e) => setIsNormalLead(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 dark:border-zinc-700 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                  Add as Normal Lead (Not Instagram Lead)
                </span>
                <span className="text-[11px] text-zinc-500 block">
                  Enables email & phone primary outreach, making Instagram handle optional.
                </span>
              </div>
            </label>
            {isNormalLead && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                Normal Lead Mode
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-500 font-semibold mb-1">
                Company / Lead Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Luxe Aesthetics"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div>
              <label className="block text-zinc-500 font-semibold mb-1">
                {isNormalLead ? 'Instagram Handle (Optional)' : 'Instagram Handle *'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-zinc-400">@</span>
                <input
                  type="text"
                  required={!isNormalLead}
                  placeholder={isNormalLead ? 'optional_handle' : 'luxe_aesthetics'}
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-500 font-semibold mb-1">
                Email Address {isNormalLead ? '(Recommended)' : ''}
              </label>
              <input
                type="email"
                placeholder="contact@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div>
              <label className="block text-zinc-500 font-semibold mb-1">
                Website
              </label>
              <input
                type="text"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none"
              />
            </div>

            <div className="col-span-1 sm:col-span-2">
              <label className="block text-zinc-500 font-semibold mb-1">
                Status Stage
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-semibold cursor-pointer focus:outline-none"
              >
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Follow Up">Follow Up</option>
                <option value="Responded">Responded</option>
                <option value="Interested">Interested</option>
                <option value="Proposal Sent">Proposal</option>
                <option value="Closed Won">Closed Won</option>
              </select>
            </div>

            {/* Direct Phone Number & Apple Verification Toggle */}
            <div className="col-span-1 sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-zinc-500 font-semibold">
                  Phone Number (FaceTime / iMessage)
                </label>
                <button
                  type="button"
                  onClick={() => setIsAppleVerified(!isAppleVerified)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                    isAppleVerified
                      ? 'bg-blue-500/10 text-[#007AFF] border-blue-500/30 dark:bg-blue-950/50'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                  }`}
                  title="Mark this lead as Apple FaceTime & iMessage compatible"
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
                className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          </div>

          {/* Account Assignment Field - Super Admin Only */}
          {isSuperAdmin && (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/80 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1.5">
              <label className="block text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-rose-500" />
                  <span>Assign Lead To Account</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 font-bold text-[9px]">
                  Super Admin
                </span>
              </label>
              <select
                value={assignedEmail}
                onChange={(e) => setAssignedEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-xs"
              >
                {availableAccounts && availableAccounts.length > 0 ? (
                  availableAccounts.map((acc) => {
                    const isMain = acc.email.toLowerCase() === 'tonykone21@gmail.com';
                    const labelName = acc.displayName || acc.email.split('@')[0];
                    return (
                      <option key={acc.email} value={acc.email}>
                        {labelName} ({acc.email}){isMain ? ' ★ Main Account' : ''}
                      </option>
                    );
                  })
                ) : (
                  <option value={currentUserEmail || 'tonykone21@gmail.com'}>
                    {currentUserEmail || 'tonykone21@gmail.com'} (Main Account)
                  </option>
                )}
              </select>
              <p className="text-[10px] text-zinc-400">
                Select which team member or registered account owns this prospect.
              </p>
            </div>
          )}

          {/* Batch Assignment */}
          <div>
            <label className="block text-zinc-500 font-semibold mb-1 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5 text-rose-500" />
                <span>Upload Batch (Optional)</span>
              </span>
              <span className="text-[10px] text-zinc-400 font-normal">Organize into batch tab</span>
            </label>
            <input
              type="text"
              list="existing-batch-list"
              placeholder="e.g. Summer Campaign, Fashion Brands"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-xs"
            />
            {existingBatches && existingBatches.length > 0 && (
              <datalist id="existing-batch-list">
                {existingBatches.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            )}
          </div>

          <div>
            <label className="block text-zinc-500 font-semibold mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" />
              <span>Tags (comma separated)</span>
            </label>
            <input
              type="text"
              placeholder="E-commerce, High-Ticket"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-zinc-500 font-semibold mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Initial Notes</span>
            </label>
            <textarea
              rows={2}
              placeholder="Add details about lead source or initial outreach..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Screenshots Upload Section */}
          <div className="space-y-2">
            <label className="block text-zinc-500 font-semibold text-xs flex items-center gap-1">
              <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
              <span>Upload Screenshots / Proof</span>
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`p-4 border-2 border-dashed rounded-xl text-center transition-all ${
                dragActive
                  ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30'
              }`}
            >
              <Upload className="w-6 h-6 mx-auto text-zinc-400 mb-1" />
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                Drag & drop screenshots or{' '}
                <label className="text-rose-500 font-semibold cursor-pointer hover:underline">
                  browse files
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-[10px] text-zinc-400">PNG, JPG, WebP supported</p>
            </div>

            {/* Thumbnail Previews */}
            {screenshots.length > 0 && (
              <div className="grid grid-cols-4 gap-2 pt-1">
                {screenshots.map((url, index) => (
                  <div
                    key={index}
                    className="aspect-square rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 relative group bg-zinc-100 dark:bg-zinc-900"
                  >
                    <img
                      src={url}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeScreenshot(index)}
                      className="absolute top-1 right-1 p-1 rounded-md bg-zinc-950/80 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Demo Video Upload */}
          <div className="space-y-2">
            <label className="block text-zinc-500 font-semibold text-[11px] flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Video className="w-3.5 h-3.5 text-rose-500" /> Demo Video Upload
              </span>
              <span className="text-[10px] text-zinc-400 font-normal">Max 100MB per video</span>
            </label>
            <div className="flex items-center gap-3">
              <label className="px-4 py-2 border border-zinc-300 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                Select Video File
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleVideoSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
              {demoVideoFile ? (
                <div className="flex-1 min-w-0 flex items-center justify-between gap-2 bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="min-w-0">
                    <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium truncate block" title={demoVideoFile.name}>
                      {demoVideoFile.name}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {(demoVideoFile.size / (1024 * 1024)).toFixed(1)} MB
                      {demoVideoUrl && !isUploadingVideo && ' • Ready'}
                      {videoUploadError && ' • Upload failed'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearVideo}
                    className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    title="Remove video"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-zinc-400">No video selected</span>
              )}
            </div>

            {/* Video Upload Progress Bar */}
            {uploadProgress !== null && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-semibold text-rose-500">
                  <span>Uploading video to Cloud Storage...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || isUploadingScreenshots}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploadingScreenshots}
              className="px-6 py-2 rounded-xl bg-black hover:bg-zinc-800 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress !== null ? `Uploading (${uploadProgress}%)...` : 'Saving Lead...'}
                </>
              ) : isUploadingScreenshots ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading Screenshots...
                </>
              ) : (
                'Save Lead'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
