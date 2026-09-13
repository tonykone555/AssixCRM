const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const cryptoImport = "import crypto from 'crypto';\n";
if (!code.includes("import crypto")) {
    code = cryptoImport + code;
}

const ebayCode = `
// --- MARKETPLACE & EBAY OAUTH ---
const ENCRYPTION_KEY = process.env.MARKETPLACE_TOKEN_ENCRYPTION_KEY || 'default_key_needs_to_be_32_bytes_long_'.substring(0, 32);
const IV_LENGTH = 16;

function encryptToken(text: string) {
  if (!text) return text;
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptToken(text: string) {
  if (!text) return text;
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift()!, 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

app.get('/api/ebay/auth-url', async (req: any, res: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
     return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
     const decodedToken = await admin.auth().verifyIdToken(token);
     const ownerUid = decodedToken.uid;
     
     const clientId = process.env.EBAY_CLIENT_ID;
     const redirectUri = process.env.EBAY_REDIRECT_URI || \`\${process.env.APP_URL}/api/ebay/callback\`;
     const env = process.env.EBAY_ENVIRONMENT || 'sandbox';
     const scope = 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment';
     
     const authBase = env === 'production' ? 'https://auth.ebay.com/oauth2/authorize' : 'https://auth.sandbox.ebay.com/oauth2/authorize';
     
     const stateObj = { uid: ownerUid, timestamp: Date.now() };
     const state = Buffer.from(JSON.stringify(stateObj)).toString('base64');
     
     const url = \`\${authBase}?client_id=\${clientId}&redirect_uri=\${redirectUri}&response_type=code&scope=\${encodeURIComponent(scope)}&state=\${state}\`;
     
     res.json({ url });
  } catch(e) {
     res.status(401).json({ error: 'Invalid token' });
  }
});

app.get('/api/ebay/callback', async (req: any, res: any) => {
  const { code, state, error, error_description } = req.query;
  
  if (error) {
     return res.redirect('/?ebay_error=' + encodeURIComponent(error_description || error));
  }
  
  if (!code || !state) {
     return res.redirect('/?ebay_error=missing_params');
  }
  
  let ownerUid;
  try {
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    ownerUid = decodedState.uid;
  } catch(e) {
    return res.redirect('/?ebay_error=invalid_state');
  }
  
  const env = process.env.EBAY_ENVIRONMENT || 'sandbox';
  const tokenUrl = env === 'production' ? 'https://api.ebay.com/identity/v1/oauth2/token' : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';
  
  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  const redirectUri = process.env.EBAY_REDIRECT_URI || \`\${process.env.APP_URL}/api/ebay/callback\`;
  
  const authHeader = Buffer.from(\`\${clientId}:\${clientSecret}\`).toString('base64');
  
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': \`Basic \${authHeader}\`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      })
    });
    
    const data = await response.json();
    if (data.error) {
      console.error("eBay Token Error:", data);
      return res.redirect('/?ebay_error=' + encodeURIComponent(data.error_description || data.error));
    }
    
    const refreshToken = data.refresh_token;
    
    if (!refreshToken) {
       return res.redirect('/?ebay_error=no_refresh_token_returned');
    }
    
    const encryptedToken = encryptToken(refreshToken);
    
    // Upsert connection
    const db = admin.firestore();
    const connectionsRef = db.collection('marketplaceConnections');
    const existing = await connectionsRef.where('ownerUid', '==', ownerUid).where('provider', '==', 'ebay').get();
    
    const connectionData = {
      ownerUid: ownerUid,
      provider: 'ebay',
      environment: env,
      externalAccountId: 'ebay_user', // Should query account API ideally
      displayName: 'eBay Account',
      encryptedRefreshToken: encryptedToken,
      grantedScopes: data.scope ? data.scope.split(' ') : [],
      connectionStatus: 'connected',
      connectedAt: new Date().toISOString(),
      refreshedAt: new Date().toISOString()
    };
    
    if (existing.empty) {
       await connectionsRef.add(connectionData);
    } else {
       await existing.docs[0].ref.update(connectionData);
    }
    
    res.redirect('/?ebay_success=true');
  } catch(e) {
    console.error(e);
    res.redirect('/?ebay_error=server_error');
  }
});
// --- END MARKETPLACE ---

`;

code = code.replace("if (process.env.NODE_ENV !== 'production') {", ebayCode + "if (process.env.NODE_ENV !== 'production') {");
fs.writeFileSync('server.ts', code);
console.log("eBay OAuth routes added.");
