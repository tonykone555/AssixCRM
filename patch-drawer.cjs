const fs = require('fs');
let code = fs.readFileSync('src/components/LeadDetailDrawer.tsx', 'utf8');

if (!code.includes('LeadVirtualTryOn')) {
  // 1. Add Import
  code = code.replace(
    "import { AccountOption } from './AddLeadModal';",
    "import { AccountOption } from './AddLeadModal';\nimport { LeadVirtualTryOn } from './LeadVirtualTryOn';"
  );
  
  // 2. Add Component usage
  // We want to insert it after the AI Outreach block (which ends right before the screenshots section).
  // Let's find a reliable anchor. The Screenshots section starts with: `<div className="space-y-3">` right after the outreach section.
  const anchor = '<div className="space-y-3">';
  const beforeAnchor = code.substring(0, code.indexOf(anchor));
  const afterAnchor = code.substring(code.indexOf(anchor));
  
  // Let's find the `draftMessage && (...)` block end.
  // We can just inject it right before the Screenshots section.
  const screenshotAnchorIndex = code.indexOf('<div className="space-y-3">', code.indexOf('AI Outreach Message'));
  
  if (screenshotAnchorIndex > -1) {
    const before = code.substring(0, screenshotAnchorIndex);
    const after = code.substring(screenshotAnchorIndex);
    
    const vtonComponent = `
          {/* Virtual Try-On Module */}
          <LeadVirtualTryOn 
            lead={lead}
            onUpdateLead={(updates) => {
              // Optionally trigger immediate save or just update local state
              setScreenshots(prev => updates.vtonResults ? prev : prev); // Just a dummy if needed, but better to call onSaveLead or just rely on state.
              if (updates.vtonResults) {
                 const merged = { ...lead, vtonResults: updates.vtonResults };
                 onSaveLead(merged); // We save immediately to persist it
              }
            }}
            isDarkMode={false}
          />

          `;
    code = before + vtonComponent + after;
  }
}
fs.writeFileSync('src/components/LeadDetailDrawer.tsx', code);
