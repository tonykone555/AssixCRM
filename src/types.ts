export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Follow Up'
  | 'Responded'
  | 'Interested'
  | 'Proposal Sent'
  | 'Closed Won'
  | 'Closed Lost';

export interface Interaction {
  id: string;
  date: string; // ISO format or YYYY-MM-DD
  type: 'DM Sent' | 'Reply Received' | 'Follow Up' | 'Call' | 'Proposal' | 'Note' | 'Meeting' | 'Closed';
  notes: string;
}

export interface CallLogRecord {
  id: string;
  timestamp: string;
  callerEmail?: string;
  callerName?: string;
  outcome: 'Connected' | 'Left Voicemail' | 'No Answer' | 'Busy' | 'Wrong Number' | 'Follow Up';
  durationSeconds?: number;
  notes: string;
  audioRecordingUrl?: string;
}

export interface VideoPitchViewEvent {
  timestamp: string;
  watchedSeconds?: number;
  durationSeconds?: number;
  percentWatched?: number;
  device?: string;
  ip?: string;
}

export interface VideoPitchTracking {
  pitchId: string;
  videoUrl: string;
  createdDate: string;
  sentVia?: 'iMessage' | 'WhatsApp' | 'Email';
  lastViewedAt?: string;
  viewCount: number;
  highestPercentWatched?: number;
  views: VideoPitchViewEvent[];
}

export interface Lead {
  id: string;
  name: string;
  email?: string;          // Direct contact email for normal/business leads
  phone?: string;          // Direct phone number
  instagramHandle?: string; // e.g. "luxe_design_co" (optional for normal leads)
  isNormalLead?: boolean;  // Set to true for normal/business leads (not Instagram leads)
  isAppleVerified?: boolean; // Blue Tick for Apple FaceTime & iMessage compatibility
  website?: string;
  status: LeadStatus;
  tags: string[];
  productImage?: string; // Main product image URL or base64
  screenshots: string[]; // List of screenshot image URLs or base64
  vtonResults?: string[]; // Generated Virtual Try-On images
  demoVideoUrl?: string; // URL to a demo video (e.g. YouTube, Loom, or hosted MP4)
  videoPitchTracking?: VideoPitchTracking; // AI Video Pitch tracking data & viewing telemetry
  notes: string;
  interactions: Interaction[];
  callLogs?: CallLogRecord[];
  customFields: Record<string, string>; // e.g. { "Followers": "45K", "Niche": "Fashion" }
  createdAt: string;
  updatedAt: string;
  lastInteractionDate?: string;
  ownerId?: string;
  ownerEmail?: string;
  assignedAccountEmails?: string[]; // Accounts permitted to view/manage this lead
  uploadBatchId?: string;           // Batch ID for upload organization
  uploadBatchName?: string;         // Name of the upload batch, e.g. "Fashion Campaign - Sep 3"
  uploadBatchDate?: string;         // ISO date of upload
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date';
  options?: string[]; // For select type
  ownerId?: string;
  ownerEmail?: string;
}

export type ViewMode = 'table' | 'kanban';

export type SortOption = 'added_last' | 'contacted_last' | 'modified_last';

export interface ChatMessage {
  id: string;
  senderEmail: string;
  senderName: string;
  receiverEmail: string;
  text: string;
  timestamp: string;
  leadId?: string;
  leadName?: string;
  screenshotUrl?: string;
}
