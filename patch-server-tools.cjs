const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// The new @google/genai SDK requires search grounding in tools like this: tools: [{ googleSearch: {} }]
// Let's import Type if needed, but it seems we just have a TS mismatch for GenerateContentParameters.
// We will just cast the config to any for the search tool call to bypass the strict TS interface for now.

code = code.replace(
  "tools: [{ googleSearch: {} }],",
  "tools: [{ googleSearch: {} }] as any,"
);

fs.writeFileSync('server.ts', code);
