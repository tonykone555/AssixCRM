const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId)).catch(err => null);
`;

code = code.replace(/      const controller = new AbortController\(\);[\s\S]*?catch\(err => null\);/, replacement.trim());
fs.writeFileSync('server.ts', code);
console.log('Patched server.ts');
