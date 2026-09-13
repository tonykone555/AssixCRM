const fs = require('fs');
let code = fs.readFileSync('src/components/LeadRadar.tsx', 'utf8');
code = code.replace("item.website.replace(/^https?:\\\\/\\\\//i, '')", "item.website.replace(/^https?:\\/\\//i, '')");
code = code.replace("item.website.replace(/^https?:\\/\\//i, '')", "item.website.replace(/^https?:\\/\\//i, '')");
fs.writeFileSync('src/components/LeadRadar.tsx', code);
