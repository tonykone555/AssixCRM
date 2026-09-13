const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(
  /const dataToSave: Lead = \{[\s\S]*?updatedAt: new Date\(\)\.toISOString\(\)\n  \};/,
  `const dataToSave: any = {
    ...lead,
    ownerId: lead.ownerId || userUid,
    ownerEmail: lead.ownerEmail || userEmail,
    assignedAccountEmails: lead.assignedAccountEmails || [lead.ownerEmail || userEmail],
    updatedAt: new Date().toISOString()
  };
  
  // Remove undefined values to prevent Firestore errors
  Object.keys(dataToSave).forEach(key => dataToSave[key] === undefined && delete dataToSave[key]);`
);

fs.writeFileSync('src/lib/firebase.ts', code);
