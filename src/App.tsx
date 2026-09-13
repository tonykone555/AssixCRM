import React, { useState, useEffect, useMemo } from 'react';
import { User } from 'firebase/auth';
import { INITIAL_LEADS, INITIAL_CUSTOM_FIELDS } from './data/mockData';
import { Lead, CustomFieldDefinition, ViewMode, LeadStatus, Interaction, SortOption } from './types';
import { Header } from './components/Header';
import { TableView } from './components/TableView';
import { PipelineView } from './components/PipelineView';
import { LeadDetailDrawer } from './components/LeadDetailDrawer';
import { AddLeadModal } from './components/AddLeadModal';
import { InteractionModal } from './components/InteractionModal';
import { ShareModal } from './components/ShareModal';
import { ImportExportModal } from './components/ImportExportModal';
import { CustomFieldsModal } from './components/CustomFieldsModal';
import { AccountsModal } from './components/AccountsModal';
import { ScreenshotLightbox } from './components/ScreenshotLightbox';
import { AuthScreen } from './components/AuthScreen';
import { ChatWidget } from './components/ChatWidget';
import { SWRegister } from './components/SWRegister';
import { LeadScraperModal } from './components/LeadScraperModal';
import { AppleCampaignModal } from './components/AppleCampaignModal';
import { CallSimulatorModal } from './components/CallSimulatorModal';
import { LiveCallCoPilotModal } from './components/LiveCallCoPilotModal';
import { AIVideoPitchModal } from './components/AIVideoPitchModal';
import { AIVoiceNoteModal } from './components/AIVoiceNoteModal';
import { VideoPitchWatchPortal } from './components/VideoPitchWatchPortal';
import { ProspectDiscovery } from './components/ProspectDiscovery';
import { MarketplaceDashboard } from './components/Marketplace/MarketplaceDashboard';
import { compressAndGetInstantDataUrl } from './utils/imageCompressor';
import { Instagram, Plus, FileSpreadsheet, Sparkles, FilterX, ShieldCheck, Loader2, X, FolderOpen, Users, Layers, Pencil } from 'lucide-react';
import {
  subscribeToAuth,
  subscribeToLeads,
  getCachedLeads,
  subscribeToCustomFields,
  getCachedCustomFields,
  subscribeToAllUsers,
  getCachedUsers,
  saveLeadToFirestore,
  deleteLeadFromFirestore,
  saveCustomFieldToFirestore,
  deleteCustomFieldFromFirestore,
  signOutUser,
  isSuperAdminEmail,
  removeUserAccess,
} from './lib/firebase';

export default function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Core Data State - pre-hydrate from local storage for offline resilience
  const [leads, setLeads] = useState<Lead[]>(() => {
    try {
      const cached = localStorage.getItem('crm_cached_leads');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_LEADS;
  });

  const [customFieldsDefs, setCustomFieldsDefs] = useState<CustomFieldDefinition[]>(() => {
    try {
      const cached = localStorage.getItem('crm_cached_custom_fields');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return INITIAL_CUSTOM_FIELDS;
  });

  const [allUsers, setAllUsers] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('crm_cached_users');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [dataLoading, setDataLoading] = useState<boolean>(false);
  const [isCloudSyncEnabled, setIsCloudSyncEnabled] = useState<boolean>(true);

  // UI Settings
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [activePage, setActivePage] = useState<'crm' | 'marketplace'>('crm');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [fullCanvasMode, setFullCanvasMode] = useState<boolean>(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Filters & Search & Sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');
  const [tagFilter, setTagFilter] = useState<string>('ALL');
  const [batchFilter, setBatchFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('modified_last');

  // Modals & Drawers
  const [isAddLeadOpen, setIsAddLeadOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isAppleCampaignOpen, setIsAppleCampaignOpen] = useState(false);
  const [isProspectDiscoveryOpen, setIsProspectDiscoveryOpen] = useState(false);
  const [isScraperOpen, setIsScraperOpen] = useState(false);
  const [isCustomFieldsOpen, setIsCustomFieldsOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBatchEnriching, setIsBatchEnriching] = useState(false);
  const [batchEnrichProgress, setBatchEnrichProgress] = useState({ current: 0, total: 0 });


  // Batch Renaming State
  const [renamingBatch, setRenamingBatch] = useState<{ id: string; name: string } | null>(null);
  const [newBatchNameInput, setNewBatchNameInput] = useState<string>('');

  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<Lead | null>(null);
  const [selectedLeadForInteraction, setSelectedLeadForInteraction] = useState<Lead | null>(null);
  const [shareTargetLead, setShareTargetLead] = useState<Lead | null>(null);
  const [lightboxTarget, setLightboxTarget] = useState<{
    lead: Lead;
    imageIndex?: number;
  } | null>(null);

  // AI Sales Intelligence Suite States
  const [isCallSimulatorOpen, setIsCallSimulatorOpen] = useState(false);
  const [isVoiceNoteModalOpen, setIsVoiceNoteModalOpen] = useState(false);
  const [callSimulatorTargetLead, setCallSimulatorTargetLead] = useState<Lead | null>(null);
  const [liveCoPilotTargetLead, setLiveCoPilotTargetLead] = useState<Lead | null>(null);
  const [videoPitchTargetLead, setVideoPitchTargetLead] = useState<Lead | null>(null);
  const [watchPitchId, setWatchPitchId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const watch = params.get('watch');
      if (watch) return watch;
      if (window.location.hash.includes('watch=')) {
        const match = window.location.hash.match(/[?&]watch=([^&]+)/) || window.location.hash.match(/#watch=(.+)/);
        if (match && match[1]) return match[1];
      }
      if (window.location.pathname.startsWith('/watch/')) {
        const parts = window.location.pathname.split('/watch/');
        if (parts[1]) return decodeURIComponent(parts[1]);
      }
    } catch (e) {}
    return null;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Subscribe to Firebase Auth
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Firestore when User is Authenticated
  useEffect(() => {
    if (!currentUser) {
      setLeads([]);
      setCustomFieldsDefs([]);
      setDataLoading(false);
      return;
    }

    const uid = currentUser.uid;
    const email = currentUser.email || '';
    let unsubLeads = () => {};

    let unsubFields = () => {};
    let unsubUsers = () => {};

    if (!isCloudSyncEnabled) {
      // Offline mode: load from cache to save reads
      const cachedLeads = getCachedLeads();
      setLeads(cachedLeads);
      
      const cachedFields = getCachedCustomFields();
      if (cachedFields.length === 0) {
        setCustomFieldsDefs(INITIAL_CUSTOM_FIELDS);
      } else {
        setCustomFieldsDefs(cachedFields);
      }
      
      const cachedUsers = getCachedUsers();
      setAllUsers(cachedUsers);
      
      setDataLoading(false);
    } else {
      // Live Cloud mode: subscribe to database
      setDataLoading(true);
      unsubLeads = subscribeToLeads(
        uid,
        email,
        (fetchedLeads) => {
          setLeads(fetchedLeads);
          setDataLoading(false);
        },
        (err) => {
          console.warn('Leads subscription offline or failed:', err);
          setDataLoading(false);
        }
      );
      
      unsubFields = subscribeToCustomFields(uid, email, (fetchedFields) => {
        if (fetchedFields.length === 0) {
          INITIAL_CUSTOM_FIELDS.forEach((item) => {
            saveCustomFieldToFirestore(item, uid, email);
          });
        } else {
          setCustomFieldsDefs(fetchedFields);
        }
      });
      
      unsubUsers = subscribeToAllUsers((fetchedUsers) => {
        setAllUsers(fetchedUsers);
      });
    }

    return () => {
      unsubLeads();
      unsubFields();
      unsubUsers();
    };
  }, [currentUser, isCloudSyncEnabled]);

  // Sync selected lead with latest data from firestore to prevent data overwrites on save
  useEffect(() => {
    if (selectedLeadForDetail) {
      const updated = leads.find(l => l.id === selectedLeadForDetail.id);
      if (updated) {
        // Deep compare or simple referential check - react handles it well enough
        setSelectedLeadForDetail(updated);
      }
    }
  }, [leads]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setAccountFilter('ALL');
    setTagFilter('ALL');
    setBatchFilter('ALL');
    triggerToast('All search filters reset');
  };

  const isSuperAdmin = isSuperAdminEmail(currentUser?.email);

  // Collect all available user accounts
  const availableAccounts = useMemo(() => {
    if (!isSuperAdmin) {
      if (currentUser?.email) {
        return [{
          email: currentUser.email,
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'My Account',
        }];
      }
      return [];
    }

    const map = new Map<string, { email: string; uid: string; displayName?: string }>();

    if (currentUser?.email) {
      map.set(currentUser.email.toLowerCase(), {
        email: currentUser.email,
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Main Account',
      });
    }

    allUsers.forEach((u) => {
      if (u.email && u.role !== 'revoked') {
        map.set(u.email.toLowerCase(), {
          email: u.email,
          uid: u.uid || u.email,
          displayName: u.displayName,
        });
      }
    });

    leads.forEach((l) => {
      // Add from ownerEmail
      if (l.ownerEmail && !map.has(l.ownerEmail.toLowerCase())) {
        const isRevoked = allUsers.some(
          (u) => u.email?.toLowerCase() === l.ownerEmail?.toLowerCase() && u.role === 'revoked'
        );
        if (!isRevoked) {
          map.set(l.ownerEmail.toLowerCase(), {
            email: l.ownerEmail,
            uid: l.ownerId || l.ownerEmail,
            displayName: l.ownerEmail.split('@')[0],
          });
        }
      }
      
      // Add from assignedAccountEmails
      if (Array.isArray(l.assignedAccountEmails)) {
        l.assignedAccountEmails.forEach((assignedEmail) => {
          if (assignedEmail && !map.has(assignedEmail.toLowerCase())) {
            const isRevoked = allUsers.some(
              (u) => u.email?.toLowerCase() === assignedEmail.toLowerCase() && u.role === 'revoked'
            );
            if (!isRevoked) {
              map.set(assignedEmail.toLowerCase(), {
                email: assignedEmail,
                uid: assignedEmail,
                displayName: assignedEmail.split('@')[0],
              });
            }
          }
        });
      }
    });

    return Array.from(map.values());
  }, [currentUser, allUsers, leads, isSuperAdmin]);

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    leads.forEach((l) => l.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet);
  }, [leads]);

  // Collect all unique upload batches for mini pill tabs
  const uploadBatches = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; accounts: string[]; date?: string }>();
    leads.forEach((l) => {
      if (l.uploadBatchName) {
        const key = l.uploadBatchId || l.uploadBatchName;
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(key, {
            id: key,
            name: l.uploadBatchName,
            count: 1,
            accounts: l.assignedAccountEmails || (l.ownerEmail ? [l.ownerEmail] : []),
            date: l.uploadBatchDate,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [leads]);

  // Lead Status Counts for Tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: leads.length };
    leads.forEach((l) => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return counts;
  }, [leads]);

  // Filtered & Sorted Leads
  const filteredLeads = useMemo(() => {
    const result = leads.filter((lead) => {
      // Batch Filter (Mini Pill Tab)
      if (batchFilter !== 'ALL') {
        const matchBatch = lead.uploadBatchId === batchFilter || lead.uploadBatchName === batchFilter;
        if (!matchBatch) return false;
      }

      // Account Filter (for Super Admin viewing specific account)
      if (accountFilter !== 'ALL') {
        const isOwner =
          (lead.ownerEmail && lead.ownerEmail.toLowerCase() === accountFilter.toLowerCase()) ||
          (lead.assignedAccountEmails?.some((a) => a.toLowerCase() === accountFilter.toLowerCase()));
        if (!isOwner) return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL' && lead.status !== statusFilter) {
        return false;
      }

      // Tag Filter
      if (tagFilter !== 'ALL' && !lead.tags?.includes(tagFilter)) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = lead.name?.toLowerCase().includes(q) || false;
        const matchEmail = lead.email?.toLowerCase().includes(q) || false;
        const matchPhone = lead.phone?.toLowerCase().includes(q) || false;
        const matchHandle = lead.instagramHandle?.toLowerCase().includes(q) || false;
        const matchWeb = lead.website?.toLowerCase().includes(q) || false;
        const matchNotes = lead.notes?.toLowerCase().includes(q) || false;
        const matchTags = lead.tags?.some((t) => t.toLowerCase().includes(q)) || false;
        const matchOwner = lead.ownerEmail?.toLowerCase().includes(q) || false;
        const matchBatch = lead.uploadBatchName?.toLowerCase().includes(q) || false;
        const matchCustom = Object.values(lead.customFields || {}).some((v) =>
          String(v || '').toLowerCase().includes(q)
        );

        if (
          !matchName &&
          !matchEmail &&
          !matchPhone &&
          !matchHandle &&
          !matchWeb &&
          !matchNotes &&
          !matchTags &&
          !matchCustom &&
          !matchOwner &&
          !matchBatch
        ) {
          return false;
        }
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'added_last') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      }
      if (sortBy === 'contacted_last') {
        const getContactTime = (l: Lead) => {
          if (l.lastInteractionDate) {
            const t = new Date(l.lastInteractionDate).getTime();
            if (!isNaN(t)) return t;
          }
          if (l.interactions && l.interactions.length > 0) {
            const dates = l.interactions
              .map((i) => new Date(i.date).getTime())
              .filter((t) => !isNaN(t));
            if (dates.length > 0) return Math.max(...dates);
          }
          return 0; // Never contacted leads go to bottom
        };
        const timeA = getContactTime(a);
        const timeB = getContactTime(b);
        return timeB - timeA;
      }
      if (sortBy === 'modified_last') {
        const timeA = a.updatedAt
          ? new Date(a.updatedAt).getTime()
          : a.createdAt
          ? new Date(a.createdAt).getTime()
          : 0;
        const timeB = b.updatedAt
          ? new Date(b.updatedAt).getTime()
          : b.createdAt
          ? new Date(b.createdAt).getTime()
          : 0;
        return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
      }
      return 0;
    });

    return result;
  }, [leads, statusFilter, accountFilter, tagFilter, batchFilter, searchQuery, sortBy]);

  // Handlers linked to Firestore & Auth
  const handleAddLead = async (newLead: Lead) => {
    if (!currentUser) return;
    setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);
    try {
      await saveLeadToFirestore(newLead, currentUser.uid, currentUser.email || '');
      if (newLead.instagramHandle) {
        triggerToast(`Added lead @${newLead.instagramHandle}`);
      }
    } catch (err) {
      console.error('Failed to add lead:', err);
      triggerToast('Error saving lead to cloud');
    }
  };

  const handleSaveScrapedLeads = async (newLeads: Lead[]) => {
    if (!currentUser) return;
    
    setIsScraperOpen(false);
    triggerToast(`Importing ${newLeads.length} leads...`);

    const processedLeads = newLeads.map(lead => ({
      ...lead,
      ownerId: currentUser.uid,
      ownerEmail: currentUser.email || '',
      assignedAccountEmails: [currentUser.email || '']
    }));

    setLeads((prev) => [...processedLeads, ...prev]);

    try {
      for (const lead of processedLeads) {
        await saveLeadToFirestore(lead, currentUser.uid, currentUser.email || '');
      }
      triggerToast(`Successfully imported ${newLeads.length} leads from Scraper!`);
    } catch (err) {
      console.error('Error saving scraped leads:', err);
      triggerToast('Failed to save some scraped leads to cloud');
    }
  };

  const handleBackgroundScan = async (files: FileList) => {
    if (!currentUser || files.length === 0) return;
    const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    triggerToast(`Creating ${fileArray.length} lead card(s)...`);

    // Step 1: Pre-process all files and create instant placeholder leads in Firestore/UI
    const scanJobs: Array<{ tempLead: Lead; imageBase64: string }> = [];

    for (const file of fileArray) {
      try {
        const processed = await compressAndGetInstantDataUrl(file);
        if (!processed.dataUrl) continue;

        const tempId = crypto.randomUUID();
        const now = new Date().toISOString();

        const tempLead: Lead = {
          id: tempId,
          name: 'Scanning Lead...',
          instagramHandle: '',
          status: 'New',
          tags: ['Bulk Scan'],
          screenshots: [processed.dataUrl],
          notes: 'AI is extracting details in the background...',
          interactions: [],
          customFields: {},
          createdAt: now,
          updatedAt: now,
          ownerId: currentUser.uid,
          ownerEmail: currentUser.email || '',
          assignedAccountEmails: [currentUser.email || '']
        };

        // Save placeholder lead immediately to UI/DB
        setLeads((prev) => [tempLead, ...prev.filter((l) => l.id !== tempLead.id)]);
        await saveLeadToFirestore(tempLead, currentUser.uid, currentUser.email || '');
        scanJobs.push({ tempLead, imageBase64: processed.dataUrl });
      } catch (err) {
        console.error('Error creating placeholder lead:', err);
      }
    }

    if (scanJobs.length === 0) return;

    triggerToast(`Processing AI extraction for ${scanJobs.length} screenshot(s)...`);

    // Step 2: Process jobs sequentially with small rate-limit buffer & auto-retries
    let successCount = 0;

    for (let i = 0; i < scanJobs.length; i++) {
      const { tempLead, imageBase64 } = scanJobs[i];
      triggerToast(`AI Scanning ${i + 1} of ${scanJobs.length}...`);

      let extractedData: any = null;
      let attempts = 0;
      const maxAttempts = 4;

      while (attempts < maxAttempts && !extractedData) {
        attempts++;
        try {
          const res = await fetch('/api/extract-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ imageBase64 }),
          });

          if (res.status === 429) {
            // Rate limit encountered - use exponential backoff (wait longer each time)
            const waitTime = attempts * 4000;
            console.warn(`Rate limit hit on lead ${i + 1}. Waiting ${waitTime}ms...`);
            await new Promise((r) => setTimeout(r, waitTime));
            continue;
          }

          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (data && (data.name || data.handle)) {
            extractedData = data;
          } else {
            extractedData = data || {};
          }
        } catch (err) {
          console.warn(`Attempt ${attempts} failed for lead ${i + 1}:`, err);
          if (attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 2500));
          }
        }
      }

      try {
        if (extractedData && Object.keys(extractedData).length > 0) {
          const name = extractedData.name || tempLead.name;
          const handle = (extractedData.handle || '').replace(/^@/, '');
          const bioNote = extractedData.bio ? `Bio: ${extractedData.bio}` : '';
          const draftNote = extractedData.draftMessage ? `Outreach Draft:\n${extractedData.draftMessage}` : '';
          const fullNotes = [bioNote, draftNote].filter(Boolean).join('\n\n') || 'Profile scanned via AI bulk upload.';

          const updatedLead: Lead = {
            ...tempLead,
            name: name !== 'Scanning Lead...' ? name : (handle ? `@${handle}` : 'Scanned Profile'),
            instagramHandle: handle,
            website: extractedData.website || tempLead.website || '',
            notes: fullNotes,
            updatedAt: new Date().toISOString()
          };

          setLeads((prev) => [updatedLead, ...prev.filter((l) => l.id !== updatedLead.id)]);
          await saveLeadToFirestore(updatedLead, currentUser.uid, currentUser.email || '');
          successCount++;
        } else {
          // Mark as complete with fallback notes if extraction failed
          const failedLead: Lead = {
            ...tempLead,
            name: 'Scanned Image (Rate Limited)',
            notes: 'AI scan could not complete due to API rate limits (15 requests/min on free tier). Please check image quality or edit manually.',
            updatedAt: new Date().toISOString()
          };
          setLeads((prev) => [failedLead, ...prev.filter((l) => l.id !== failedLead.id)]);
          await saveLeadToFirestore(failedLead, currentUser.uid, currentUser.email || '');
        }
      } catch (err) {
        console.error('Failed to update lead in Firestore:', err);
      }

      // 4-second delay between AI calls to stay cleanly under the 15 Requests Per Minute limit of the Gemini free tier
      if (i < scanJobs.length - 1) {
        await new Promise((r) => setTimeout(r, 4000));
      }
    }

    triggerToast(`Bulk scan finished: ${successCount} of ${scanJobs.length} leads extracted!`);
  };

  const handleUpdateLead = async (updatedLead: Lead) => {
    if (!currentUser) return;
    try {
      await saveLeadToFirestore(
        updatedLead,
        updatedLead.ownerId || currentUser.uid,
        updatedLead.ownerEmail || currentUser.email || ''
      );
      triggerToast(`Saved changes for "${updatedLead.name}"`);
    } catch (err) {
      console.error('Failed to update lead:', err);
      triggerToast('Error updating lead');
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    if (!currentUser) return;
    const target = leads.find((l) => l.id === leadId);
    if (!target) return;

    const updated: Lead = {
      ...target,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveLeadToFirestore(
        updated,
        target.ownerId || currentUser.uid,
        target.ownerEmail || currentUser.email || ''
      );
      triggerToast(`Moved to ${newStatus}`);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      await deleteLeadFromFirestore(leadId);
      if (selectedLeadForDetail?.id === leadId) {
        setSelectedLeadForDetail(null);
      }
      setSelectedLeadIds((prev) => prev.filter((id) => id !== leadId));
      triggerToast('Lead removed from cloud');
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  const handleRemoveUser = async (uid: string, email: string) => {
    try {
      await removeUserAccess(uid);
      triggerToast(`Removed access for ${email}`);
    } catch (err) {
      console.error('Failed to remove user access:', err);
      triggerToast('Error removing user access');
    }
  };

  const handleToggleSelectLead = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const handleToggleSelectAll = () => {
    if (filteredLeads.length === 0) return;
    const allFilteredIds = filteredLeads.map((l) => l.id);
    const isAllSelected = allFilteredIds.every((id) => selectedLeadIds.includes(id));
    if (isAllSelected) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(allFilteredIds);
    }
  };

  
  const handleBatchEnrichLeads = async (idsToEnrich: string[]) => {
    if (!idsToEnrich.length) return;
    const leadsToEnrich = leads.filter((l) => idsToEnrich.includes(l.id) && l.website && l.website.length > 4);
    if (leadsToEnrich.length === 0) {
      triggerToast('No valid websites found to enrich in selection.');
      return;
    }
    setIsBatchEnriching(true);
    setBatchEnrichProgress({ current: 0, total: leadsToEnrich.length });
    
    let completed = 0;
    const CHUNK_SIZE = 5;
    for (let i = 0; i < leadsToEnrich.length; i += CHUNK_SIZE) {
      const chunk = leadsToEnrich.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (lead) => {
          try {
            const res = await fetch('/api/enrich-website', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: lead.website }),
            });
            const data = await res.json();
if (data.success) {
              const isJunk = (val?: string) => !val || val.trim() === '' || val.toLowerCase().includes('lead') || val.toLowerCase() === 'n/a' || val.toLowerCase() === 'unknown';
              const updates: Partial<Lead> = {};
              
              if (isJunk(lead.name) && data.brandName) {
                updates.name = data.brandName;
              }
              if (isJunk(lead.email) && data.emails && data.emails.length > 0) {
                updates.email = data.emails[0];
              }
              if (isJunk(lead.instagramHandle) && data.instagram && data.instagram.length > 0) {
                updates.instagramHandle = data.instagram[0];
              }
              if (isJunk(lead.phone) && data.phones && data.phones.length > 0) {
                updates.phone = data.phones[0];
              }
              if (Object.keys(updates).length > 0) {
                await handleUpdateLead({ ...lead, ...updates });
              }
            }
          } catch (e) {
            console.error('Enrichment failed for', lead.website, e);
          } finally {
            completed++;
            setBatchEnrichProgress({ current: completed, total: leadsToEnrich.length });
          }
        })
      );
    }
    setIsBatchEnriching(false);
    setSelectedLeadIds([]);
    triggerToast('Bulk enrichment complete.');
  };

  
  const handleBatchAssignLeads = async (idsToAssign: string[], accountEmail: string) => {
    if (!idsToAssign.length || !accountEmail) return;
    const leadsToAssign = leads.filter(l => idsToAssign.includes(l.id));
    
    // Optimistic UI update
    setLeads(prev => prev.map(l => {
      if (idsToAssign.includes(l.id)) {
        const currentAssigns = l.assignedAccountEmails || [];
        const newAssigns = currentAssigns.includes(accountEmail) ? currentAssigns : [...currentAssigns, accountEmail];
        return { ...l, assignedAccountEmails: newAssigns };
      }
      return l;
    }));
    
    // Update DB
    let updatedCount = 0;
    for (const l of leadsToAssign) {
      const currentAssigns = l.assignedAccountEmails || [];
      if (!currentAssigns.includes(accountEmail)) {
        await handleUpdateLead({ ...l, assignedAccountEmails: [...currentAssigns, accountEmail] });
        updatedCount++;
      }
    }
    
    setSelectedLeadIds([]);
    triggerToast(`Assigned ${updatedCount} leads to ${accountEmail}`);
  };

  const handleBatchDeleteLeads = async (idsToDelete: string[]) => {


    if (!idsToDelete.length) return;
    if (
      !window.confirm(
        `Are you sure you want to PERMANENTLY delete ${idsToDelete.length} lead(s)? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      // 1. Instantly remove from React state & local storage
      setLeads((prev) => {
        const updated = prev.filter((l) => !idsToDelete.includes(l.id));
        try {
          localStorage.setItem('crm_cached_leads', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });
      setSelectedLeadIds([]);

      // 2. Asynchronously delete from Firestore
      for (const id of idsToDelete) {
        await deleteLeadFromFirestore(id);
      }
      triggerToast(`Permanently deleted ${idsToDelete.length} lead(s)`);
    } catch (err) {
      console.error('Error batch deleting leads:', err);
      triggerToast('Error deleting selected leads');
    }
  };

  const handleRenameBatch = async (batchIdOrOldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    let updatedCount = 0;
    const updatedLeads = leads.map((l) => {
      if (l.uploadBatchId === batchIdOrOldName || l.uploadBatchName === batchIdOrOldName) {
        updatedCount++;
        return {
          ...l,
          uploadBatchName: trimmed,
          updatedAt: new Date().toISOString(),
        };
      }
      return l;
    });

    if (updatedCount === 0) return;

    // Instantly update state & local storage
    setLeads(updatedLeads);
    try {
      localStorage.setItem('crm_cached_leads', JSON.stringify(updatedLeads));
    } catch (e) {}

    // Asynchronously update Firestore for all affected leads
    if (currentUser) {
      const affected = updatedLeads.filter(
        (l) => l.uploadBatchId === batchIdOrOldName || l.uploadBatchName === trimmed
      );
      for (const lead of affected) {
        await saveLeadToFirestore(
          lead,
          lead.ownerId || currentUser.uid,
          lead.ownerEmail || currentUser.email || ''
        );
      }
    }

    triggerToast(`Renamed batch to "${trimmed}" (${updatedCount} lead${updatedCount === 1 ? '' : 's'} updated)`);
    setRenamingBatch(null);
    setNewBatchNameInput('');
  };

  const handleAddInteraction = async (leadId: string, interaction: Interaction) => {
    if (!currentUser) return;
    const target = leads.find((l) => l.id === leadId);
    if (!target) return;

    const updated: Lead = {
      ...target,
      interactions: [interaction, ...(target.interactions || [])],
      lastInteractionDate: interaction.date,
      updatedAt: new Date().toISOString(),
    };

    try {
      await saveLeadToFirestore(
        updated,
        target.ownerId || currentUser.uid,
        target.ownerEmail || currentUser.email || ''
      );
      triggerToast(`Interaction logged (${interaction.type})`);
    } catch (err) {
      console.error('Failed to add interaction:', err);
    }
  };

  const handleImportLeads = async (newLeads: Lead[]) => {
    if (!currentUser) return;
    try {
      // 1. Immediately update React state & local storage so imported leads show up on screen instantly!
      setLeads((prev) => {
        const existingIds = new Set(prev.map((l) => l.id));
        const deduplicatedNew = newLeads.filter((l) => !existingIds.has(l.id));
        const updatedList = [...deduplicatedNew, ...prev];
        try {
          localStorage.setItem('crm_cached_leads', JSON.stringify(updatedList));
        } catch (e) {}
        return updatedList;
      });

      // 2. Clear filters so newly imported leads are not hidden by account or search filters
      setAccountFilter('ALL');
      setStatusFilter('ALL');
      setSearchQuery('');

      // 3. Save each lead asynchronously to Firestore and local persistent storage
      for (const item of newLeads) {
        await saveLeadToFirestore(item, currentUser.uid, currentUser.email || '');
      }

      const batchTitle = newLeads[0]?.uploadBatchName;
      if (batchTitle) {
        triggerToast(`Imported ${newLeads.length} leads in batch "${batchTitle}"!`);
        if (newLeads[0]?.uploadBatchId) {
          setBatchFilter(newLeads[0].uploadBatchId);
        }
      } else {
        triggerToast(`Imported ${newLeads.length} leads successfully!`);
      }
    } catch (err) {
      console.error('Error importing leads:', err);
      triggerToast('Error saving imported leads');
    }
  };

  const handleAddCustomField = async (field: CustomFieldDefinition) => {
    if (!currentUser) return;
    try {
      await saveCustomFieldToFirestore(field, currentUser.uid, currentUser.email || '');
      triggerToast(`Created field "${field.name}"`);
    } catch (err) {
      console.error('Error adding custom field:', err);
    }
  };

  const handleDeleteCustomField = async (fieldId: string) => {
    try {
      await deleteCustomFieldFromFirestore(fieldId);
      triggerToast('Custom field removed');
    } catch (err) {
      console.error('Error deleting custom field:', err);
    }
  };

  // Auth Screen Guard
  if (authLoading) {
    return (
      <div
        className={`min-h-screen ${
          isDarkMode ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900'
        } flex flex-col items-center justify-center font-sans gap-3`}
      >
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
        <span className="text-xs font-semibold text-zinc-500">Loading Assix CRM...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen isDarkMode={isDarkMode} />;
  }

  return (
    <div
      className={`min-h-screen font-sans ${
        isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
      } flex flex-col selection:bg-rose-500 selection:text-white transition-colors duration-150`}
    >
      {/* Header */}
      {!fullCanvasMode && (
        <Header
          onOpenAddLead={() => setIsAddLeadOpen(true)}
          onBackgroundScan={handleBackgroundScan}
          onOpenImportExport={() => setIsImportExportOpen(true)}
          onOpenCustomFields={() => setIsCustomFieldsOpen(true)}
          onOpenScraper={() => setIsScraperOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          tagFilter={tagFilter}
          onTagFilterChange={setTagFilter}
          allTags={allTags}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onResetFilters={handleResetFilters}
          fullCanvasMode={fullCanvasMode}
          onToggleFullCanvas={() => setFullCanvasMode(!fullCanvasMode)}
          currentUserEmail={currentUser.email}
          isSuperAdmin={isSuperAdmin}
          onSignOut={signOutUser}
          onOpenAccountsDirectory={() => setIsAccountsOpen(true)}
          onOpenAppleCampaign={() => setIsAppleCampaignOpen(true)}
          onOpenProspectDiscovery={() => setIsProspectDiscoveryOpen(true)}
          onOpenCallSimulator={() => {
            setCallSimulatorTargetLead(null);
            setIsCallSimulatorOpen(true);
          }}
          onOpenVoiceNotes={() => setIsVoiceNoteModalOpen(true)}
          isCloudSyncEnabled={isCloudSyncEnabled}
          onToggleCloudSync={() => setIsCloudSyncEnabled(!isCloudSyncEnabled)}
          activePage={activePage}
          onPageChange={setActivePage}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold text-xs shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom-2 duration-200">
          <Sparkles className="w-4 h-4 text-rose-500" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto">
        {/* Upload Batches Tabs Bar (Single-row scrollable on mobile with minimized unselected tabs) */}
        {uploadBatches.length > 0 && (
          <div className="mb-3.5 flex items-center gap-1.5 sm:gap-2 w-full overflow-x-auto no-scrollbar scrollbar-none pb-1 animate-in fade-in duration-150">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1 mr-0.5 shrink-0">
              <FolderOpen className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Batches:</span>
            </span>
            <button
              onClick={() => setBatchFilter('ALL')}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer ${
                batchFilter === 'ALL'
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs ring-1 ring-zinc-900/20 dark:ring-white/20'
                  : 'bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <span>All</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 sm:py-0.5 rounded-md font-extrabold ${
                  batchFilter === 'ALL'
                    ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {leads.length}
              </span>
            </button>

            {uploadBatches.map((b) => {
              const isSelected = batchFilter === b.id || batchFilter === b.name;
              return (
                <div key={b.id} className="relative group/batch inline-flex items-center shrink-0">
                  <button
                    onClick={() => setBatchFilter(isSelected ? 'ALL' : b.id)}
                    className={`rounded-xl transition-all flex items-center gap-1 sm:gap-1.5 shrink-0 cursor-pointer ${
                      isSelected
                        ? 'px-3 py-1 sm:py-1.5 text-xs font-bold bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-xs ring-2 ring-rose-500/30'
                        : 'px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-rose-500'}`} />
                    <span className={`truncate ${isSelected ? 'max-w-[140px] sm:max-w-[200px]' : 'max-w-[70px] sm:max-w-[140px]'}`}>
                      {b.name}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {b.count}
                    </span>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingBatch({ id: b.id, name: b.name });
                        setNewBatchNameInput(b.name);
                      }}
                      className={`p-0.5 rounded-md transition-all cursor-pointer ${
                        isSelected
                          ? 'text-white/80 hover:text-white hover:bg-white/20'
                          : 'hidden group-hover/batch:inline-flex text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                      title={`Rename batch "${b.name}"`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>

                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBatchFilter('ALL');
                        }}
                        className="p-0.5 text-white/80 hover:text-white ml-0.5 cursor-pointer"
                        title="Clear batch filter"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Minimized Controls Bar: Team Tab */}
        {availableAccounts.length > 0 && (
          <div className="mb-4 flex items-center justify-between gap-2.5 w-full animate-in fade-in duration-150">
            <div className="inline-flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
              {/* Team Tab Selector */}
              <div className="inline-flex items-center min-w-0 gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl text-zinc-700 dark:text-zinc-300 text-xs">
                <Users className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider shrink-0">Team:</span>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none cursor-pointer pr-1 truncate min-w-0"
                >
                  <option value="ALL">All Members ({leads.length})</option>
                  {availableAccounts.map((acc) => {
                    const accLeadCount = leads.filter(
                      (l) =>
                        (l.ownerEmail && l.ownerEmail.toLowerCase() === acc.email.toLowerCase()) ||
                        l.assignedAccountEmails?.some((a) => a.toLowerCase() === acc.email.toLowerCase())
                    ).length;
                    const displayName = acc.displayName || acc.email.split('@')[0];
                    return (
                      <option key={acc.uid || acc.email} value={acc.email}>
                        {displayName} ({accLeadCount})
                      </option>
                    );
                  })}
                </select>
                {accountFilter !== 'ALL' && (
                  <button
                    onClick={() => setAccountFilter('ALL')}
                    className="p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer shrink-0"
                    title="Clear team filter"
                  >
                    <X className="w-3 h-3 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workspace Quick Metrics */}
        {leads.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                Showing <strong className="text-zinc-900 dark:text-white">{filteredLeads.length}</strong> of{' '}
                <strong className="text-zinc-900 dark:text-white">{leads.length}</strong> Leads
              </span>

              {batchFilter !== 'ALL' && (
                <span className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold text-[11px] flex items-center gap-1.5">
                  <FolderOpen className="w-3 h-3 text-rose-500" />
                  <span>Batch: <strong>{uploadBatches.find((b) => b.id === batchFilter)?.name || batchFilter}</strong></span>
                  <button
                    onClick={() => {
                      const found = uploadBatches.find((b) => b.id === batchFilter || b.name === batchFilter);
                      const bId = found?.id || batchFilter;
                      const bName = found?.name || batchFilter;
                      setRenamingBatch({ id: bId, name: bName });
                      setNewBatchNameInput(bName);
                    }}
                    className="p-0.5 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-md transition-colors cursor-pointer text-rose-600 dark:text-rose-400 flex items-center gap-0.5 ml-0.5"
                    title="Rename this batch"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setBatchFilter('ALL')}
                    className="p-0.5 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-md transition-colors cursor-pointer"
                    title="View All Uploads"
                  >
                    <X className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  </button>
                </span>
              )}

              {accountFilter !== 'ALL' && (
                <span className="px-2.5 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 font-bold text-[11px] flex items-center gap-1.5">
                  <span>Account: <strong>{accountFilter}</strong></span>
                  <button
                    onClick={() => setAccountFilter('ALL')}
                    className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors cursor-pointer"
                    title="View All Accounts Data"
                  >
                    <X className="w-3 h-3 text-zinc-600 dark:text-zinc-400" />
                  </button>
                </span>
              )}

              {(searchQuery || statusFilter !== 'ALL' || batchFilter !== 'ALL' || tagFilter !== 'ALL' || accountFilter !== 'ALL') && (
                <button
                  onClick={handleResetFilters}
                  className="px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-[11px] transition-colors flex items-center gap-1"
                >
                  <FilterX className="w-3 h-3" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>

            {/* Quick Status Bar */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] font-medium flex-wrap">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                }`}
              >
                All Statuses ({leads.length})
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === 'New' ? 'ALL' : 'New')}
                className={`px-2.5 py-1 rounded-full text-blue-700 dark:text-blue-400 border transition-colors cursor-pointer ${
                  statusFilter === 'New'
                    ? 'bg-blue-600 text-white dark:bg-blue-500 font-bold border-blue-600'
                    : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 border-blue-200 dark:border-blue-500/20'
                }`}
              >
                New: <strong>{leads.filter((l) => l.status === 'New').length}</strong>
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === 'Follow Up' ? 'ALL' : 'Follow Up')}
                className={`px-2.5 py-1 rounded-full text-amber-700 dark:text-amber-400 border transition-colors cursor-pointer ${
                  statusFilter === 'Follow Up'
                    ? 'bg-amber-600 text-white dark:bg-amber-500 font-bold border-amber-600'
                    : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/10 dark:hover:bg-amber-500/20 border-amber-200 dark:border-amber-500/20'
                }`}
              >
                Waiting:{' '}
                <strong>
                  {
                    leads.filter(
                      (l) =>
                        l.status === 'Contacted' ||
                        l.status === 'Follow Up' ||
                        l.status === 'Responded'
                    ).length
                  }
                </strong>
              </button>
              <button
                onClick={() => setStatusFilter(statusFilter === 'Interested' ? 'ALL' : 'Interested')}
                className={`px-2.5 py-1 rounded-full text-pink-700 dark:text-pink-400 border transition-colors cursor-pointer ${
                  statusFilter === 'Interested'
                    ? 'bg-pink-600 text-white dark:bg-pink-500 font-bold border-pink-600'
                    : 'bg-pink-50 hover:bg-pink-100 dark:bg-pink-500/10 dark:hover:bg-pink-500/20 border-pink-200 dark:border-pink-500/20'
                }`}
              >
                Interested: <strong>{leads.filter((l) => l.status === 'Interested').length}</strong>
              </button>
            </div>
          </div>
        )}

        {/* Content Section */}
        {dataLoading ? (
          <div className="my-16 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <Loader2 className="w-7 h-7 text-rose-500 animate-spin" />
            <span className="text-xs font-semibold">Syncing Firestore Cloud Database...</span>
          </div>
        ) : leads.length === 0 ? (
          <div className="my-12 p-12 max-w-xl mx-auto rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 shadow-xl text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 mb-4">
              <Instagram className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
              No Instagram Leads Saved
            </h2>
            <p className="text-xs text-zinc-500 max-w-sm mb-6 leading-relaxed">
              Start building your pipeline by adding prospects. All leads are securely saved to your account in Firestore.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setIsAddLeadOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs shadow-md shadow-rose-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add First IG Lead</span>
              </button>

              <button
                onClick={() => setIsImportExportOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                <span>Import CSV / JSON</span>
              </button>
            </div>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="my-12 p-12 max-w-md mx-auto rounded-3xl bg-white dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 shadow-lg text-center flex flex-col items-center">
            <FilterX className="w-12 h-12 text-zinc-400 mb-3" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
              No Matching Leads Found
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              You have {leads.length} lead(s) saved, but none match the currently active search or account filter ({accountFilter !== 'ALL' ? `Account: ${accountFilter}` : 'Filters active'}).
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold text-xs cursor-pointer"
              >
                Show All {leads.length} Leads
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            {viewMode === 'table' && (
              <TableView
                leads={filteredLeads}
                selectedLeadIds={selectedLeadIds}
                onToggleSelectLead={handleToggleSelectLead}
                onToggleSelectAll={handleToggleSelectAll}
                
                
                onBatchDeleteLeads={handleBatchDeleteLeads}
                onBatchEnrichLeads={handleBatchEnrichLeads}
                onBatchAssignLeads={handleBatchAssignLeads}
                availableAccounts={availableAccounts}

                isBatchEnriching={isBatchEnriching}
                batchEnrichProgress={batchEnrichProgress}

                onUpdateLead={handleUpdateLead}
                onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
                onUpdateStatus={handleUpdateStatus}
                onOpenInteractionModal={(lead) => setSelectedLeadForInteraction(lead)}
                onShareLead={(lead) => setShareTargetLead(lead)}
                onDeleteLead={handleDeleteLead}
                onOpenAppleCampaign={() => setIsAppleCampaignOpen(true)}
                onOpenScreenshotLightbox={(lead, idx) =>
                  setLightboxTarget({ lead, imageIndex: idx })
                }
                onOpenLiveCoPilot={(lead) => setLiveCoPilotTargetLead(lead)}
                onOpenVideoPitch={(lead) => setVideoPitchTargetLead(lead)}
                onOpenCallSimulator={(lead) => {
                  setCallSimulatorTargetLead(lead);
                  setIsCallSimulatorOpen(true);
                }}
                isDarkMode={isDarkMode}
                isSuperAdmin={isSuperAdmin}
              />
            )}
            {viewMode === 'kanban' && (
              <PipelineView
                leads={filteredLeads}
                onUpdateLead={handleUpdateLead}
                onSelectLead={(lead) => setSelectedLeadForDetail(lead)}
                onUpdateStatus={handleUpdateStatus}
                onOpenInteractionModal={(lead) => setSelectedLeadForInteraction(lead)}
                onShareLead={(lead) => setShareTargetLead(lead)}
                onOpenScreenshotLightbox={(lead, idx) =>
                  setLightboxTarget({ lead, imageIndex: idx })
                }
                onOpenLiveCoPilot={(lead) => setLiveCoPilotTargetLead(lead)}
                onOpenVideoPitch={(lead) => setVideoPitchTargetLead(lead)}
                onOpenCallSimulator={(lead) => {
                  setCallSimulatorTargetLead(lead);
                  setIsCallSimulatorOpen(true);
                }}
                isDarkMode={isDarkMode}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      {selectedLeadForDetail && (
        <LeadDetailDrawer
          lead={selectedLeadForDetail}
          customFieldsDefs={customFieldsDefs}
          availableAccounts={availableAccounts}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setSelectedLeadForDetail(null)}
          onSaveLead={handleUpdateLead}
          onDeleteLead={handleDeleteLead}
          onShareLead={(lead) => setShareTargetLead(lead)}
          onOpenScreenshotLightbox={(lead, idx) =>
            setLightboxTarget({ lead, imageIndex: idx })
          }
          onOpenLiveCoPilot={(lead) => setLiveCoPilotTargetLead(lead)}
          onOpenVideoPitch={(lead) => setVideoPitchTargetLead(lead)}
          onOpenCallSimulator={(lead) => {
            setCallSimulatorTargetLead(lead);
            setIsCallSimulatorOpen(true);
          }}
          isDarkMode={isDarkMode}
          existingBatches={uploadBatches}
          onRenameBatch={handleRenameBatch}
        />
      )}

      {/* Rename Batch Modal */}
      {renamingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs font-sans animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Rename Lead Batch</h3>
                  <p className="text-[11px] text-zinc-500">Currently: {renamingBatch.name}</p>
                </div>
              </div>
              <button
                onClick={() => setRenamingBatch(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  New Batch Title
                </label>
                <input
                  type="text"
                  value={newBatchNameInput}
                  onChange={(e) => setNewBatchNameInput(e.target.value)}
                  placeholder="Enter new batch title..."
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  autoFocus
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-800/40 text-[11px] text-rose-700 dark:text-rose-300">
                This will update the batch name across all leads currently belonging to <strong>{renamingBatch.name}</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenamingBatch(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleRenameBatch(renamingBatch.id, newBatchNameInput)}
                  disabled={!newBatchNameInput.trim() || newBatchNameInput.trim() === renamingBatch.name}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm disabled:opacity-50 transition-all cursor-pointer"
                >
                  Save Batch Name
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddLeadOpen && (
        <AddLeadModal
          customFieldsDefs={customFieldsDefs}
          availableAccounts={availableAccounts}
          existingBatches={uploadBatches.map((b) => b.name)}
          currentUserEmail={currentUser?.email}
          currentUserUid={currentUser?.uid}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setIsAddLeadOpen(false)}
          onAddLead={handleAddLead}
          isDarkMode={isDarkMode}
        />
      )}

      {selectedLeadForInteraction && (
        <InteractionModal
          lead={selectedLeadForInteraction}
          onClose={() => setSelectedLeadForInteraction(null)}
          onAddInteraction={handleAddInteraction}
          isDarkMode={isDarkMode}
        />
      )}

      {shareTargetLead && (
        <ShareModal
          lead={shareTargetLead}
          onClose={() => setShareTargetLead(null)}
          isDarkMode={isDarkMode}
        />
      )}

      
      {isScraperOpen && (
        <LeadScraperModal
          onClose={() => setIsScraperOpen(false)}
          onSaveLeads={handleSaveScrapedLeads}
        />
      )}

      {isImportExportOpen && (
        <ImportExportModal
          leads={leads}
          onClose={() => setIsImportExportOpen(false)}
          onImportLeads={handleImportLeads}
          isDarkMode={isDarkMode}
          availableAccounts={availableAccounts}
          currentUserEmail={currentUser?.email || ''}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {isCustomFieldsOpen && (
        <CustomFieldsModal
          customFieldsDefs={customFieldsDefs}
          onClose={() => setIsCustomFieldsOpen(false)}
          onAddCustomField={handleAddCustomField}
          onDeleteCustomField={handleDeleteCustomField}
          isDarkMode={isDarkMode}
        />
      )}

      {isAccountsOpen && (
        <AccountsModal
          users={availableAccounts}
          leads={leads}
          selectedAccountFilter={accountFilter}
          onSelectAccountFilter={setAccountFilter}
          onRemoveUser={handleRemoveUser}
          onClose={() => setIsAccountsOpen(false)}
          isDarkMode={isDarkMode}
        />
      )}

      {isAppleCampaignOpen && (
        <AppleCampaignModal
          leads={leads}
          selectedLeadIds={selectedLeadIds}
          onClose={() => setIsAppleCampaignOpen(false)}
          onUpdateLead={handleUpdateLead}
        />
      )}

      {isProspectDiscoveryOpen && (
        <ProspectDiscovery
          onClose={() => setIsProspectDiscoveryOpen(false)}
          onSaveLead={handleAddLead}
        />
      )}

      {lightboxTarget && (
        <ScreenshotLightbox
          lead={lightboxTarget.lead}
          initialIndex={lightboxTarget.imageIndex}
          onClose={() => setLightboxTarget(null)}
          isDarkMode={isDarkMode}
        />
      )}

      {/* Video Pitch Cinematic Watch Portal (when ?watch=pitch_id is detected) */}
      {watchPitchId && (
        <VideoPitchWatchPortal
          pitchId={watchPitchId}
          lead={leads.find((l) => l.videoPitchTracking?.pitchId === watchPitchId || l.id === watchPitchId) || null}
          onExitPreview={() => {
            setWatchPitchId(null);
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('watch');
              window.history.pushState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
            } catch (e) {
              window.location.hash = '';
            }
          }}
        />
      )}

      {/* AI Call Simulator Modal */}
      {isCallSimulatorOpen && (
        <CallSimulatorModal
          isOpen={isCallSimulatorOpen}
          onClose={() => {
            setIsCallSimulatorOpen(false);
            setCallSimulatorTargetLead(null);
          }}
          leads={leads}
          currentLead={callSimulatorTargetLead}
          onSavePracticeNote={(leadId, note) => {
            const target = leads.find((l) => l.id === leadId);
            if (target) {
              const updated = {
                ...target,
                notes: (target.notes ? target.notes + '\n\n' : '') + `[AI Call Practice]: ${note}`,
              };
              handleUpdateLead(updated);
            }
          }}
        />
      )}

      {/* AI Live Call Co-Pilot Teleprompter Modal */}
      {liveCoPilotTargetLead && (
        <LiveCallCoPilotModal
          lead={liveCoPilotTargetLead}
          isOpen={!!liveCoPilotTargetLead}
          onClose={() => setLiveCoPilotTargetLead(null)}
          onSaveCallOutcome={handleUpdateLead}
        />
      )}

      {/* AI Video Pitch & iMessage Tracker Modal */}
      {videoPitchTargetLead && (
        <AIVideoPitchModal
          lead={videoPitchTargetLead}
          isOpen={!!videoPitchTargetLead}
          onClose={() => setVideoPitchTargetLead(null)}
          onUpdateLead={handleUpdateLead}
        />
      )}

      {/* AI Voice Note Campaigns */}
      <AIVoiceNoteModal
        isOpen={isVoiceNoteModalOpen}
        onClose={() => setIsVoiceNoteModalOpen(false)}
        leads={leads}
      />

      <ChatWidget
        currentUser={currentUser}
        isSuperAdmin={isSuperAdmin}
        availableAccounts={availableAccounts}
        leads={leads}
        isDarkMode={isDarkMode}
        isCloudSyncEnabled={isCloudSyncEnabled}
      />
      <SWRegister />
    </div>
  );
}
