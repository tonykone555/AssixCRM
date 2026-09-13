const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "let useGemini = !!process.env.GEMINI_API_KEY;",
  "let useGemini = !!process.env.FREE_GEMINI_API_KEY;"
);

code = code.replace(
  "const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });",
  "const ai = new GoogleGenAI({ apiKey: process.env.FREE_GEMINI_API_KEY });"
);

fs.writeFileSync('server.ts', code);
