import React, { useState } from 'react';
import { ShoppingBag, TrendingUp, Package, Link2, DollarSign, Activity, GitCommit, FileText } from 'lucide-react';

export const MarketplaceDashboard: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'opportunities' | 'inventory' | 'listings' | 'orders' | 'automations' | 'connections' | 'audit'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'opportunities', label: 'Opportunities', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory', icon: <Package className="w-4 h-4" /> },
    { id: 'listings', label: 'eBay Listings', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders', icon: <FileText className="w-4 h-4" /> },
    { id: 'automations', label: 'Automations', icon: <Activity className="w-4 h-4" /> },
    { id: 'connections', label: 'Connections', icon: <Link2 className="w-4 h-4" /> },
    { id: 'audit', label: 'Audit Log', icon: <GitCommit className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-black overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-[#007AFF]" />
          Marketplace Arbitrage
        </h2>
        <div className="flex items-center gap-4 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-md'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             {/* Stub cards for overview metrics */}
             <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Tracked Opportunities</h3>
                <div className="text-3xl font-black text-zinc-900 dark:text-white">0</div>
             </div>
             <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Est. Expected Profit</h3>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">$0.00</div>
             </div>
             <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Owned Inventory Value</h3>
                <div className="text-3xl font-black text-zinc-900 dark:text-white">$0.00</div>
             </div>
             <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Active Listings</h3>
                <div className="text-3xl font-black text-zinc-900 dark:text-white">0</div>
             </div>
           </div>
        )}
        {activeTab === 'opportunities' && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-zinc-900 dark:text-white">Arbitrage Opportunities</h3>
            <p className="text-zinc-500 text-sm">Opportunities imported from ChatGPT will appear here.</p>
          </div>
        )}
        {activeTab === 'inventory' && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-zinc-900 dark:text-white">Owned Inventory</h3>
            <p className="text-zinc-500 text-sm">Items acquired and ready to list.</p>
          </div>
        )}
        {activeTab === 'connections' && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm max-w-xl">
             <h3 className="font-bold text-lg mb-4 text-zinc-900 dark:text-white">eBay Seller Account</h3>
             <p className="text-zinc-500 text-sm mb-6">Connect your eBay account to manage listings, inventory, and orders directly.</p>
             <button 
               onClick={async () => {
                 try {
                   const token = await currentUser.getIdToken();
                   const res = await fetch('/api/ebay/auth-url', { headers: { 'Authorization': `Bearer ${token}` } });
                   const data = await res.json();
                   if (data.url) window.location.href = data.url;
                 } catch(e) {
                   alert('Could not start OAuth flow');
                 }
               }}
               className="px-6 py-3 bg-[#007AFF] text-white font-bold rounded-xl shadow-md hover:bg-blue-600 transition-colors"
             >
               Connect eBay Account
             </button>
          </div>
        )}
        {['listings', 'orders', 'automations', 'audit'].includes(activeTab) && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-zinc-900 dark:text-white capitalize">{activeTab}</h3>
            <p className="text-zinc-500 text-sm">Coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};
