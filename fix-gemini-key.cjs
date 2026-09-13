const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/FREE_GEMINI_API_KEY/g, 'GEMINI_API_KEY');

fs.writeFileSync('server.ts', code);
