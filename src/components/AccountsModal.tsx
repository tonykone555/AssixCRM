import React, { useState } from 'react';
import { X, Users, ShieldCheck, Mail, Calendar, Eye, Search, Layers, CheckCircle2, UserX } from 'lucide-react';
import { Lead } from '../types';

interface UserAccountDoc {
  uid: string;
  email: string;
  displayName?: string;
  role?: string;
  createdAt?: string;
}

interface AccountsModalProps {
  users: UserAccountDoc[];
  leads: Lead[];
  selectedAccountFilter: string; // 'ALL' or specific user email
  onSelectAccountFilter: (email: string) => void;
  onRemoveUser?: (uid: string, email: string) => void;
  onClose: () => void;
  isDarkMode: boolean;
}

export const AccountsModal: React.FC<AccountsModalProps> = ({
  users,
  leads,
  selectedAccountFilter,
  onSelectAccountFilter,
  onRemoveUser,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const nameMatch = (u.displayName || '').toLowerCase().includes(q);
    const emailMatch = (u.email || '').toLowerCase().includes(q);
    return nameMatch || emailMatch;
  });

  // Calculate stats for each user
  const getUserLeadCount = (email: string, uid: string) => {
    return leads.filter(
      (l) =>
        (l.ownerEmail && l.ownerEmail.toLowerCase() === email.toLowerCase()) ||
        l.ownerId === uid
    ).length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center border border-zinc-200 dark:border-zinc-700 shrink-0">
              <Users className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white flex items-center gap-2">
                User Accounts Directory
                <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold">
                  Super Admin
                </span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                View all registered accounts ({users.length}) and switch between their lead data.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Controls & Search */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search user accounts by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-zinc-400/20"
            />
          </div>

          <button
            onClick={() => {
              onSelectAccountFilter('ALL');
              onClose();
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedAccountFilter === 'ALL'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Show All Leads ({leads.length})</span>
          </button>
        </div>

        {/* User Accounts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-zinc-50/50 dark:bg-zinc-950/50">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 dark:text-zinc-400 text-xs italic">
              No user accounts found. {users.length === 0 ? 'Accounts will populate when users sign in.' : ''}
            </div>
          ) : (
            filteredUsers.map((u) => {
              const leadCount = getUserLeadCount(u.email || '', u.uid);
              const isSelected =
                selectedAccountFilter.toLowerCase() === (u.email || '').toLowerCase();
              const isSuperAdminUser = (u.email || '').toLowerCase() === 'tonykone21@gmail.com';

              return (
                <div
                  key={u.uid}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600 shadow-xs'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold text-sm flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                      {(u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                    </div>

                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                          {u.displayName || u.email?.split('@')[0] || 'User Account'}
                        </span>
                        {isSuperAdminUser && (
                          <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 text-[9px] font-bold flex items-center gap-1">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            Super Admin
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 text-zinc-400 shrink-0" />
                          {u.email}
                        </span>
                        {u.createdAt && (
                          <span className="hidden sm:flex items-center gap-1 shrink-0">
                            <Calendar className="w-3 h-3 text-zinc-400" />
                            Joined {new Date(u.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions & Lead Count */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <span className="block font-bold text-sm text-zinc-900 dark:text-white">
                        {leadCount}
                      </span>
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                        Leads Created
                      </span>
                    </div>

                    {!isSuperAdminUser && onRemoveUser && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to remove access for ${u.email}?`)) {
                            onRemoveUser(u.uid, u.email);
                          }
                        }}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        title="Remove Access"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onSelectAccountFilter(u.email);
                        onClose();
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Viewing Leads' : 'View Account Data'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between text-xs text-zinc-500">
          <span>
            Registered Accounts: <strong className="text-zinc-900 dark:text-white">{users.length}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold cursor-pointer"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
};
