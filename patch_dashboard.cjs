const fs = require('fs');
let code = fs.readFileSync('src/components/Marketplace/MarketplaceDashboard.tsx', 'utf8');

const replacement = `import React, { useState, useEffect } from 'react';
import { ShoppingBag, TrendingUp, Package, Link2, DollarSign, Activity, GitCommit, FileText, Plus, Check, Loader2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';

export const MarketplaceDashboard: React.FC<{ currentUser: any }> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'opportunities' | 'inventory' | 'listings' | 'orders' | 'automations' | 'connections' | 'audit'>('overview');
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItem, setNewItem] = useState({ title: '', description: '', price: 10, condition: 'NEW', category: '12345' });
  const [isPublishing, setIsPublishing] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'inventoryItems'), where('ownerUid', '==', currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      setInventoryItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [currentUser]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'inventoryItems'), {
        ownerUid: currentUser.uid,
        title: newItem.title,
        description: newItem.description,
        price: Number(newItem.price),
        condition: newItem.condition,
        category: newItem.category,
        internalSku: \`SKU-\${Date.now()}\`,
        ownershipConfirmed: true, 
        userOwnedImages: ['https://example.com/image.jpg'], 
        createdAt: new Date().toISOString()
      });
      setShowNewItemForm(false);
    } catch(err) {
       console.error("Create failed", err);
       alert("Failed to create item");
    }
  };

  const handlePublish = async (item: any) => {
    setIsPublishing(item.id);
    try {
       const token = await currentUser.getIdToken();
       const res = await fetch('/api/ebay/publish', {
          method: 'POST',
          headers: {
             'Content-Type': 'application/json',
             'Authorization': \`Bearer \${token}\`
          },
          body: JSON.stringify({
             inventoryItemId: item.id,
             price: item.price
          })
       });
       const data = await res.json();
       if (!res.ok) {
           throw new Error(data.error || 'Publish failed');
       }
       alert('Successfully published! Listing ID: ' + data.listingId);
    } catch(err: any) {
       alert(err.message);
    } finally {
       setIsPublishing(null);
    }
  };

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
              className={\`flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold text-sm transition-all whitespace-nowrap \${
                activeTab === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-md'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
              }\`}
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
        
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-xl text-zinc-900 dark:text-white">Owned Inventory</h3>
                    <p className="text-zinc-500 text-sm">Manage items acquired and ready to list.</p>
                </div>
                <button 
                  onClick={() => setShowNewItemForm(!showNewItemForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl text-sm hover:opacity-90"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
            </div>
            
            {showNewItemForm && (
                <form onSubmit={handleCreateItem} className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 max-w-2xl">
                    <h4 className="font-bold text-zinc-900 dark:text-white">Add Test Inventory Item</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500">Title</label>
                            <input required value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" placeholder="e.g. Vintage Camera" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500">Price (USD)</label>
                            <input required type="number" step="0.01" min="0.01" value={newItem.price} onChange={e => setNewItem({...newItem, price: parseFloat(e.target.value)})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500">Description</label>
                        <textarea required value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" rows={2} />
                    </div>
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-sm text-zinc-500 flex items-center gap-2">
                       <Check className="w-4 h-4 text-emerald-500" /> Ownership automatically confirmed with mocked images for this test.
                    </div>
                    <button type="submit" className="px-4 py-2 bg-[#007AFF] text-white font-semibold rounded-lg text-sm">Save Item</button>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {inventoryItems.map(item => (
                   <div key={item.id} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
                       <div className="flex-1">
                           <h4 className="font-bold text-zinc-900 dark:text-white line-clamp-1">{item.title}</h4>
                           <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">$\{(item.price || 0).toFixed(2)}</p>
                           <p className="text-xs text-zinc-500 mt-2 line-clamp-2">{item.description}</p>
                           
                           <div className="flex gap-2 mt-4">
                               <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded text-xs font-semibold">{item.condition}</span>
                               <span className="px-2 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 rounded text-xs font-semibold flex items-center gap-1"><Check className="w-3 h-3" /> Confirmed</span>
                           </div>
                       </div>
                       
                       <div className="pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800">
                           <button 
                             onClick={() => handlePublish(item)}
                             disabled={isPublishing === item.id}
                             className="w-full py-2 bg-[#007AFF] hover:bg-blue-600 text-white font-semibold rounded-lg text-sm transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
                           >
                             {isPublishing === item.id ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</> : 'Publish to eBay'}
                           </button>
                       </div>
                   </div>
               ))}
               {inventoryItems.length === 0 && !showNewItemForm && (
                   <div className="col-span-full py-12 text-center text-zinc-500 text-sm bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
                       No inventory items yet. Add one to test publication.
                   </div>
               )}
            </div>
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
                   const res = await fetch('/api/ebay/auth-url', { headers: { 'Authorization': \`Bearer \${token}\` } });
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
        
        {['opportunities', 'listings', 'orders', 'automations', 'audit'].includes(activeTab) && (
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-zinc-900 dark:text-white capitalize">{activeTab}</h3>
            <p className="text-zinc-500 text-sm">Coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
};
`;

fs.writeFileSync('src/components/Marketplace/MarketplaceDashboard.tsx', replacement);
