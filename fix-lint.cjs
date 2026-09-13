const fs = require('fs');

let header = fs.readFileSync('src/components/Header.tsx', 'utf8');
header = header.replace("onOpenCustomFields,", "onOpenCustomFields,\n  onOpenProspectDiscovery,");
fs.writeFileSync('src/components/Header.tsx', header);

let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace("onSaveLead={handleCreateLead}", "onSaveLead={handleAddLead}");
fs.writeFileSync('src/App.tsx', app);

console.log('Fixed linting errors');
