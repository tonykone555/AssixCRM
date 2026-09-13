const fs = require('fs');
let code = fs.readFileSync('src/components/PipelineView.tsx', 'utf8');

if (!code.includes("onUpdateLead: (lead: Lead) => void;")) {
  code = code.replace(
    "  onOpenScreenshotLightbox: (lead: Lead, imageIndex?: number) => void;",
    "  onOpenScreenshotLightbox: (lead: Lead, imageIndex?: number) => void;\n  onUpdateLead: (lead: Lead) => void;"
  );
  code = code.replace(
    "  onOpenScreenshotLightbox,",
    "  onOpenScreenshotLightbox,\n  onUpdateLead,"
  );
  fs.writeFileSync('src/components/PipelineView.tsx', code);
}
