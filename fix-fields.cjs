const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const oldSub = `  const isSuperAdmin = isSuperAdminEmail(userEmail);

  const q = isSuperAdmin ? query(fieldsRef) : query(fieldsRef, where('ownerId', '==', userUid));`;

const newSub = `  const q = query(fieldsRef); // Globally shared`;

code = code.replace(oldSub, newSub);
fs.writeFileSync('src/lib/firebase.ts', code);
