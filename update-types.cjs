const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');
code = code.replace(
  'screenshots: string[]; // List of screenshot image URLs or base64',
  'screenshots: string[]; // List of screenshot image URLs or base64\n  vtonResults?: string[]; // Generated Virtual Try-On images'
);
fs.writeFileSync('src/types.ts', code);
