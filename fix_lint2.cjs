const fs = require('fs');
let apple = fs.readFileSync('src/components/AppleCampaignModal.tsx', 'utf8');

apple = apple.replace(/\{\} \/\* scrapedGalleries \*\/\[currentLead\.id\]/g, "(currentLead as any).images");
fs.writeFileSync('src/components/AppleCampaignModal.tsx', apple);

console.log("Fixed lint 2.");
