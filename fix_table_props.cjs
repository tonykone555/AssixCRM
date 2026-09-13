const fs = require('fs');
let code = fs.readFileSync('src/components/TableView.tsx', 'utf8');

code = code.replace(/  isBatchEnriching\?: boolean;\n  batchEnrichProgress\?: \{ current: number, total: number \};\n\n  onBatchDeleteLeads\?:/, "  onBatchDeleteLeads?:");
fs.writeFileSync('src/components/TableView.tsx', code);
console.log('Fixed props duplicate');
