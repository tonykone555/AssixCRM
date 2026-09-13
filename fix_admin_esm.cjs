const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /  try \{\n    const \{ initializeApp, cert \} = require\('firebase-admin\/app'\);\n    if \(process\.env\.FIREBASE_SERVICE_ACCOUNT_KEY\) \{[\s\S]*?adminInitialized = true;\n  \} catch \(err\) \{\n    console\.error\("Failed to initialize Firebase Admin:", err\);\n  \}/m;

const replacement = `  try {
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

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code);
