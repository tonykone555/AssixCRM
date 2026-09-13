import React from 'react';
import {
  Instagram,
  Globe,
  Calendar,
  Share2,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  FolderOpen,
  PhoneCall,
  Phone,
  CheckCircle2,
  Mail,
  Sparkles,
  Video,
  Eye,
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';
import {
  extractLeadPhone,
  formatPhoneDisplay,
  getFaceTimeAudioUrl,
  getIMessageUrl,
  triggerFaceTimeAudioCall
} from '../utils/phoneUtils';
import { SocialLogosRow, PriorityBadge } from './SocialAndPriorityBadges';

interface PipelineViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, status: LeadStatus) => void;
  onOpenInteractionModal: (lead: Lead) => void;
  onShareLead: (lead: Lead) => void;
  onOpenScreenshotLightbox: (lead: Lead, imageIndex?: number) => void;
  onOpenLiveCoPilot?: (lead: Lead) => void;
  onOpenVideoPitch?: (lead: Lead) => void;
  onOpenCallSimulator?: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
  isDarkMode: boolean;
}

const STAGES: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'New', label: 'New', color: 'bg-blue-500' },
  { id: 'Contacted', label: 'Contacted', color: 'bg-cyan-500' },
  { id: 'Follow Up', label: 'Follow Up', color: 'bg-amber-500' },
  { id: 'Responded', label: 'Responded', color: 'bg-purple-500' },
  { id: 'Interested', label: 'Interested', color: 'bg-pink-500' },
  { id: 'Proposal Sent', label: 'Proposal', color: 'bg-indigo-500' },
  { id: 'Closed Won', label: 'Closed Won', color: 'bg-emerald-500' },
];

export const PipelineView: React.FC<PipelineViewProps> = ({
  leads,
  onSelectLead,
  onUpdateStatus,
  onOpenInteractionModal,
  onShareLead,
  onOpenScreenshotLightbox,
  onOpenLiveCoPilot,
  onOpenVideoPitch,
  onOpenCallSimulator,
  onUpdateLead,
}) => {
  const getStageIndex = (status: LeadStatus) => {
    return STAGES.findIndex((s) => s.id === status);
  };

  const moveStage = (lead: Lead, direction: -1 | 1) => {
    const currentIndex = getStageIndex(lead.status);
    if (currentIndex === -1) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < STAGES.length) {
      onUpdateStatus(lead.id, STAGES[nextIndex].id);
    }
  };

  return (
    <div className="p-4 overflow-x-auto min-h-[600px]">
      <div className="flex gap-4 min-w-[1280px]">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.status === stage.id);

          return (
            <div
              key={stage.id}
              className="flex-1 min-w-[240px] max-w-[280px] bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl p-3 border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${stage.color}`} />
                  <h3 className="font-semibold text-xs text-zinc-900 dark:text-white">
                    {stage.label}
                  </h3>
                </div>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {stageLeads.length}
                </span>
              </div>

              {/* Lead Cards List */}
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[70vh] pr-0.5">
                {stageLeads.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 text-xs font-medium">
                    No leads in {stage.label}
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const handleClean = (lead.instagramHandle || '').replace(/^@/, '');
                    const igUrl = handleClean ? `https://instagram.com/${handleClean}` : '';
                    const dmUrl = handleClean ? `https://ig.me/m/${handleClean}` : '';
                    const phone = extractLeadPhone(lead);
                    const hasMedia = lead.productImage || (lead.screenshots && lead.screenshots.length > 0);

                    return (
                      <div
                        key={lead.id}
                        onClick={() => onSelectLead(lead)}
                        className="bg-white dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs hover:shadow-md hover:border-rose-300 dark:hover:border-rose-500/40 transition-all cursor-pointer group"
                      >
                        {/* Top info */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-semibold text-sm text-zinc-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-pink-400 transition-colors truncate">
                                {lead.name}
                              </h4>
                              <PriorityBadge lead={lead} compact />
                              {lead.isNormalLead && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                                  Normal
                                </span>
                              )}
                              {lead.isAppleVerified && (
                                <span
                                  className="text-[#007AFF] inline-flex items-center"
                                  title="Apple FaceTime & iMessage Verified"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 fill-current text-white" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-1 flex-wrap">
                              {lead.email && (
                                <a
                                  href={`mailto:${lead.email}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-600 dark:text-zinc-300 hover:text-blue-600 truncate max-w-[150px]"
                                  title={`Email: ${lead.email}`}
                                >
                                  <Mail className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                                  <span className="truncate">{lead.email}</span>
                                </a>
                              )}
                              {handleClean ? (
                                <span className="inline-flex items-center gap-1">
                                  <Instagram className="w-2.5 h-2.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
                                  <a
                                    href={igUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="hover:underline truncate"
                                  >
                                    @{handleClean}
                                  </a>
                                </span>
                              ) : null}
                              {phone && (
                                <span className="text-[10px] text-zinc-400 font-mono inline-flex items-center gap-0.5">
                                  <Phone className="w-2.5 h-2.5 text-zinc-400" />
                                  <span>{formatPhoneDisplay(phone)}</span>
                                </span>
                              )}
                            </div>
                            {/* Social Media Quick Icons Bar */}
                            <div className="mt-1.5">
                              <SocialLogosRow lead={lead} compact />
                            </div>
                          </div>

                          {/* Media Thumbnail or Upload Trigger */}
                          {hasMedia ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenScreenshotLightbox(lead, 0);
                              }}
                              className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 shrink-0 relative bg-zinc-100 dark:bg-zinc-900 hover:opacity-90 transition-opacity"
                              title="View proof media"
                            >
                              <img
                                src={lead.productImage || lead.screenshots[0]}
                                alt="Proof"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectLead(lead);
                              }}
                              className="w-8 h-8 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-500/40 transition-colors"
                              title="Upload Proof Screenshot"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Notes Preview */}
                        {lead.notes && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800/60">
                            {lead.notes}
                          </p>
                        )}

                        {/* Tags & Upload Batch Pill */}
                        <div className="flex flex-wrap items-center gap-1 mb-3">
                          {lead.uploadBatchName && (
                            <span className="px-1.5 py-0.5 text-[10px] rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold inline-flex items-center gap-1">
                              <FolderOpen className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[100px]">{lead.uploadBatchName}</span>
                            </span>
                          )}
                          {lead.tags && lead.tags.slice(0, 2).map((t, idx) => {
                            const isBlackTag =
                              t.toLowerCase().includes('dress') ||
                              t.toLowerCase().includes('clothing');
                            return (
                              <span
                                key={idx}
                                className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${
                                  isBlackTag
                                    ? 'bg-black text-white dark:bg-black dark:text-white border border-zinc-800'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                                }`}
                              >
                                #{t}
                              </span>
                            );
                          })}
                          {lead.videoPitchTracking && lead.videoPitchTracking.viewCount > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenVideoPitch?.(lead);
                              }}
                              className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold inline-flex items-center gap-1 hover:bg-emerald-500/20 transition-all cursor-pointer"
                              title={`Video Watched: ${lead.videoPitchTracking.viewCount} times`}
                            >
                              <Eye className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                              <span>Watched ({lead.videoPitchTracking.viewCount}x)</span>
                            </button>
                          )}
                        </div>

                        {/* Card Footer Actions */}
                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-xs">
                          {/* Stage Navigation Arrows */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => moveStage(lead, -1)}
                              disabled={getStageIndex(lead.status) === 0}
                              className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30"
                              title="Move Left"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveStage(lead, 1)}
                              disabled={getStageIndex(lead.status) === STAGES.length - 1}
                              className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30"
                              title="Move Right"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Quick Icon Actions */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {/* Live Call Co-Pilot Teleprompter */}
                            {onOpenLiveCoPilot && (
                              <button
                                onClick={() => onOpenLiveCoPilot(lead)}
                                className="p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors"
                                title="AI Call Co-Pilot & Teleprompter"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* AI Video Pitch */}
                            {onOpenVideoPitch && (
                              <button
                                onClick={() => onOpenVideoPitch(lead)}
                                className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors relative"
                                title="AI Video Pitch & iMessage Tracker"
                              >
                                <Video className="w-3.5 h-3.5" />
                                {lead.videoPitchTracking && lead.videoPitchTracking.viewCount > 0 && (
                                  <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                )}
                              </button>
                            )}
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
                                  className="p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                                  title={`FaceTime Audio (${formatPhoneDisplay(phone)})`}
                                >
                                  <PhoneCall className="w-3.5 h-3.5" />
                                </a>
                                <a
                                  href={getIMessageUrl(phone)}
                                  className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[#007AFF] transition-colors"
                                  title={`iMessage (${formatPhoneDisplay(phone)})`}
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>
                              </>
                            )}
                            {/* Email Action */}
                            {lead.email && (
                              <a
                                href={`mailto:${lead.email}`}
                                className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 text-zinc-400 hover:text-blue-500"
                                title={`Send Email to ${lead.email}`}
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}

                            <button
                              onClick={() => onOpenInteractionModal(lead)}
                              className="p-1 rounded hover:bg-purple-50 dark:hover:bg-purple-950/40 text-zinc-400 hover:text-purple-500"
                              title="Log Date"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onShareLead(lead)}
                              className="p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-zinc-400 hover:text-indigo-500"
                              title="Share"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
