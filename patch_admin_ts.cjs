const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/admin\.auth\(\)/g, '(admin as any).auth()');
code = code.replace(/admin\.firestore\(\)/g, '(admin as any).firestore()');

fs.writeFileSync('server.ts', code);
