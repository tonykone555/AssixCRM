const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The user specifically asked to use FREE_GEMINI_API_KEY
code = code.replace(/process\.env\.GEMINI_API_KEY/g, "process.env.FREE_GEMINI_API_KEY");
// Fix model names
code = code.replace(/gemini-2\.5-flash/g, "gemini-3.6-flash");

fs.writeFileSync('server.ts', code);
