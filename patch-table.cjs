const fs = require('fs');
let table = fs.readFileSync('src/components/TableView.tsx', 'utf8');

const propsReplacement = `
  onToggleSelectAll?: () => void;
  onBatchDeleteLeads?: (leadIds: string[]) => void;
  onBatchEnrichLeads?: (leadIds: string[]) => void;
  isBatchEnriching?: boolean;
  batchEnrichProgress?: { current: number, total: number };
`;
table = table.replace(/onToggleSelectAll\?: \(\) => void;\n\s*onBatchDeleteLeads\?: \(leadIds: string\[\]\) => void;/, propsReplacement);

const destructureReplacement = `
  onBatchDeleteLeads,
  onBatchEnrichLeads,
  isBatchEnriching,
  batchEnrichProgress,
`;
table = table.replace(/onBatchDeleteLeads,/, destructureReplacement);

// Find the bulk actions bar and add the Enrich button
const bulkActions = `
            {onBatchEnrichLeads && (
              <button
                onClick={() => onBatchEnrichLeads(selectedLeadIds)}
                disabled={isBatchEnriching}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                title="Scrape selected leads' websites for IG, Phone, and Email"
              >
                {isBatchEnriching ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Enriching... {batchEnrichProgress?.current} / {batchEnrichProgress?.total}</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Enrich Websites ({selectedLeadIds.length})</span>
                  </>
                )}
              </button>
            )}
            {onBatchDeleteLeads && (
`;

table = table.replace(/\{onBatchDeleteLeads && \(/, bulkActions);

fs.writeFileSync('src/components/TableView.tsx', table);
console.log('TableView.tsx patched');
