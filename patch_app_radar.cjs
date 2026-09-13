const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("import { LeadRadar }")) {
  code = code.replace(
    "import { PipelineView } from './components/PipelineView';",
    "import { PipelineView } from './components/PipelineView';\nimport { LeadRadar } from './components/LeadRadar';"
  );
}

if (!code.includes("<LeadRadar")) {
  code = code.replace(
    "{viewMode === 'kanban' && (",
    "{viewMode === 'radar' && (\n          <LeadRadar onAddLead={handleAddLead} existingLeads={leads} />\n        )}\n\n        {viewMode === 'kanban' && ("
  );
}

fs.writeFileSync('src/App.tsx', code);
