import React, { useState } from 'react';
import { Search, MapPin, Target, ChevronRight, X, Loader2, Info, Star, MessageCircle, ArrowUpRight, Copy } from 'lucide-react';

interface ProspectDiscoveryProps {
  onClose: () => void;
  onSaveLead: (lead: any) => void;
}

export const ProspectDiscovery: React.FC<ProspectDiscoveryProps> = ({ onClose, onSaveLead }) => {
  const [niche, setNiche] = useState('Spiritual coaches');
  const [location, setLocation] = useState('United States');
  const [minFollowers, setMinFollowers] = useState(10000);
  const [minOffer, setMinOffer] = useState(2000);
  const [intentSignal, setIntentSignal] = useState('Hiring setters OR high DM activity');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSearch = async () => {
    setIsSearching(true);
    setResults([]);
    // Mocking the discovery process based on the prompt instructions
    // In production, this would hit the Apify/Phyllo provider backend endpoint
    setTimeout(() => {
      setResults([
        {
          id: 'mock-1',
          name: 'Sarah Light',
          instagramUsername: 'sarah.light.healing',
          followers: 45000,
          niche: 'Spiritual coaches',
          offerEstimate: '$3,000+',
          intentScore: 96,
          dmOpportunityScore: 92,
          overallScore: 94,
          setterStatus: 'Hiring',
          evidence: [
            '"Currently hiring two Instagram appointment setters." (LinkedIn, Sep 7)',
            'Instagram bio says: "DM SOUL to apply."',
            'Website promotes a $3,000 coaching program.'
          ],
          source: 'Apify/Instagram',
          dateFound: new Date().toISOString()
        },
        {
          id: 'mock-2',
          name: 'David Mindset',
          instagramUsername: 'david_transforms',
          followers: 120000,
          niche: 'Business coaches',
          offerEstimate: '$5,000+',
          intentScore: 88,
          dmOpportunityScore: 95,
          overallScore: 91,
          setterStatus: 'Overwhelmed',
          evidence: [
            '"I am drowning in DMs right now, need a team." (Recent Story Transcript)',
            'High engagement rate (8%) indicates active audience.',
            'Requires application call for $5,000 mastermind.'
          ],
          source: 'Apify/Instagram',
          dateFound: new Date().toISOString()
        }
      ]);
      setIsSearching(false);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex flex-col font-sans animate-in fade-in duration-200">
      <div className="bg-zinc-950 border-b border-zinc-800 p-4 flex items-center justify-between shadow-xl z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">AI Prospect Discovery</h2>
            <p className="text-xs text-zinc-400">Find high-value prospects for AI Instagram DM setters</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row max-w-[1600px] w-full mx-auto p-4 gap-4">
        {/* Left Sidebar: Search Config */}
        <div className="w-full md:w-80 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col shadow-xl shrink-0">
          <div className="p-5 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-blue-400" /> Search Parameters
            </h3>
          </div>
          <div className="p-5 overflow-y-auto space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Target Niche</label>
              <select value={niche} onChange={(e) => setNiche(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                <option>Business coaches</option>
                <option>Spiritual coaches</option>
                <option>Life coaches</option>
                <option>Wellness coaches</option>
                <option>Fitness coaches</option>
                <option>Dating/relationship coaches</option>
                <option>Mindset coaches</option>
                <option>Sales coaches</option>
                <option>Agency owners</option>
                <option>Consultants</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Location / Country</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Minimum Followers</label>
              <input type="number" value={minFollowers} onChange={(e) => setMinFollowers(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Minimum Offer Price ($)</label>
              <input type="number" value={minOffer} onChange={(e) => setMinOffer(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Intent Signal</label>
              <select value={intentSignal} onChange={(e) => setIntentSignal(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500">
                <option>Hiring setters OR high DM activity</option>
                <option>Strictly Hiring Setters</option>
                <option>Overwhelmed with DMs</option>
                <option>High-Ticket App Funnel</option>
              </select>
            </div>
            
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full mt-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isSearching ? 'ANALYZING INTENT...' : 'FIND HIGH-INTENT LEADS'}
            </button>
            <p className="text-[10px] text-zinc-500 text-center">Powered by Discovery Provider & Gemini Intent Scoring</p>
          </div>
        </div>

        {/* Right Side: Results */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col shadow-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-rose-400" /> High-Intent Prospects Found
            </h3>
            <span className="text-xs font-medium text-zinc-400">{results.length} Results</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {isSearching ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <div className="text-center">
                  <h4 className="text-sm font-bold text-white mb-1">Scanning Discovery Provider...</h4>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">Gemini is analyzing bios, recent posts, and comments for "{intentSignal}" signals.</p>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2">
                <Target className="w-12 h-12 text-zinc-800 mb-2" />
                <p className="text-sm font-semibold">Ready to find high-value AI Setter prospects.</p>
                <p className="text-xs max-w-sm text-center">Adjust parameters on the left and click Find Leads to start the discovery process.</p>
              </div>
            ) : (
              results.map((prospect) => (
                <div key={prospect.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors">
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-lg font-bold text-white flex items-center gap-2">
                            {prospect.name}
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">HOT LEAD</span>
                          </h4>
                          <p className="text-sm text-zinc-400 flex items-center gap-2 mt-1">
                            <span className="text-rose-400">@{prospect.instagramUsername}</span>
                            <span>•</span>
                            <span>{prospect.followers.toLocaleString()} Followers</span>
                            <span>•</span>
                            <span>{prospect.niche}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-black text-white">{prospect.intentScore}</div>
                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Intent Score</div>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                        <h5 className="text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-blue-400" /> Evidence of Intent
                        </h5>
                        <ul className="space-y-2">
                          {prospect.evidence.map((ev: string, idx: number) => (
                            <li key={idx} className="text-sm text-zinc-400 flex items-start gap-2">
                              <span className="text-blue-500 mt-1">•</span> {ev}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div className="w-full lg:w-64 flex flex-col gap-3 shrink-0">
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 text-center">
                          <div className="text-lg font-bold text-emerald-400">{prospect.offerEstimate}</div>
                          <div className="text-[10px] text-zinc-500 uppercase font-bold">Offer Size</div>
                        </div>
                        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 text-center">
                          <div className="text-lg font-bold text-white">{prospect.dmOpportunityScore}</div>
                          <div className="text-[10px] text-zinc-500 uppercase font-bold">DM Score</div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => {
                          const newLead = {
                            id: Date.now().toString(),
                            name: prospect.name,
                            instagramHandle: prospect.instagramUsername,
                            isNormalLead: false,
                            status: 'New',
                            tags: ['High Intent', prospect.niche],
                            customFields: {
                              Followers: prospect.followers.toString(),
                              Offer: prospect.offerEstimate,
                              IntentScore: prospect.intentScore.toString()
                            },
                            notes: `Intent Score: ${prospect.intentScore}\nEvidence:\n${prospect.evidence.join('\n')}`,
                            interactions: [],
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          };
                          onSaveLead(newLead);
                        }}
                        className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        SAVE LEAD TO CRM <ArrowUpRight className="w-4 h-4" />
                      </button>
                      <button className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors border border-zinc-700">
                        <MessageCircle className="w-4 h-4" /> GENERATE OUTREACH
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
