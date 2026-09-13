import React from 'react';
import {
  Instagram,
  Globe,
  ExternalLink,
  Flame,
  MessageSquare,
  PhoneCall,
  Mail,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { Lead } from '../types';

export const FacebookIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export const LinkedInIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

export const ZillowIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 12h3v8a1 1 0 001 1h5v-6h2v6h5a1 1 0 001-1v-8h3L12 2zm0 3.2L18 11.2V19h-3v-6H9v6H6v-7.8l6-6z" />
  </svg>
);

export interface SocialLinks {
  facebook?: string;
  linkedin?: string;
  zillow?: string;
  instagram?: string;
  website?: string;
  otherSocials?: string;
}

export function extractSocialLinks(lead: Lead): SocialLinks {
  const fields = lead.customFields || {};
  const links: SocialLinks = {};

  // Facebook
  const fbVal = fields['Facebook'] || fields['facebook'] || fields['Facebook Profile'] || fields['FB'];
  if (fbVal && fbVal.trim()) {
    let url = fbVal.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://facebook.com/${url.replace(/^@/, '')}`;
    links.facebook = url;
  }

  // LinkedIn
  const liVal = fields['LinkedIn'] || fields['linkedin'] || fields['LinkedIn Profile'] || fields['LinkedIn URL'];
  if (liVal && liVal.trim()) {
    let url = liVal.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://linkedin.com/in/${url.replace(/^@/, '')}`;
    links.linkedin = url;
  }

  // Zillow Profile
  const zVal = fields['Zillow Profile'] || fields['Zillow'] || fields['Zillow Link'] || fields['zillowprofile'];
  if (zVal && zVal.trim()) {
    let url = zVal.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://zillow.com/profile/${url.replace(/^@/, '')}`;
    links.zillow = url;
  }

  // Instagram
  const igVal = lead.instagramHandle || fields['Instagram'] || fields['Instagram Handle'] || fields['IG'];
  if (igVal && igVal.trim()) {
    const clean = igVal.replace(/^@/, '').trim();
    if (clean) links.instagram = `https://instagram.com/${clean}`;
  }

  // Website
  if (lead.website && lead.website.trim()) {
    let url = lead.website.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    links.website = url;
  }

  // Other Socials
  const othVal = fields['Other Socials'] || fields['Other Social'] || fields['TikTok'] || fields['YouTube'] || fields['Twitter'];
  if (othVal && othVal.trim()) {
    let url = othVal.trim();
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    links.otherSocials = url;
  }

  return links;
}

export function getPriorityInfo(lead: Lead): { priority?: string; score?: string } {
  const fields = lead.customFields || {};

  const priority = fields['Priority'] || fields['priority'] || fields['Priority Tier'] || fields['Tier'];
  const score = fields['Priority Score'] || fields['priorityscore'] || fields['Score'] || fields['Lead Score'];

  return {
    priority: priority?.trim(),
    score: score?.trim(),
  };
}

// Social Icons Quick Row (Renders just the clean logos)
export const SocialLogosRow: React.FC<{ lead: Lead; compact?: boolean }> = ({ lead, compact = false }) => {
  const links = extractSocialLinks(lead);

  const hasAnyLink = Object.values(links).some(Boolean);
  if (!hasAnyLink) return null;

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${compact ? 'text-xs' : ''}`}>
      {links.instagram && (
        <a
          href={links.instagram}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-600 dark:bg-pink-950/40 dark:hover:bg-pink-900/60 dark:text-pink-400 border border-pink-200 dark:border-pink-800/60 transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
          title="Instagram Profile"
        >
          <Instagram className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </a>
      )}

      {links.facebook && (
        <a
          href={links.facebook}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#1877F2] dark:bg-blue-950/40 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/60 transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
          title="Facebook Profile"
        >
          <FacebookIcon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </a>
      )}

      {links.linkedin && (
        <a
          href={links.linkedin}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#0A66C2] dark:bg-sky-950/40 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800/60 transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
          title="LinkedIn Profile"
        >
          <LinkedInIcon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </a>
      )}

      {links.zillow && (
        <a
          href={links.zillow}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-[#006AFF] dark:bg-cyan-950/40 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800/60 transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
          title="Zillow Agent Profile"
        >
          <ZillowIcon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </a>
      )}

      {links.website && (
        <a
          href={links.website}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
          title={`Website (${lead.website})`}
        >
          <Globe className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </a>
      )}

      {links.otherSocials && (
        <a
          href={links.otherSocials}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 transition-colors inline-flex items-center justify-center cursor-pointer shadow-2xs"
          title="Other Social Media Profile"
        >
          <ExternalLink className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        </a>
      )}
    </div>
  );
};

// Priority Badge Component
export const PriorityBadge: React.FC<{ lead: Lead; compact?: boolean }> = ({ lead, compact = false }) => {
  const { priority, score } = getPriorityInfo(lead);
  if (!priority && !score) return null;

  const prioLower = (priority || '').toLowerCase();
  const isHigh = prioLower.includes('high') || prioLower.includes('vip') || prioLower === 'p1' || Number(score) >= 80;
  const isMed = prioLower.includes('med') || prioLower === 'p2' || (Number(score) >= 50 && Number(score) < 80);

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-md border shrink-0 ${
        compact ? 'text-[9px] px-1.5 py-0.2' : 'text-[10px] px-2 py-0.5'
      } ${
        isHigh
          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
          : isMed
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
      }`}
      title={`Priority: ${priority || 'N/A'} | Score: ${score || 'N/A'}`}
    >
      <Flame className={`shrink-0 ${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${isHigh ? 'text-rose-500 animate-pulse' : 'text-amber-500'}`} />
      <span>
        {priority || 'Prio'}
        {score ? ` (${score})` : ''}
      </span>
    </span>
  );
};

// Outreach Scripts Drawer Box Component (Shown when outreach fields are present)
export const OutreachScriptsBox: React.FC<{ lead: Lead }> = ({ lead }) => {
  const fields = lead.customFields || {};
  const coldCall = fields['Cold Call Outreach'] || fields['Cold Call'] || fields['ColdCallScript'];
  const instagramDm = fields['Instagram DM Outreach'] || fields['Instagram DM'] || fields['IgDmScript'];
  const emailScript = fields['Email Outreach'] || fields['Email Script'] || fields['EmailTemplate'];

  const hasOutreach = Boolean(coldCall || instagramDm || emailScript);
  const [isOpen, setIsOpen] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  if (!hasOutreach) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3.5 flex items-center justify-between text-left cursor-pointer hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <div>
            <h4 className="font-bold text-xs text-blue-900 dark:text-blue-200 uppercase tracking-wider">
              Outreach Scripts & Backstory
            </h4>
            <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium">
              Custom outreach copy ready for Cold Calling, Instagram DM & Email
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            {isOpen ? 'Hide Scripts' : 'Show Scripts'}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4 text-blue-500" /> : <ChevronDown className="w-4 h-4 text-blue-500" />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-blue-200/80 dark:border-blue-900/50 space-y-3 bg-white/80 dark:bg-zinc-950/80">
          {coldCall && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <PhoneCall className="w-3 h-3 text-emerald-500" /> Cold Call Script
                </span>
                <button
                  onClick={() => handleCopy(coldCall, 'cold')}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'cold' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'cold' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {coldCall}
              </p>
            </div>
          )}

          {instagramDm && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-rose-500" /> Instagram DM Script
                </span>
                <button
                  onClick={() => handleCopy(instagramDm, 'ig')}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'ig' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'ig' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {instagramDm}
              </p>
            </div>
          )}

          {emailScript && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-blue-500" /> Email Outreach Copy
                </span>
                <button
                  onClick={() => handleCopy(emailScript, 'email')}
                  className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'email' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copiedKey === 'email' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {emailScript}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
