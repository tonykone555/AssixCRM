import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  MessageSquare,
  Twitter,
  Mail,
} from 'lucide-react';
import { Lead } from '../types';
import { formatLeadForSocialShare } from '../utils/csvUtils';

interface ShareModalProps {
  lead?: Lead | null;
  onClose: () => void;
  isDarkMode: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  lead,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const shareText = lead ? formatLeadForSocialShare(lead) : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText.slice(0, 270))}`;
    window.open(url, '_blank');
  };

  const handleEmail = () => {
    const title = lead ? `Assix Lead: ${lead.name}` : `Assix Lead Summary`;
    const url = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs font-sans animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Share Lead</h3>
              <p className="text-xs text-zinc-500">{lead?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs font-medium">
          {/* Quick Share Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={handleCopy}
              className="p-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 flex flex-col items-center gap-1.5 transition-colors font-semibold"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleWhatsApp}
              className="p-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 flex flex-col items-center gap-1.5 transition-colors font-semibold"
            >
              <MessageSquare className="w-5 h-5 text-emerald-500" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleTwitter}
              className="p-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 flex flex-col items-center gap-1.5 transition-colors font-semibold"
            >
              <Twitter className="w-5 h-5 text-sky-500" />
              <span>Twitter</span>
            </button>

            <button
              onClick={handleEmail}
              className="p-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 flex flex-col items-center gap-1.5 transition-colors font-semibold"
            >
              <Mail className="w-5 h-5 text-rose-500" />
              <span>Email</span>
            </button>
          </div>

          <div>
            <label className="block text-zinc-500 font-semibold mb-1">
              Formatted Preview
            </label>
            <textarea
              rows={6}
              readOnly
              value={shareText}
              className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={handleCopy}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Card'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
