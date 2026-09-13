const fs = require('fs');
let code = fs.readFileSync('src/components/ImportExportModal.tsx', 'utf8');

const replacement = `
                  if (isJunk(currentLead.name) && data.brandName) {
                    currentLead.name = data.brandName;
                  }
                  if (isJunk(currentLead.email) && data.emails && data.emails.length > 0) {
                    currentLead.email = data.emails[0];
                  }
                  // Force replace if the handle has 'lead' in it or is blank
                  if (isJunk(currentLead.instagramHandle) && data.instagram && data.instagram.length > 0) {
                    currentLead.instagramHandle = data.instagram[0];
                  }
                  if (isJunk(currentLead.phone) && data.phones && data.phones.length > 0) {
                    currentLead.phone = data.phones[0];
                  }
`;

code = code.replace(/                  if \(isJunk\(currentLead\.name\) && data\.brandName\) \{[\s\S]*?currentLead\.phone = data\.phones\[0\];\n                  \}/, replacement.trim());
fs.writeFileSync('src/components/ImportExportModal.tsx', code);
console.log('Patched ImportExportModal.tsx');
