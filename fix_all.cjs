const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Fix args.price
code = code.replace(
  /const listingId = await publishToEbay\(ownerUid, inventoryItemId, args\.price \|\| 0\);/,
  'const listingId = await publishToEbay(ownerUid, inventoryItemId, (args as any).price || 0);'
);

// 2. Fix admin init
const adminRegex = /  try \{\n    if \(process\.env\.FIREBASE_SERVICE_ACCOUNT_KEY\) \{[\s\S]*?adminInitialized = true;\n    \} else \{\n      console\.warn\("FIREBASE_SERVICE_ACCOUNT_KEY not set in environment\. Push notifications will be disabled\."\);\n    \}\n  \} catch \(err\) \{\n    console\.error\("Failed to initialize Firebase Admin:", err\);\n  \}/m;

const adminReplacement = `  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      let serviceAccount;
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY.startsWith('{')) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      } else {
        serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'utf8'));
      }
      admin.initializeApp({
        credential: admin.cert(serviceAccount)
      });
    } else {
      console.warn("FIREBASE_SERVICE_ACCOUNT_KEY not set. Initializing with default credentials.");
      admin.initializeApp();
    }
    adminInitialized = true;
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err);
  }`;
code = code.replace(adminRegex, adminReplacement);

// 3. Fix sync-cron try catch
const cronRegex = /app\.post\('\/api\/ebay\/sync-cron', async \(req: any, res: any\) => \{\n    const authHeader = req\.headers\.authorization;\n    if \(process\.env\.NODE_ENV === 'production' && authHeader !== `Bearer \$\{process\.env\.CRON_SECRET\}`\) \{\n        return res\.status\(401\)\.json\(\{ error: 'Unauthorized CRON' \}\);\n    \}\n    \n    const db = getFirestore\(\);/m;

const cronReplacement = `app.post('/api/ebay/sync-cron', async (req: any, res: any) => {
    try {
        const authHeader = req.headers.authorization;
        if (process.env.NODE_ENV === 'production' && authHeader !== \`Bearer \$\{process.env.CRON_SECRET\}\`) {
            return res.status(401).json({ error: 'Unauthorized CRON' });
        }
        
        const db = getFirestore();`;

const cronEndRegex = /        \}\n    \}\n    \n    res\.json\(\{ success: true, synced \}\);\n\}\);/m;
const cronEndReplacement = `        }
    }
    
    res.json({ success: true, synced });
    } catch(err: any) {
        console.error('CRON ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});`;

code = code.replace(cronRegex, cronReplacement);
code = code.replace(cronEndRegex, cronEndReplacement);

fs.writeFileSync('server.ts', code);
