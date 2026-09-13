const fs = require('fs');

// Patch App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');

const batchAssignFn = `
  const handleBatchAssignLeads = async (idsToAssign: string[], accountEmail: string) => {
    if (!idsToAssign.length || !accountEmail) return;
    const leadsToAssign = leads.filter(l => idsToAssign.includes(l.id));
    
    // Optimistic UI update
    setLeads(prev => prev.map(l => {
      if (idsToAssign.includes(l.id)) {
        const currentAssigns = l.assignedAccountEmails || [];
        const newAssigns = currentAssigns.includes(accountEmail) ? currentAssigns : [...currentAssigns, accountEmail];
        return { ...l, assignedAccountEmails: newAssigns };
      }
      return l;
    }));
    
    // Update DB
    let updatedCount = 0;
    for (const l of leadsToAssign) {
      const currentAssigns = l.assignedAccountEmails || [];
      if (!currentAssigns.includes(accountEmail)) {
        await handleUpdateLead({ ...l, assignedAccountEmails: [...currentAssigns, accountEmail] });
        updatedCount++;
      }
    }
    
    setSelectedLeadIds([]);
    triggerToast(\`Assigned \${updatedCount} leads to \${accountEmail}\`);
  };

  const handleBatchDeleteLeads = async (idsToDelete: string[]) => {
`;
app = app.replace("const handleBatchDeleteLeads = async (idsToDelete: string[]) => {", batchAssignFn);

const tableViewPropsApp = `
                onBatchDeleteLeads={handleBatchDeleteLeads}
                onBatchEnrichLeads={handleBatchEnrichLeads}
                onBatchAssignLeads={handleBatchAssignLeads}
                availableAccounts={availableAccounts}
`;
app = app.replace("onBatchDeleteLeads={handleBatchDeleteLeads}\n                onBatchEnrichLeads={handleBatchEnrichLeads}", tableViewPropsApp);

fs.writeFileSync('src/App.tsx', app);
console.log('App patched');

// Patch TableView.tsx
let table = fs.readFileSync('src/components/TableView.tsx', 'utf8');

const tableProps = `
  onBatchDeleteLeads?: (leadIds: string[]) => void;
  onBatchEnrichLeads?: (leadIds: string[]) => void;
  onBatchAssignLeads?: (leadIds: string[], accountEmail: string) => void;
  availableAccounts?: { email: string, uid: string, displayName?: string }[];
  isBatchEnriching?: boolean;
`;
table = table.replace(/onBatchDeleteLeads\?: \(leadIds: string\[\]\) => void;\n\s*onBatchEnrichLeads\?: \(leadIds: string\[\]\) => void;/, tableProps);

const tableDestructure = `
  onBatchDeleteLeads,
  onBatchEnrichLeads,
  onBatchAssignLeads,
  availableAccounts,
`;
table = table.replace(/onBatchDeleteLeads,\n\s*onBatchEnrichLeads,/, tableDestructure);

const tableAction = `
            {isSuperAdmin && onBatchAssignLeads && availableAccounts && availableAccounts.length > 0 && (
              <div className="relative group/assign">
                <button className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-all">
                  <Users className="w-3.5 h-3.5" />
                  <span>Assign To...</span>
                </button>
                <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl opacity-0 invisible group-hover/assign:opacity-100 group-hover/assign:visible transition-all z-50 py-1 overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800">Select Sub-Account</div>
                  {availableAccounts.map(acc => (
                    <button
                      key={acc.email}
                      onClick={() => onBatchAssignLeads(selectedLeadIds, acc.email)}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {acc.displayName || acc.email.split('@')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {onBatchEnrichLeads && (
`;
table = table.replace("{onBatchEnrichLeads && (", tableAction);

fs.writeFileSync('src/components/TableView.tsx', table);
console.log('TableView patched');
