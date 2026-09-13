import React from 'react';
import {
  Circle,
  Radio,
  Plus,
  FileSpreadsheet,
  MapPin,
  SlidersHorizontal,
  Search,
  Sun,
  Moon,
  Instagram,
  LayoutGrid,
  List,
  Sparkles,
  RotateCcw,
  X,
  LogOut,
  UserCheck,
  ShieldAlert,
  Users,
  Globe,
  Cloud,
  CloudOff,
  CheckCircle2,
} from 'lucide-react';
import { ViewMode } from '../types';

interface HeaderProps {
  onOpenAddLead: () => void;
  onBackgroundScan?: (files: FileList) => void;
  onOpenImportExport: () => void;
  onOpenCustomFields: () => void;
  onOpenProspectDiscovery?: () => void;
  onOpenScraper?: () => void;
  onOpenAppleCampaign?: () => void;
  onOpenCallSimulator?: () => void;
  onOpenVoiceNotes?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  tagFilter: string;
  onTagFilterChange: (t: string) => void;
  allTags: string[];
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onResetFilters: () => void;
  fullCanvasMode: boolean;
  onToggleFullCanvas: () => void;
  currentUserEmail?: string | null;
  isSuperAdmin?: boolean;
  onSignOut?: () => void;
  onOpenAccountsDirectory?: () => void;
  isCloudSyncEnabled?: boolean;
  activePage?: 'crm' | 'marketplace';
  onPageChange?: (page: 'crm' | 'marketplace') => void;
  onToggleCloudSync?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddLead,
  onBackgroundScan,
  onOpenImportExport,
  onOpenCustomFields,
  onOpenProspectDiscovery,
  onOpenScraper,
  onOpenAppleCampaign,
  onOpenCallSimulator,
  onOpenVoiceNotes,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  tagFilter,
  onTagFilterChange,
  allTags,
  viewMode,
  onViewModeChange,
  isDarkMode,
  onToggleDarkMode,
  onResetFilters,
  fullCanvasMode,
  onToggleFullCanvas,
  currentUserEmail,
  isSuperAdmin,
  onSignOut,
  onOpenAccountsDirectory,
  isCloudSyncEnabled,
  onToggleCloudSync,
  activePage = 'crm',
  onPageChange,
}) => {
  return (
    <header className="sticky top-0 z-30 transition-colors backdrop-blur-xl bg-white/90 dark:bg-zinc-950/90 border-b border-zinc-200 dark:border-zinc-800/80 shadow-xs">
      <div className="max-w-[1600px] mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3">
        {/* Brand & Search Section */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          
        {/* Navigation Tabs */}
        {onPageChange && (
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl shrink-0">
            <button
              onClick={() => onPageChange('crm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activePage === 'crm' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              CRM
            </button>
            <button
              onClick={() => onPageChange('marketplace')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activePage === 'marketplace' ? 'bg-white dark:bg-zinc-800 text-[#007AFF] shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Marketplace
            </button>
          </div>
        )}
   
          {/* Mac Window Buttons */}
          <div className="flex items-center gap-1.5 group shrink-0 py-1 px-0.5">
            <button
              onClick={onResetFilters}
              className="w-3 h-3 rounded-full bg-[#FF5F56] hover:bg-[#E0443E] border border-black/10 transition-all flex items-center justify-center text-[8px] leading-none font-bold text-black/0 group-hover:text-black/70 shadow-xs cursor-pointer"
              title="Reset Filters"
            >
              ×
            </button>
            <button
              onClick={onResetFilters}
              className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:bg-[#DEA123] border border-black/10 transition-all flex items-center justify-center text-[8px] leading-none font-bold text-black/0 group-hover:text-black/70 shadow-xs cursor-pointer"
              title="Minimize View"
            >
              -
            </button>
            <button
              onClick={onToggleFullCanvas}
              className="w-3 h-3 rounded-full bg-[#27C93F] hover:bg-[#1AAB2F] border border-black/10 transition-all flex items-center justify-center text-[8px] leading-none font-bold text-black/0 group-hover:text-black/70 shadow-xs cursor-pointer"
              title={fullCanvasMode ? "Standard View" : "Toggle Full View"}
            >
              +
            </button>
          </div>

          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-xs">
              <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5">
                Assix
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

          {/* Search Bar */}
          <div className="relative flex-1 min-w-[100px] max-w-[180px] lg:max-w-[220px] xl:max-w-[260px]">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-2.5 sm:left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 text-xs font-medium rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500/40 transition-all placeholder:text-zinc-400"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Reset Filters Button */}
          {(searchQuery || statusFilter !== 'ALL' || tagFilter !== 'ALL') && (
            <button
              onClick={onResetFilters}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors shrink-0"
              title="Reset Filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Actions & Utilities Bar */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto md:overflow-visible scrollbar-none py-0.5 justify-between sm:justify-end shrink-0">
          {/* View Mode Toggle Switch */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 sm:p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 shrink-0">
            <button
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Table</span>
            </button>

            <button
              onClick={() => onViewModeChange('kanban')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Board</span>
            </button>

            {onOpenScraper && (
              <button
                onClick={onOpenScraper}
                className="p-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer"
                title="Lead Discovery"
              >
                <Globe className="w-4 h-4" />
                <span className="hidden xl:inline text-[11px]">Discovery</span>
              </button>
            )}
          </div>

          <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0 hidden sm:block" />

          {/* Apple FaceTime & iMessage Automation Campaign */}
          {onOpenAppleCampaign && (
            <button
              onClick={onOpenAppleCampaign}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-[#007AFF] dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-all flex items-center gap-1 text-xs font-semibold shrink-0 cursor-pointer"
              title="Apple FaceTime & iMessage Automation Campaign"
            >
              <CheckCircle2 className="w-4 h-4 fill-[#007AFF] text-white shrink-0" />
              <span className="hidden md:inline">Apple</span>
              <span className="hidden 2xl:inline">Studio</span>
            </button>
          )}

          {/* AI Call Simulator & Roleplay Coach */}
          {onOpenCallSimulator && (
            <button
              onClick={onOpenCallSimulator}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 border border-zinc-900 dark:border-white transition-all flex items-center gap-1 text-xs font-bold shrink-0 cursor-pointer shadow-xs"
              title="AI Call Simulator & Roleplay Coach"
            >
              <UserCheck className="w-4 h-4 text-white dark:text-zinc-900 shrink-0" />
              <span className="hidden md:inline">Call Simulator</span>
            </button>
          )}

          {/* AI Voice Note Campaigns */}
          {onOpenVoiceNotes && (
            <button
              onClick={onOpenVoiceNotes}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all flex items-center gap-1 text-xs font-bold shrink-0 cursor-pointer shadow-xs"
              title="Bulk AI Voice Note Campaigns"
            >
              <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="hidden md:inline">Voice Notes</span>
            </button>
          )}

          {/* AI Prospect Discovery */}
          {onOpenProspectDiscovery && (
            <button
              onClick={onOpenProspectDiscovery}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 transition-all flex items-center gap-1 text-xs font-bold shrink-0 cursor-pointer shadow-xs"
              title="Find High-Value Prospects"
            >
              <Search className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
              <span className="hidden md:inline">Find Leads</span>
            </button>
          )}

          {/* Import / Export Tool */}
          <button
            onClick={onOpenImportExport}
            className="p-1.5 sm:px-2 sm:py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition-colors flex items-center gap-1 text-xs font-medium shrink-0 cursor-pointer"
            title="CSV Import / Export"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span className="hidden 2xl:inline">CSV</span>
          </button>

          {/* Custom Fields Manager */}
          <button
            onClick={onOpenCustomFields}
            className="p-1.5 sm:px-2 sm:py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition-colors flex items-center gap-1 text-xs font-medium shrink-0 cursor-pointer"
            title="Manage Custom Metrics & Settings"
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span className="hidden 2xl:inline">Fields</span>
          </button>

          {/* User Accounts Directory for Super Admin / Main Account */}
          {isSuperAdmin && onOpenAccountsDirectory && (
            <button
              onClick={onOpenAccountsDirectory}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white text-zinc-900 border border-zinc-200 dark:border-zinc-300 hover:bg-zinc-100 font-semibold transition-all flex items-center gap-1 text-xs shadow-xs shrink-0 cursor-pointer"
              title="View & Switch User Accounts (Main Account)"
            >
              <Users className="w-4 h-4 text-zinc-700 shrink-0" />
              <span className="hidden xl:inline">Accounts</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer shrink-0"
            title="Toggle Light / Dark Mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>

          {/* Cloud Sync Toggle */}
          {onToggleCloudSync && (
            <button
              onClick={onToggleCloudSync}
              className={`p-1.5 sm:px-2 sm:py-1.5 rounded-xl border font-semibold transition-all flex items-center gap-1 text-xs shadow-xs shrink-0 cursor-pointer ${
                isCloudSyncEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30'
                  : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-800'
              }`}
              title={isCloudSyncEnabled ? 'Live Sync Enabled' : 'Offline Mode (Reads 0 from Cloud)'}
            >
              {isCloudSyncEnabled ? (
                <Cloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <CloudOff className="w-4 h-4 shrink-0" />
              )}
              <span className="hidden xl:inline">{isCloudSyncEnabled ? 'Live' : 'Offline'}</span>
            </button>
          )}

          {/* User Account Info & Sign Out */}
          {currentUserEmail && (
            <div className="flex items-center gap-1 pl-1 border-l border-zinc-200 dark:border-zinc-800 shrink-0">
              <div className="hidden 2xl:flex flex-col text-right pr-1">
                <span className="text-[11px] font-semibold text-zinc-900 dark:text-white truncate max-w-[120px] flex items-center justify-end gap-1">
                  {currentUserEmail}
                </span>
                {isSuperAdmin && (
                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center justify-end gap-0.5">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    Super Admin
                  </span>
                )}
              </div>

              {onSignOut && (
                <button
                  onClick={onSignOut}
                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer shrink-0"
                  title={`Sign out (${currentUserEmail})`}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Primary Action Button: Add Lead */}
          <button
            onClick={onOpenAddLead}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-xs shadow-purple-500/20 transition-all flex items-center gap-1 active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="inline">Add</span>
          </button>
          
          {onBackgroundScan && (
            <label className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700 font-semibold text-xs shadow-xs transition-all flex items-center gap-1 active:scale-95 cursor-pointer shrink-0">
               <Circle className="w-4 h-4" />
               <span className="inline">Scan</span>
               <input 
                 type="file" 
                 accept="image/*" 
                 multiple
                 className="hidden" 
                 onChange={(e) => {
                   if (e.target.files && e.target.files.length > 0) {
                     onBackgroundScan(e.target.files);
                   }
                   e.target.value = '';
                 }} 
               />
            </label>
          )}
        </div>
      </div>
    </header>
  );
};
