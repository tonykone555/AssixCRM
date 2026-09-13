const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

// Add imports
const newImports = `import { getAuth } from 'firebase-admin/auth';\nimport { getFirestore } from 'firebase-admin/firestore';\n`;
code = code.replace(/import \* as admin from 'firebase-admin';/, "import * as admin from 'firebase-admin';\n" + newImports);

// Fix usages
code = code.replace(/\(admin as any\)\.firestore\(\)/g, 'getFirestore()');
code = code.replace(/admin\.firestore\(\)/g, 'getFirestore()');

code = code.replace(/\(admin as any\)\.auth\(\)/g, 'getAuth()');
code = code.replace(/admin\.auth\(\)/g, 'getAuth()');

code = code.replace(/\(admin as any\)\.messaging\(\)/g, "require('firebase-admin/messaging').getMessaging()");
code = code.replace(/admin\.messaging\(\)/g, "require('firebase-admin/messaging').getMessaging()");

fs.writeFileSync('server.ts', code);
