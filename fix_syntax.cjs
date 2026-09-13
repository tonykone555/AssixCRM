const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/res\.status\(500\)\.json\(\{ error: \(e as any\)\.toString\(\) \}\);\n  \}\napp\.post\('\/api\/ebay\/sync-cron'/m, "res.status(500).json({ error: (e as any).toString() });\n  }\n});\napp.post('/api/ebay/sync-cron'");

fs.writeFileSync('server.ts', code);
