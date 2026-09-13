const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetailDrawer.tsx', 'utf8');

if (!code.includes('LeadVirtualTryOn')) {
  // 1. Import it
  code = code.replace(
    "import { ProductDemoModal } from './ProductDemoModal';",
    "import { ProductDemoModal } from './ProductDemoModal';\nimport { LeadVirtualTryOn } from './LeadVirtualTryOn';"
  );
  
  // 2. Render it just above the Interaction Log History
  const insertionPoint = "{/* Interaction Log History */}";
  const vtonRender = `
          {/* Virtual Try-On Module */}
          <LeadVirtualTryOn 
            lead={lead} 
            onUpdateLead={(updates) => onSaveLead({ ...lead, ...updates })} 
            isDarkMode={false}
          />

          `;
  
  code = code.replace(insertionPoint, vtonRender + insertionPoint);
  fs.writeFileSync('src/components/LeadDetailDrawer.tsx', code);
}
