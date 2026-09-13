import React from 'react';
import {
  Instagram,
  Globe,
  Calendar,
  Share2,
  Trash2,
  ExternalLink,
  MessageSquare,
  Image as ImageIcon,
  FolderOpen,
  Users,
  CheckSquare,
  Square,
  PhoneCall,
  Phone,
  CheckCircle2,
  Mail,
  Sparkles,
  Video,
  Eye,
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import { compressAndGetInstantDataUrl } from '../utils/imageCompressor';
import {
  extractLeadPhone,
  formatPhoneDisplay,
  getFaceTimeAudioUrl,
  getIMessageUrl,
  triggerFaceTimeAudioCall
} from '../utils/phoneUtils';
import { SocialLogosRow, PriorityBadge } from './SocialAndPriorityBadges';

interface TableViewProps {
  leads: Lead[];
  selectedLeadIds?: string[];
  onToggleSelectLead?: (leadId: string) => void;
  
  onToggleSelectAll?: () => void;
  
  onBatchDeleteLeads?: (leadIds: string[]) => void;
  onBatchEnrichLeads?: (leadIds: string[]) => void;
  onBatchAssignLeads?: (leadIds: string[], accountEmail: string) => void;
  availableAccounts?: { email: string, uid: string, displayName?: string }[];
  isBatchEnriching?: boolean;
  batchEnrichProgress?: { current: number, total: number };

  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onOpenInteractionModal: (lead: Lead) => void;
  onShareLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onUpdateLead: (lead: Lead) => void;
  onOpenScreenshotLightbox: (lead: Lead, imageIndex?: number) => void;
  onOpenAppleCampaign?: () => void;
  onOpenLiveCoPilot?: (lead: Lead) => void;
  onOpenVideoPitch?: (lead: Lead) => void;
  onOpenCallSimulator?: (lead: Lead) => void;
  isDarkMode: boolean;
  isSuperAdmin?: boolean;
}

export const TableView: React.FC<TableViewProps> = ({
  leads,
  selectedLeadIds = [],
  onToggleSelectLead,
  onToggleSelectAll,
  
  
  onBatchDeleteLeads,
  onBatchEnrichLeads,
  onBatchAssignLeads,
  availableAccounts,

  isBatchEnriching,
  batchEnrichProgress,

  onSelectLead,
  onUpdateStatus,
  onOpenInteractionModal,
  onShareLead,
  onDeleteLead,
  onUpdateLead,
  onOpenScreenshotLightbox,
  onOpenAppleCampaign,
  onOpenLiveCoPilot,
  onOpenVideoPitch,
  onOpenCallSimulator,
  isSuperAdmin,
}) => {
  const [uploadingLeadId, setUploadingLeadId] = React.useState<string | null>(null);

  const isAllSelected = leads.length > 0 && selectedLeadIds.length === leads.length;

  const handleInlineProofUpload = async (lead: Lead, files: FileList) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    
    setUploadingLeadId(lead.id);
    try {
      const processedList = await Promise.all(
        imageFiles.map((file) => compressAndGetInstantDataUrl(file))
      );
      const instantUrls = processedList.map((item) => item.dataUrl).filter(Boolean);
      
      if (instantUrls.length > 0) {
        onUpdateLead({
          ...lead,
          screenshots: [...(lead.screenshots || []), ...instantUrls]
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingLeadId(null);
    }
  };

  if (leads.length === 0) {
    return null; // Parent App will render empty state
  }

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'New':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
      case 'Contacted':
        return 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20';
      case 'Follow Up':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
      case 'Responded':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 border-purple-200 dark:border-purple-500/20';
      case 'Interested':
        return 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400 border-pink-200 dark:border-pink-500/20';
      case 'Proposal Sent':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20';
      case 'Closed Won':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
      case 'Closed Lost':
        return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700';
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700';
    }
  };

  return (
    <div className="w-full overflow-x-auto bg-white dark:bg-zinc-950 relative">
      {/* Batch Action Floating Header */}
      {selectedLeadIds.length > 0 && (
        <div className="sticky top-0 z-20 px-4 py-2.5 bg-sky-500/10 dark:bg-sky-500/20 border-b border-sky-500/30 flex items-center justify-between text-xs font-semibold text-sky-900 dark:text-sky-200 animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[10px]">
              {selectedLeadIds.length}
            </span>
            <span>
              {selectedLeadIds.length} lead(s) selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenAppleCampaign && (
              <button
                onClick={onOpenAppleCampaign}
                className="px-3 py-1.5 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                title="Launch Apple iMessage campaign for selected leads"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>🍎 Apple Campaign ({selectedLeadIds.length})</span>
              </button>
            )}
            {onToggleSelectAll && (
              <button
                onClick={onToggleSelectAll}
                className="px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium cursor-pointer"
              >
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
            )}
            
            
            {isSuperAdmin && onBatchAssignLeads && availableAccounts && availableAccounts.length > 0 && (
              <div className="relative group/assign">
                <button className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all">
                  <Users className="w-3.5 h-3.5" />
                  <span>Assign To...</span>
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl opacity-0 invisible group-hover/assign:opacity-100 group-hover/assign:visible transition-all z-50 py-1 overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">Select Sub-Account</div>
                  {availableAccounts.map(acc => (
                    <button
                      key={acc.email}
                      onClick={() => onBatchAssignLeads(selectedLeadIds, acc.email)}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {acc.displayName || acc.email.split('@')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {onBatchEnrichLeads && (

              <button
                onClick={() => onBatchEnrichLeads(selectedLeadIds)}
                disabled={isBatchEnriching}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                title="Scrape selected leads' websites for IG, Phone, and Email"
              >
                {isBatchEnriching ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Enriching... {batchEnrichProgress?.current} / {batchEnrichProgress?.total}</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Enrich Websites ({selectedLeadIds.length})</span>
                  </>
                )}
              </button>
            )}
            {onBatchDeleteLeads && (

              <button
                onClick={() => onBatchDeleteLeads(selectedLeadIds)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedLeadIds.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-900/80 uppercase tracking-wider text-[11px]">
            <th className="py-3.5 px-4">Lead / Handle</th>
            {isSuperAdmin && <th className="py-3.5 px-4">Account</th>}
            <th className="py-3.5 px-4">Status</th>
            <th className="py-3.5 px-4">Tags</th>
            <th className="py-3.5 px-4">Proof / Assets</th>
            <th className="py-3.5 px-4">Last Activity</th>
            <th className="py-3.5 px-4">Notes</th>
            <th className="py-3.5 px-4 text-right">
              <div className="flex items-center justify-end gap-2">
                {onToggleSelectAll && (
                  <button
                    onClick={onToggleSelectAll}
                    className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-200/50 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors uppercase tracking-widest cursor-pointer"
                  >
                    {isAllSelected ? 'Deselect All' : 'Select All'}
                  </button>
                )}
                <span>Actions</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/60 font-medium bg-white dark:bg-zinc-950">
          {leads.map((lead) => {
            const handleClean = (lead.instagramHandle || '').replace(/^@/, '');
            const igUrl = handleClean ? `https://instagram.com/${handleClean}` : '';
            const dmUrl = handleClean ? `https://ig.me/m/${handleClean}` : '';
            const phone = extractLeadPhone(lead);
            const hasMedia = lead.productImage || (lead.screenshots && lead.screenshots.length > 0);
            const isSelected = selectedLeadIds.includes(lead.id);

            return (
              <tr
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className={`group transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50 dark:bg-sky-950/30 border-l-2 border-l-sky-500'
                    : 'bg-white dark:bg-zinc-950 hover:bg-sky-50/40 dark:hover:bg-zinc-900/60'
                }`}
              >
                {/* Lead Name & Handle */}
                <td className="py-3.5 px-4 min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-sm shrink-0 border border-zinc-200 dark:border-zinc-700">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-900 dark:text-white truncate text-sm group-hover:text-rose-600 dark:group-hover:text-pink-400 transition-colors flex items-center gap-1.5 flex-wrap">
                        <span className="truncate">{lead.name}</span>
                        <PriorityBadge lead={lead} compact />
                        {lead.isNormalLead && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                            Normal Lead
                          </span>
                        )}
                        {lead.isAppleVerified ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateLead({ ...lead, isAppleVerified: false });
                            }}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-blue-500/10 text-[#007AFF] dark:text-blue-400 border border-blue-500/20 font-bold text-[10px] shrink-0"
                            title="Apple Verified (FaceTime Audio & iMessage Ready) - Click to toggle"
                          >
                            <CheckCircle2 className="w-3 h-3 fill-[#007AFF] text-white" />
                            <span>Apple</span>
                          </button>
                        ) : phone ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateLead({ ...lead, isAppleVerified: true });
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-[#007AFF] hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-all font-semibold shrink-0"
                            title="Mark as Apple Verified (Blue Tick)"
                          >
                            + 🍎 Verify
                          </button>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-xs flex-wrap mt-0.5">
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors text-[11px] font-mono text-zinc-600 dark:text-zinc-300"
                            title={`Email: ${lead.email}`}
                          >
                            <Mail className="w-3 h-3 text-zinc-400" />
                            <span className="truncate max-w-[160px]">{lead.email}</span>
                          </a>
                        )}
                        {handleClean ? (
                          <a
                            href={igUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-zinc-800 dark:hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <Instagram className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                            <span>@{handleClean}</span>
                          </a>
                        ) : null}
                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-emerald-600 dark:hover:text-emerald-400 text-[11px] text-zinc-500 font-mono inline-flex items-center gap-0.5"
                            title={`Call: ${formatPhoneDisplay(phone)}`}
                          >
                            <Phone className="w-2.5 h-2.5 text-zinc-400" />
                            <span>{formatPhoneDisplay(phone)}</span>
                          </a>
                        )}
                        {lead.website && (
                          <a
                            href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-zinc-800 dark:hover:text-white transition-colors"
                            title={lead.website}
                          >
                            <Globe className="w-3 h-3" />
                          </a>
                        )}
                        {lead.uploadBatchName && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold inline-flex items-center gap-1">
                            <FolderOpen className="w-2.5 h-2.5" />
                            <span>{lead.uploadBatchName}</span>
                          </span>
                        )}
                        {lead.videoPitchTracking && lead.videoPitchTracking.viewCount > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenVideoPitch?.(lead);
                            }}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold inline-flex items-center gap-1 hover:bg-emerald-500/20 transition-all cursor-pointer"
                            title={`Video Watched: ${lead.videoPitchTracking.viewCount} times (${lead.videoPitchTracking.highestPercentWatched || 100}% watched)`}
                          >
                            <Eye className="w-3 h-3 text-emerald-500 animate-pulse" />
                            <span>Watched ({lead.videoPitchTracking.viewCount}x)</span>
                          </button>
                        )}
                        <SocialLogosRow lead={lead} compact />
                      </div>
                    </div>
                  </div>
                </td>

                {/* Account Owner / Access */}
                {isSuperAdmin && (
                  <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-[11px] inline-flex items-center gap-1">
                        {lead.ownerEmail ? lead.ownerEmail.split('@')[0] : 'Primary Account'}
                      </span>
                      {lead.assignedAccountEmails && lead.assignedAccountEmails.length > 1 && (
                        <span
                          className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10px] inline-flex items-center gap-1 cursor-help"
                          title={`Assigned to: ${lead.assignedAccountEmails.join(', ')}`}
                        >
                          <Users className="w-2.5 h-2.5" />
                          <span>+{lead.assignedAccountEmails.length - 1}</span>
                        </span>
                      )}
                    </div>
                  </td>
                )}

                {/* Status Badge Select */}
                <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={lead.status}
                    onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none transition-all ${getStatusColor(
                      lead.status
                    )}`}
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
                </td>

                {/* Tags */}
                <td className="py-3.5 px-4 max-w-[180px]">
                  <div className="flex flex-wrap gap-1">
                    {lead.tags && lead.tags.length > 0 ? (
                      lead.tags.slice(0, 3).map((tag, i) => {
                        const isBlackTag =
                          tag.toLowerCase().includes('dress') ||
                          tag.toLowerCase().includes('clothing');
                        return (
                          <span
                            key={i}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md truncate max-w-[120px] transition-all ${
                              isBlackTag
                                ? 'bg-black text-white dark:bg-black dark:text-white border border-zinc-800 shadow-xs'
                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60'
                            }`}
                          >
                            #{tag}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-zinc-400 text-[11px]">—</span>
                    )}
                    {lead.tags && lead.tags.length > 3 && (
                      <span className="text-[10px] text-zinc-400 font-semibold self-center">
                        +{lead.tags.length - 3}
                      </span>
                    )}
                  </div>
                </td>

                {/* Proof / Assets Thumbnails */}
                <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                  {hasMedia ? (
                    <button
                      onClick={() => onOpenScreenshotLightbox(lead, 0)}
                      className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors flex items-center gap-1 text-[11px] font-medium"
                      title="View Proof & Media"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-rose-500" />
                      <span>{ (lead.productImage ? 1 : 0) + (lead.screenshots?.length || 0)}</span>
                    </button>
                  ) : (
                    <label
                      className="${uploadingLeadId === lead.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-500'} px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-400 text-[10px] font-medium transition-colors border border-dashed border-zinc-200 dark:border-zinc-800"
                      title="Upload Proof Screenshot"
                    >
                      {uploadingLeadId === lead.id ? '...' : '+ Proof'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="hidden" 
                        disabled={uploadingLeadId === lead.id}
                        onChange={(e) => {
                           if (e.target.files) handleInlineProofUpload(lead, e.target.files);
                           e.target.value = '';
                        }} 
                      />
                    </label>
                  )}
                </td>

                {/* Last Activity */}
                <td className="py-3.5 px-4 text-zinc-600 dark:text-zinc-400 text-[11px] whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{lead.lastInteractionDate || lead.createdAt.split('T')[0]}</span>
                  </div>
                </td>

                {/* Notes Snippet */}
                <td className="py-3.5 px-4 max-w-[220px]">
                  <p className="text-zinc-600 dark:text-zinc-400 text-[11px] line-clamp-2">
                    {lead.notes || 'No notes logged.'}
                  </p>
                </td>

                {/* Icon Quick Actions */}
                <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    {/* FaceTime Call & iMessage (if phone exists) */}
                    {phone && (
                      <>
                        <a
                          href={getFaceTimeAudioUrl(phone)}
                          target="_top"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            triggerFaceTimeAudioCall(phone);
                          }}
                          className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                          title={`FaceTime Audio Call (${formatPhoneDisplay(phone)}) - Free via Wi-Fi`}
                        >
                          <PhoneCall className="w-4 h-4" />
                        </a>
                        <a
                          href={getIMessageUrl(phone)}
                          className="p-1.5 rounded-lg text-[#007AFF] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title={`Send iMessage / SMS (${formatPhoneDisplay(phone)})`}
                        >
                          <Phone className="w-4 h-4 text-[#007AFF]" />
                        </a>
                      </>
                    )}

                    {/* Email Action (if email exists) */}
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                        title={`Send Email to ${lead.email}`}
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    )}

                    {/* AI Live Call Co-Pilot (Teleprompter for FaceTime/WhatsApp) */}
                    {onOpenLiveCoPilot && (
                      <button
                        onClick={() => onOpenLiveCoPilot(lead)}
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        title="Launch AI Live Call Co-Pilot & Teleprompter (FaceTime / WhatsApp)"
                      >
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </button>
                    )}

                    {/* AI Call Simulator */}
                    {onOpenCallSimulator && (
                      <button
                        onClick={() => onOpenCallSimulator(lead)}
                        className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                        title="Practice Roleplay Cold Call against this Lead"
                      >
                        <PhoneCall className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </button>
                    )}



                    {/* Log Interaction Date */}
                    <button
                      onClick={() => onOpenInteractionModal(lead)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                      title="Log Interaction Date & Notes"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={() => onShareLead(lead)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                      title="Share Lead Card"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>

                    {/* Delete Lead */}
                    <button
                      onClick={() => {
                        if (confirm(`Delete lead "${lead.name}"?`)) {
                          onDeleteLead(lead.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete Lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800 mx-1"></div>

                    {/* Select Checkbox Button */}
                    {onToggleSelectLead && (
                      <button
                        onClick={() => onToggleSelectLead(lead.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isSelected
                            ? 'text-sky-600 bg-sky-100 dark:bg-sky-500/20 shadow-sm'
                            : 'text-zinc-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                        }`}
                        title={isSelected ? "Deselect Lead" : "Select Lead"}
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
