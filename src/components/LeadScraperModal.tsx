import React, { useState } from 'react';
import { X, Search, Globe, Users, CheckCircle2, ChevronRight, Activity, Tag, MapPin, Mail, AlertTriangle, Filter, Plus, ExternalLink } from 'lucide-react';
import { Lead } from '../types';

interface LeadScraperModalProps {
  onClose: () => void;
  onSaveLeads: (leads: Lead[]) => void;
}

export const LeadScraperModal: React.FC<LeadScraperModalProps> = ({ onClose, onSaveLeads }) => {
  const [platform, setPlatform] = useState('Instagram');
  const [niche, setNiche] = useState('Clothing brand');
  const [location, setLocation] = useState('Los Angeles');
  const [emailDomain, setEmailDomain] = useState('Any');
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedResults, setScrapedResults] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string>('');

  const generateDorkQueries = () => {
    const locString = location ? ` "${location}"` : '';
    const emailStr = emailDomain === 'Any' ? '' : ` "${emailDomain}"`;
    
    if (platform === 'Instagram') {
      return [
        `site:instagram.com "${niche}"${locString}${emailStr}`,
        `site:instagram.com "${niche}" "founder"${locString}${emailStr}`,
        `site:instagram.com "${niche}" "official"${locString}${emailStr}`,
        `site:instagram.com "${niche}" "brand"${locString}${emailStr}`
      ];
    } else if (platform === 'TikTok') {
      return [
        `site:tiktok.com "${niche}"${locString}${emailStr}`,
        `site:tiktok.com "${niche}" "owner"${locString}${emailStr}`,
        `site:tiktok.com "${niche}" "brand"${locString}${emailStr}`
      ];
    } else if (platform === 'Shopify Stores') {
      return [
        `site:myshopify.com "${niche}"${locString}${emailStr}`,
        `site:myshopify.com "${niche}" "store"${locString}${emailStr}`,
        `site:myshopify.com "${niche}" "shop"${locString}${emailStr}`
      ];
    } else if (platform === 'BigCartel') {
      return [
        `site:bigcartel.com "${niche}"${locString}${emailStr}`,
        `site:bigcartel.com "${niche}" "store"${locString}${emailStr}`
      ];
    }
    return [`site:instagram.com "${niche}"${locString}${emailStr}`];
  };

  const handleStartScraping = async () => {
    if (!niche) return;
    setIsScraping(true);
    setErrorMsg(null);
    setScrapedResults([]);
    
    const queries = generateDorkQueries();
    const allFound = new Map();

    try {
      // Run up to 4 queries to gather a large pool of leads
      const maxQueries = Math.min(queries.length, 4);
      
      for (let i = 0; i < maxQueries; i++) {
        setProgressMsg(`Running deep scan phase ${i + 1} of ${maxQueries}...`);
        
        const query = queries[i];
        const res = await fetch('/api/scrape-osint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, platform, pages: 3 })
        });
        
        if (!res.ok) throw new Error('Scraping service unavailable');
        
        const data = await res.json();
        if (data.leads) {
          data.leads.forEach((l: any) => {
            if (!allFound.has(l.handle)) {
              allFound.set(l.handle, l);
            } else {
              // Merge emails
              const existing = allFound.get(l.handle);
              existing.emails = [...new Set([...existing.emails, ...l.emails])];
            }
          });
        }
        
        setScrapedResults(Array.from(allFound.values()));
        
        // 2-second pause between requests to prevent DuckDuckGo blocking
        if (i < maxQueries - 1) await new Promise(r => setTimeout(r, 2000));
      }
      
      const finalResults = Array.from(allFound.values());
      
      if (finalResults.length === 0) {
        setErrorMsg('No leads found. Try a broader keyword or remove the location filter.');
      }
      
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error scraping for leads. Please try again later.');
    } finally {
      setIsScraping(false);
      setProgressMsg('');
    }
  };

  const handleImportSelected = () => {
    const newLeads: Lead[] = scrapedResults.map((result) => ({
      id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: result.name || result.handle,
      instagramHandle: result.handle,
      website: result.profileUrl || `https://${platform.toLowerCase()}.com/${result.handle}`,
      status: 'New',
      screenshots: [],
      notes: `Scraped via Lead Finder. Niche: ${niche}. Location: ${location}. \nPlatform: ${platform}\nEmails found: ${result.emails.join(', ')}`,
      interactions: [],
      customFields: {
        'Platform': result.platform || platform,
        'Emails': result.emails.join(', ')
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [niche.toLowerCase(), 'scraped', platform.toLowerCase().replace(' ', '')]
    }));
    
    onSaveLeads(newLeads);
  };

  const handleImportSingle = (result: any) => {
    const newLead: Lead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: result.name || result.handle,
      instagramHandle: result.handle,
      website: result.profileUrl || `https://${platform.toLowerCase()}.com/${result.handle}`,
      status: 'New',
      screenshots: [],
      notes: `Scraped via Lead Finder. Niche: ${niche}. Location: ${location}. \nPlatform: ${platform}\nEmails found: ${result.emails.join(', ')}`,
      interactions: [],
      customFields: {
        'Platform': result.platform || platform,
        'Emails': result.emails.join(', ')
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [niche.toLowerCase(), 'scraped', platform.toLowerCase().replace(' ', '')]
    };
    
    onSaveLeads([newLead]);
    setScrapedResults(prev => prev.filter(r => r.handle !== result.handle));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-zinc-950/80 backdrop-blur-sm overflow-hidden">
      <div className="relative w-full h-full md:h-auto md:max-h-[90vh] max-w-6xl bg-white dark:bg-zinc-950 md:rounded-2xl shadow-2xl border-0 md:border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Column: Input Form */}
        <div className="w-full md:w-[350px] lg:w-[400px] shrink-0 bg-zinc-50 dark:bg-zinc-900/50 p-6 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-sm">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Lead Finder</h2>
            </div>
            {/* Mobile close button */}
            <button onClick={onClose} className="md:hidden p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
          
          <div className="space-y-4 flex-1">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                <Filter className="w-3 h-3" /> Target Platform
              </label>
              <select 
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="Instagram">Instagram Profiles</option>
                <option value="TikTok">TikTok Profiles</option>
                <option value="Shopify Stores">Shopify Stores</option>
                <option value="BigCartel">BigCartel Stores</option>
              </select>
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                <Tag className="w-3 h-3" /> Niche / Keyword
              </label>
              <input 
                type="text" 
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. Streetwear brand"
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                <MapPin className="w-3 h-3" /> Location (Optional)
              </label>
              <input 
                type="text" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Los Angeles"
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5">
                <Mail className="w-3 h-3" /> Target Email Domain
              </label>
              <select 
                value={emailDomain}
                onChange={(e) => setEmailDomain(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none appearance-none cursor-pointer"
              >
                <option value="Any">Any (No Email Required)</option>
                <option value="@gmail.com">@gmail.com</option>
                <option value="@yahoo.com">@yahoo.com</option>
                <option value="@hotmail.com">@hotmail.com</option>
                <option value="@outlook.com">@outlook.com</option>
              </select>
            </div>
            
            <div className="bg-zinc-100 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 mt-4">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Generated Search Query</p>
              <code className="text-[10px] text-indigo-600 dark:text-indigo-400 break-words font-mono">
                {generateDorkQueries()[0]}
              </code>
            </div>
          </div>
          
          <div className="pt-6 mt-auto border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={handleStartScraping}
              disabled={isScraping || !niche}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 ${
                isScraping 
                  ? 'bg-zinc-800 text-white cursor-wait' 
                  : !niche 
                    ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20'
              }`}
            >
              {isScraping ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  {progressMsg || 'Searching...'}
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Scrape
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Right Column: Results */}
        <div className="w-full flex-1 p-6 flex flex-col overflow-hidden bg-white dark:bg-zinc-950">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Extracted Leads
              {scrapedResults.length > 0 && (
                <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs py-0.5 px-2 rounded-full font-bold">
                  {scrapedResults.length}
                </span>
              )}
            </h3>
            {/* Desktop close button */}
            <button onClick={onClose} className="hidden md:flex p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors group">
              <X className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto min-h-0 bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            {errorMsg ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500">
                <AlertTriangle className="w-8 h-8 text-rose-500 mb-3" />
                <p className="font-medium text-rose-600 max-w-sm">{errorMsg}</p>
              </div>
            ) : isScraping ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                <Activity className="w-8 h-8 text-indigo-500 animate-pulse mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Searching for leads</p>
                <p className="text-xs mt-2 text-zinc-500">Scanning the web. Please wait...</p>
              </div>
            ) : scrapedResults.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                <Search className="w-8 h-8 mb-4 opacity-50" />
                <p className="font-medium">No leads extracted yet.</p>
                <p className="text-xs mt-1">Configure your search targets and click Scrape.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scrapedResults.map((lead, idx) => (
                  <div key={idx} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex items-center justify-between shadow-sm hover:border-indigo-500/50 transition-colors group">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-sm truncate">{lead.name || lead.handle}</h4>
                        <a 
                          href={lead.profileUrl || `https://${(lead.platform || platform).toLowerCase().replace(' ', '')}.com/${lead.handle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-bold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 px-2 py-0.5 rounded text-zinc-600 dark:text-zinc-400 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          {lead.platform === 'Shopify Stores' || lead.platform === 'BigCartel' || lead.handle.includes('.') ? '' : '@'}{lead.handle}
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-500 mt-1.5">
                        <span className="flex items-center gap-1 font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest">
                          {lead.platform || platform}
                        </span>
                        {lead.emails && lead.emails.length > 0 ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {lead.emails[0]}
                          </span>
                        ) : (
                          <span className="text-zinc-400 italic">No email found in bio</span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleImportSingle(lead)}
                      className="p-2 bg-zinc-100 hover:bg-indigo-50 dark:bg-zinc-900 dark:hover:bg-indigo-900/30 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full transition-colors flex-shrink-0"
                      title="Add this lead to pipeline"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {scrapedResults.length > 0 && !isScraping && (
            <div className="mt-6 shrink-0">
              <button
                onClick={handleImportSelected}
                className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs flex justify-center items-center gap-2 hover:scale-[1.01] transition-transform shadow-xl"
              >
                Import All {scrapedResults.length} Leads to Pipeline
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
