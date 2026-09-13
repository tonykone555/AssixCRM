const fs = require('fs');
const code = fs.readFileSync('server.ts', 'utf8');
if (code.includes('Tesseract')) {
  console.log("Tesseract fallback exists in code.");
}
