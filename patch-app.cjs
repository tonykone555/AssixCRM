const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const stateBlock = `
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [isBatchEnriching, setIsBatchEnriching] = useState(false);
  const [batchEnrichProgress, setBatchEnrichProgress] = useState({ current: 0, total: 0 });
`;
app = app.replace("const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);", stateBlock);

const enrichFunc = `
  const handleBatchEnrichLeads = async (idsToEnrich: string[]) => {
    if (!idsToEnrich.length) return;
    const leadsToEnrich = leads.filter((l) => idsToEnrich.includes(l.id) && l.website && l.website.length > 4);
    if (leadsToEnrich.length === 0) {
      triggerToast('No valid websites found to enrich in selection.');
      return;
    }
    setIsBatchEnriching(true);
    setBatchEnrichProgress({ current: 0, total: leadsToEnrich.length });
    
    let completed = 0;
    const CHUNK_SIZE = 5;
    for (let i = 0; i < leadsToEnrich.length; i += CHUNK_SIZE) {
      const chunk = leadsToEnrich.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (lead) => {
          try {
            const res = await fetch('/api/enrich-website', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: lead.website }),
            });
            const data = await res.json();
            if (data.success) {
              const updates: Partial<Lead> = {};
              if (!lead.email && data.emails && data.emails.length > 0) {
                updates.email = data.emails[0];
              }
              if (!lead.instagramHandle && data.instagram && data.instagram.length > 0) {
                updates.instagramHandle = data.instagram[0];
              }
              if (!lead.phone && data.phones && data.phones.length > 0) {
                updates.phone = data.phones[0];
              }
              if (Object.keys(updates).length > 0) {
                await handleUpdateLead({ ...lead, ...updates });
              }
            }
          } catch (e) {
            console.error('Enrichment failed for', lead.website, e);
          } finally {
            completed++;
            setBatchEnrichProgress({ current: completed, total: leadsToEnrich.length });
          }
        })
      );
    }
    setIsBatchEnriching(false);
    setSelectedLeadIds([]);
    triggerToast('Bulk enrichment complete.');
  };

  const handleBatchDeleteLeads = async (idsToDelete: string[]) => {
`;
app = app.replace("const handleBatchDeleteLeads = async (idsToDelete: string[]) => {", enrichFunc);

const tableViewProps = `
                onBatchDeleteLeads={handleBatchDeleteLeads}
                onBatchEnrichLeads={handleBatchEnrichLeads}
                isBatchEnriching={isBatchEnriching}
                batchEnrichProgress={batchEnrichProgress}
`;
app = app.replace("onBatchDeleteLeads={handleBatchDeleteLeads}", tableViewProps);

fs.writeFileSync('src/App.tsx', app);
console.log('App.tsx patched');
