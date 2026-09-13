const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "let useGemini = false; // Disabled by user request to keep it 100% free (Tesseract only)",
  "let useGemini = !!process.env.GEMINI_API_KEY;"
);

fs.writeFileSync('server.ts', code);
