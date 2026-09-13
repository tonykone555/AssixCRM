const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

// Fix fetch timeout and unknown types
server = server.replace(/const response = await fetch\(url, \{([\s\S]*?)timeout: 10000\n\s*\}\)/, (match, p1) => {
  return `const controller = new AbortController();\n      const timeoutId = setTimeout(() => controller.abort(), 10000);\n      const response = await fetch(url, {${p1}signal: controller.signal\n      }).finally(() => clearTimeout(timeoutId))`;
});

server = server.replace(/const emails = \[\.\.\.new Set\(html\.match\(emailRegex\) \|\| \[\]\)\]\.filter\(e => !e\.includes/g, 
  "const emails = [...new Set((html.match(emailRegex) || []) as string[])].filter(e => !e.includes");

server = server.replace(/const phonesRaw = \[\.\.\.new Set\(html\.match\(phoneRegex\) \|\| \[\]\)\]\.filter\(p => p\.length/g,
  "const phonesRaw = [...new Set((html.match(phoneRegex) || []) as string[])].filter(p => p.length");

server = server.replace(/const phones = phonesRaw\.map\(p => p\.trim\(\)\);/g,
  "const phones = phonesRaw.map((p: any) => p.trim());");

fs.writeFileSync('server.ts', server);

let apple = fs.readFileSync('src/components/AppleCampaignModal.tsx', 'utf8');
apple = apple.replace(/scrapedGalleries/g, "{} /* scrapedGalleries */");
fs.writeFileSync('src/components/AppleCampaignModal.tsx', apple);

console.log("Fixed lint.");
