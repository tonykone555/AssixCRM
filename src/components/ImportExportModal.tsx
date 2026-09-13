import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  Check,
  AlertCircle,
  FileText,
  Users,
  Layers,
  FolderOpen,
  Shield,
  CheckSquare,
  Square,
  Mail,
  Phone,
} from 'lucide-react';
import { Lead } from '../types';
import { AccountOption } from './AddLeadModal';
import {
  exportLeadsToCSV,
  downloadSampleCSVTemplate,
  parseCSVToLeads,
} from '../utils/csvUtils';

export interface UploadBatchInfo {
  id: string;
  name: string;
  count: number;
  date?: string;
}

interface ImportExportModalProps {
  leads: Lead[];
  onClose: () => void;
  onImportLeads: (newLeads: Lead[]) => void;
  isDarkMode: boolean;
  availableAccounts?: AccountOption[];
  currentUserEmail?: string;
  isSuperAdmin?: boolean;
  existingBatches?: UploadBatchInfo[];
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  leads,
  onClose,
  onImportLeads,
  availableAccounts = [],
  currentUserEmail,
  isSuperAdmin = false,
  existingBatches = [],
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<Lead[]>([]);
  const [rawCSVText, setRawCSVText] = useState<string>('');
  const [isNormalLead, setIsNormalLead] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Multi-account assignment selection state
  const [selectedAccountEmails, setSelectedAccountEmails] = useState<string[]>([]);
  
  // Batch assignment state (New vs Existing)
  const [batchMode, setBatchMode] = useState<'new' | 'existing'>(
    existingBatches && existingBatches.length > 0 ? 'existing' : 'new'
  );
  const [batchName, setBatchName] = useState<string>('');
  const [selectedExistingBatchId, setSelectedExistingBatchId] = useState<string>(
    existingBatches && existingBatches.length > 0 ? existingBatches[0].id : ''
  );

  // Enrichment state
  const [autoEnrich, setAutoEnrich] = useState<boolean>(true);
  const [isEnriching, setIsEnriching] = useState<boolean>(false);
  const [enrichProgress, setEnrichProgress] = useState<{current: number, total: number}>({ current: 0, total: 0 });

  // Initialize selected accounts when availableAccounts loads or changes
  useEffect(() => {
    if (availableAccounts.length > 0) {
      // By default select all available accounts so everyone gets access
      setSelectedAccountEmails(availableAccounts.map((a) => a.email));
    } else if (currentUserEmail) {
      setSelectedAccountEmails([currentUserEmail]);
    }
  }, [availableAccounts, currentUserEmail]);

  const handleToggleNormalLead = (checked: boolean) => {
    setIsNormalLead(checked);
    if (rawCSVText) {
      try {
        const reParsed = parseCSVToLeads(rawCSVText, { isNormalLead: checked });
        setParsedLeads(reParsed);
        setSuccessMsg(`Parsed ${reParsed.length} lead(s) as ${checked ? 'Normal Leads' : 'Instagram Leads'}.`);
      } catch (err) {
        // keep current
      }
    }
  };

  const handleFile = (file: File) => {
    setError(null);
    setSuccessMsg(null);

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setError('Please upload a valid .csv file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        setRawCSVText(text);
        const imported = parseCSVToLeads(text, { isNormalLead });
        if (imported.length === 0) {
          setError('No valid rows or leads found in this CSV file.');
        } else {
          setParsedLeads(imported);
          const cleanFileName = file.name.replace(/\.[^/.]+$/, '');
          const defaultName = `${cleanFileName} (${imported.length} leads)`;
          setBatchName(defaultName);
          setSuccessMsg(`Successfully parsed ${imported.length} ${isNormalLead ? 'normal' : 'Instagram'} lead(s) from ${file.name}.`);
        }
      } catch (err) {
        setError('Failed to parse CSV. Please check formatting.');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const toggleAccountSelection = (email: string) => {
    if (selectedAccountEmails.includes(email)) {
      if (selectedAccountEmails.length === 1) return; // keep at least 1 account selected
      setSelectedAccountEmails(selectedAccountEmails.filter((e) => e !== email));
    } else {
      setSelectedAccountEmails([...selectedAccountEmails, email]);
    }
  };

  const handleSelectAllAccounts = () => {
    if (availableAccounts.length > 0) {
      setSelectedAccountEmails(availableAccounts.map((a) => a.email));
    }
  };

  const handleConfirmImport = async () => {
    if (parsedLeads.length > 0) {
      let batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      let finalBatchName = batchName.trim() || `Upload - ${new Date().toLocaleDateString()}`;

      if (batchMode === 'existing' && selectedExistingBatchId) {
        const found = existingBatches.find((b) => b.id === selectedExistingBatchId || b.name === selectedExistingBatchId);
        if (found) {
          batchId = found.id;
          finalBatchName = found.name;
        }
      }

      const finalAssigned = selectedAccountEmails.length > 0
        ? selectedAccountEmails
        : (currentUserEmail ? [currentUserEmail] : []);

      let enrichedLeads: Lead[] = parsedLeads.map((lead) => ({
        ...lead,
        isNormalLead: isNormalLead || Boolean(lead.isNormalLead),
        uploadBatchId: batchId,
        uploadBatchName: finalBatchName,
        uploadBatchDate: new Date().toISOString(),
        assignedAccountEmails: finalAssigned,
        ownerEmail: finalAssigned[0] || lead.ownerEmail || currentUserEmail || 'tonykone21@gmail.com',
      }));

      // --- AUTO-ENRICHMENT LOGIC ---
      if (autoEnrich) {
        setIsEnriching(true);
        const leadsToEnrich = enrichedLeads.filter(l => l.website && l.website.length > 4);
        setEnrichProgress({ current: 0, total: leadsToEnrich.length });
        
        let completed = 0;
        // Process in chunks of 5 to avoid overwhelming the server
        const CHUNK_SIZE = 5;
        for (let i = 0; i < leadsToEnrich.length; i += CHUNK_SIZE) {
          const chunk = leadsToEnrich.slice(i, i + CHUNK_SIZE);
          await Promise.all(chunk.map(async (lead) => {
            try {
              const res = await fetch('/api/enrich-website', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: lead.website })
              });
              const data = await res.json();
              if (data.success) {
                // Update the lead in the main array
                const index = enrichedLeads.findIndex(l => l.id === lead.id);
                if (index !== -1) {
                  const currentLead = enrichedLeads[index];
                  // Only overwrite if it doesn't already have one
                  if (!currentLead.email && data.emails && data.emails.length > 0) {
                    currentLead.email = data.emails[0];
                  }
                  if (!currentLead.instagramHandle && data.instagram && data.instagram.length > 0) {
                    currentLead.instagramHandle = data.instagram[0];
                  }
                  if (!currentLead.phone && data.phones && data.phones.length > 0) {
                    currentLead.phone = data.phones[0];
                  }
                }
              }
            } catch (e) {
              console.error('Enrichment failed for', lead.website, e);
            } finally {
              completed++;
              setEnrichProgress({ current: completed, total: leadsToEnrich.length });
            }
          }));
        }
        setIsEnriching(false);
      }

      onImportLeads(enrichedLeads);
      onClose();
    }
  };

  const handleExportAll = () => {
    exportLeadsToCSV(leads, `crm_leads_export_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leads, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `crm_leads_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleJSONFile = (file: File) => {
    setError(null);
    setSuccessMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          onImportLeads(parsed);
          setSuccessMsg(`Successfully restored ${parsed.length} leads from JSON backup!`);
        } else {
          setError('Invalid JSON backup format.');
        }
      } catch (err) {
        setError('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs font-sans animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">CSV Data Manager</h3>
              <p className="text-xs text-zinc-500">Import or export your Instagram prospect lists</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 text-xs font-medium">
          {/* Export Section */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h4 className="font-semibold text-sm text-zinc-900 dark:text-white">Export & Backup Leads</h4>
              <p className="text-xs text-zinc-500">Download all {leads.length} lead(s) as CSV spreadsheet or JSON backup.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportAll}
                disabled={leads.length === 0}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={handleExportJSON}
                disabled={leads.length === 0}
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 disabled:opacity-40 text-white font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON Backup</span>
              </button>
            </div>
          </div>

          {/* Normal Leads Checkbox Option */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 transition-colors">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                id="normal-lead-checkbox"
                checked={isNormalLead}
                onChange={(e) => handleToggleNormalLead(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500/20 border-zinc-300 dark:border-zinc-700 cursor-pointer accent-rose-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs text-zinc-900 dark:text-white">
                    Import as Normal Leads (Not Instagram Leads)
                  </span>
                  <span className="text-[10px] px-2 py-0.2 rounded-md font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Phone & Email Ready
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  Extracts direct phone numbers and contact emails into standard lead profiles without requiring Instagram accounts or handles.
                </p>
              </div>
            </label>
          </div>

          {/* Import Dropzone */}
          <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <label className="font-semibold text-xs text-zinc-900 dark:text-white">
                Import CSV File
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadSampleCSVTemplate('real_estate')}
                  className="text-xs text-rose-500 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  title="Download CSV with Real Estate, Facebook, LinkedIn, Zillow & Outreach fields"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>🏡 Real Estate CSV Template</span>
                </button>
                <button
                  onClick={() => downloadSampleCSVTemplate(isNormalLead ? 'normal' : 'instagram')}
                  className="text-xs text-zinc-500 dark:text-zinc-400 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>({isNormalLead ? 'Normal' : 'IG'} Template)</span>
                </button>
              </div>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`p-6 border-2 border-dashed rounded-2xl text-center transition-all ${
                dragActive
                  ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20'
                  : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30'
              }`}
            >
              <Upload className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
                Drag & Drop CSV or JSON Backup file here
              </p>
              <p className="text-xs text-zinc-500 mb-3">or browse from your device (.csv or .json)</p>

              <div className="flex justify-center gap-2">
                <label className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold cursor-pointer transition-colors inline-block">
                  <span>Browse CSV / JSON</span>
                  <input
                    type="file"
                    accept=".csv,.txt,.json"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        if (file.name.endsWith('.json')) {
                          handleJSONFile(file);
                        } else {
                          handleFile(file);
                        }
                      }
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Configuration for parsed leads */}
          {parsedLeads.length > 0 && (
            <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-800 animate-in fade-in duration-200">
              {/* 1. Batch Assignment: Existing vs New Batch */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-rose-500" />
                    <span>Upload Batch Assignment</span>
                  </label>

                  {existingBatches && existingBatches.length > 0 && (
                    <div className="flex items-center gap-1 p-0.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setBatchMode('existing')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          batchMode === 'existing'
                            ? 'bg-white dark:bg-zinc-950 text-rose-600 dark:text-rose-400 shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        📁 Existing Batch ({existingBatches.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchMode('new')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                          batchMode === 'new'
                            ? 'bg-white dark:bg-zinc-950 text-rose-600 dark:text-rose-400 shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        ➕ New Batch
                      </button>
                    </div>
                  )}
                </div>

                {batchMode === 'existing' && existingBatches && existingBatches.length > 0 ? (
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                      Add these {parsedLeads.length} leads directly into an existing batch:
                    </label>
                    <select
                      value={selectedExistingBatchId}
                      onChange={(e) => setSelectedExistingBatchId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 cursor-pointer"
                    >
                      {existingBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          📁 {b.name} ({b.count} existing leads)
                        </option>
                      ))}
                    </select>

                    {/* Quick Pick Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-zinc-400 font-medium">Quick Pick:</span>
                      {existingBatches.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setBatchMode('existing');
                            setSelectedExistingBatchId(b.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            selectedExistingBatchId === b.id && batchMode === 'existing'
                              ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
                              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-rose-400'
                          }`}
                        >
                          {b.name} ({b.count})
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      placeholder="e.g. Real Estate Houston Batch 1"
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                    />
                    <p className="text-[11px] text-zinc-500">
                      Creates a dedicated <strong>Mini Pill Tab</strong> on your board for this upload batch.
                    </p>
                  </div>
                )}
              </div>

              {/* 2. Choose Accounts Allowed to See These Leads */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-500" />
                    <span>Select Accounts Allowed to Access These Leads</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllAccounts}
                    className="text-[11px] text-rose-500 hover:underline font-semibold cursor-pointer"
                  >
                    Select All Accounts
                  </button>
                </div>

                <p className="text-[11px] text-zinc-500">
                  Check all team members and accounts that should have permission to view and manage these uploaded leads:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {availableAccounts && availableAccounts.length > 0 ? (
                    availableAccounts.map((acc) => {
                      const isSelected = selectedAccountEmails.includes(acc.email);
                      const isMain = acc.email.toLowerCase() === 'tonykone21@gmail.com';

                      return (
                        <div
                          key={acc.email}
                          onClick={() => toggleAccountSelection(acc.email)}
                          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-rose-500/10 border-rose-500/40 text-zinc-900 dark:text-white'
                              : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-300'
                          }`}
                        >
                          <div className={`text-base ${isSelected ? 'text-rose-500' : 'text-zinc-400'}`}>
                            {isSelected ? <CheckSquare className="w-4 h-4 text-rose-500 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold truncate flex items-center gap-1">
                              <span>{acc.displayName || acc.email.split('@')[0]}</span>
                              {isMain && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                                  Main
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate">{acc.email}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-2 text-xs text-zinc-500 col-span-2">
                      {currentUserEmail || 'Main Account'}
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Parsed Leads Preview Table */}
              <div className="space-y-1.5">
                <h4 className="font-semibold text-xs text-zinc-900 dark:text-white flex items-center justify-between">
                  <span>Preview ({parsedLeads.length} leads)</span>
                  <span className="text-[11px] font-normal text-zinc-500">
                    Visible to {selectedAccountEmails.length} account(s)
                  </span>
                </h4>
                <div className="max-h-44 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-2 space-y-1">
                  {parsedLeads.slice(0, 5).map((l, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-zinc-900 dark:text-white truncate">{l.name}</span>
                          {l.isNormalLead ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                              Normal Lead
                            </span>
                          ) : l.instagramHandle ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                              @{l.instagramHandle.replace(/^@/, '')}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-[10px] mt-0.5 flex-wrap">
                          {l.email && (
                            <span className="inline-flex items-center gap-0.5 font-mono">
                              <Mail className="w-2.5 h-2.5 text-zinc-400" />
                              <span>{l.email}</span>
                            </span>
                          )}
                          {l.phone && (
                            <span className="inline-flex items-center gap-0.5 font-mono">
                              <Phone className="w-2.5 h-2.5 text-zinc-400" />
                              <span>{l.phone}</span>
                            </span>
                          )}
                          {l.website && (
                            <span className="text-zinc-400 truncate max-w-[120px]">{l.website}</span>
                          )}
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0 text-[10px] font-semibold">
                        {l.status}
                      </span>
                    </div>
                  ))}
                  {parsedLeads.length > 5 && (
                    <p className="text-[11px] text-zinc-400 text-center py-1">
                      + {parsedLeads.length - 5} more leads in this upload...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Auto Enrich Toggle */}
          {parsedLeads.length > 0 && (
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <input 
                  type="checkbox" 
                  checked={autoEnrich}
                  onChange={(e) => setAutoEnrich(e.target.checked)}
                  disabled={isEnriching}
                  className="rounded bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-blue-500 focus:ring-blue-500/20"
                />
                <div>
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 block">Auto-Enrich Leads on Import</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-300/70">
                    Automatically extract emails, Instagram handles, and phone numbers from their websites.
                  </span>
                </div>
              </label>

              {isEnriching && (
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-zinc-500 mb-1 font-bold">
                    <span>Enriching Contacts...</span>
                    <span>{enrichProgress.current} / {enrichProgress.total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${(enrichProgress.current / enrichProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-3 flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={onClose}
              disabled={isEnriching}
              className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={parsedLeads.length === 0 || isEnriching}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:opacity-40 text-white font-semibold flex items-center gap-1.5 shadow-sm shadow-rose-500/20 cursor-pointer transition-all"
            >
              {isEnriching ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>
                {isEnriching ? 'Enriching...' : `Import ${parsedLeads.length} Lead(s)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

