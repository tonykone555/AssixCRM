const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetLine = "const apiKey = process.env.GEMINI_PAID_IMAGE_API_KEY || process.env.FREE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;";
const replacement = `const apiKey = process.env.GEMINI_PAID_IMAGE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'GEMINI_PAID_IMAGE_API_KEY is missing. Please add it to your environment variables/secrets to use AI Try-On.' });
      }`;

if (code.includes(targetLine)) {
    code = code.replace(
        targetLine + "\n      if (!apiKey) {\n        return res.status(500).json({ success: false, error: 'GEMINI_API_KEY is missing in secrets' });\n      }", 
        replacement
    );
    fs.writeFileSync('server.ts', code);
    console.log("Successfully patched server.ts");
} else {
    console.log("Could not find the target line.");
}
