const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /app\.post\('\/api\/ebay\/sync-cron', async \(req: any, res: any\) => \{([\s\S]*?)\}\);/m;
const match = code.match(regex);
if (match) {
   const inner = match[1];
   const newInner = `
   try {
     ${inner}
   } catch (err: any) {
     console.error('CRON CRASH:', err);
     res.status(500).json({ error: err.message });
   }
   `;
   code = code.replace(regex, `app.post('/api/ebay/sync-cron', async (req: any, res: any) => {${newInner}});`);
   fs.writeFileSync('server.ts', code);
}
