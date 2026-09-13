const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const authRegex = /const requireMarketplaceAuth = async \(req: any, res: any, next: any\) => \{[\s\S]*?next\(\);\n  \} catch\(e\) \{\n     return res\.status\(401\)\.json\(\{ error: 'Unauthorized: Invalid Firebase token' \}\);\n  \}\n\};/m;

const newAuth = `const requireMarketplaceAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token;
  
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : queryToken;
  
  if (!token) {
     return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  
  try {
     const decodedToken = await getAuth().verifyIdToken(token);
     req.user = decodedToken;
     return next();
  } catch(e) {
     // Try MCP PAT token
     try {
         const db = getFirestore();
         const patQuery = await db.collection('mcpTokens').where('token', '==', token).get();
         if (!patQuery.empty) {
             const patDoc = patQuery.docs[0].data();
             req.user = { uid: patDoc.ownerUid, isMcpPat: true };
             return next();
         }
     } catch(patErr) {}
     
     return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};`;

code = code.replace(authRegex, newAuth);

// Ensure we don't have duplicated server logic
fs.writeFileSync('server.ts', code);
