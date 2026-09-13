const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Completely remove the tools array from the type-checked parameters, as the older TS definitions
// in the SDK version installed might not support it perfectly. We can rely purely on the text prompt
// to have the AI return the URL since it has internet knowledge, or we can just bypass TS.
// Since we used `as any`, let's just make the whole object `as any`.

code = code.replace(
  "const searchResponse = await ai.models.generateContent({",
  "const searchResponse = await ai.models.generateContent({\n          model: 'gemini-3.1-flash',\n          contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],\n          tools: [{ googleSearch: {} }],\n          config: { responseMimeType: 'application/json' }\n        } as any);\n        /*"
);

code = code.replace(
  "        });\n        \n        const searchData",
  "        */\n        const searchData"
);

fs.writeFileSync('server.ts', code);
