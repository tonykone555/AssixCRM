const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `
            if (data.success) {
              const isJunk = (val?: string) => !val || val.trim() === '' || val.toLowerCase().includes('lead') || val.toLowerCase() === 'n/a' || val.toLowerCase() === 'unknown';
              const updates: Partial<Lead> = {};
              
              if (isJunk(lead.name) && data.brandName) {
                updates.name = data.brandName;
              }
              if (isJunk(lead.email) && data.emails && data.emails.length > 0) {
                updates.email = data.emails[0];
              }
              if (isJunk(lead.instagramHandle) && data.instagram && data.instagram.length > 0) {
                updates.instagramHandle = data.instagram[0];
              }
              if (isJunk(lead.phone) && data.phones && data.phones.length > 0) {
                updates.phone = data.phones[0];
              }
              if (Object.keys(updates).length > 0) {
                await handleUpdateLead({ ...lead, ...updates });
                triggerToast(\`Enriched \${updates.name || lead.name} successfully\`);
              } else {
                triggerToast(\`No new data found for \${lead.website}\`);
              }
            } else {
              triggerToast(\`Failed to scrape \${lead.website}\`);
            }
`;

code = code.replace(/            if \(data\.success\) \{[\s\S]*?if \(Object\.keys\(updates\)\.length > 0\) \{[\s\S]*?\}\n            \}/, replacement.trim());
fs.writeFileSync('src/App.tsx', code);
console.log('Patched src/App.tsx');
