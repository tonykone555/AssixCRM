const fs = require('fs');

// Patch App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
if (!appCode.includes('activePage')) {
   appCode = appCode.replace("const [viewMode, setViewMode] = useState<ViewMode>('table');", "const [viewMode, setViewMode] = useState<ViewMode>('table');\n  const [activePage, setActivePage] = useState<'crm' | 'marketplace'>('crm');");
   appCode = appCode.replace("import { ProspectDiscovery } from './components/ProspectDiscovery';", "import { ProspectDiscovery } from './components/ProspectDiscovery';\nimport { MarketplaceDashboard } from './components/Marketplace/MarketplaceDashboard';");
   
   appCode = appCode.replace("onToggleCloudSync={() => setIsCloudSyncEnabled(!isCloudSyncEnabled)}", "onToggleCloudSync={() => setIsCloudSyncEnabled(!isCloudSyncEnabled)}\n          activePage={activePage}\n          onPageChange={setActivePage}");
   
   appCode = appCode.replace("{/* Main Canvas */}", "{/* Main Canvas */}\n        {activePage === 'marketplace' ? (\n          <MarketplaceDashboard currentUser={currentUser} />\n        ) : (");
   appCode = appCode.replace("</main>", ")}</main>");
   fs.writeFileSync('src/App.tsx', appCode);
}

// Patch Header.tsx
let headerCode = fs.readFileSync('src/components/Header.tsx', 'utf8');
if (!headerCode.includes('activePage')) {
   headerCode = headerCode.replace("isCloudSyncEnabled?: boolean;", "isCloudSyncEnabled?: boolean;\n  activePage?: 'crm' | 'marketplace';\n  onPageChange?: (page: 'crm' | 'marketplace') => void;");
   headerCode = headerCode.replace("onToggleCloudSync,", "onToggleCloudSync,\n  activePage = 'crm',\n  onPageChange,");
   
   const navTabs = `
        {/* Navigation Tabs */}
        {onPageChange && (
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl shrink-0">
            <button
              onClick={() => onPageChange('crm')}
              className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition-all \${activePage === 'crm' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}\`}
            >
              CRM
            </button>
            <button
              onClick={() => onPageChange('marketplace')}
              className={\`px-3 py-1.5 rounded-lg text-xs font-bold transition-all \${activePage === 'marketplace' ? 'bg-white dark:bg-zinc-800 text-[#007AFF] shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}\`}
            >
              Marketplace
            </button>
          </div>
        )}
   `;
   headerCode = headerCode.replace("{/* Mac Window Buttons */}", navTabs + "\n          {/* Mac Window Buttons */}");
   fs.writeFileSync('src/components/Header.tsx', headerCode);
}
console.log("Nav patched");
