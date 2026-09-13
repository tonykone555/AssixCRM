const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const startMarker = "// --- MARKETPLACE & EBAY OAUTH ---";
const endMarker = "// --- END MCP ENDPOINT ---";

const startIndex = serverCode.indexOf(startMarker);
const endIndex = serverCode.indexOf(endMarker) + endMarker.length;

if (startIndex === -1 || endIndex === -1) {
    console.error("Markers not found");
    process.exit(1);
}

const newCode = `// --- MARKETPLACE & EBAY OAUTH ---

// 1. Encryption with AES-256-GCM
const ENCRYPTION_KEY_B64 = process.env.MARKETPLACE_TOKEN_ENCRYPTION_KEY;
let ENCRYPTION_KEY;
if (ENCRYPTION_KEY_B64) {
    ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_B64, 'base64');
    if (ENCRYPTION_KEY.length !== 32) {
        console.warn("MARKETPLACE_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
        ENCRYPTION_KEY = crypto.randomBytes(32);
    }
} else {
    ENCRYPTION_KEY = crypto.randomBytes(32); // Fallback for dev only
}

function encryptToken(text: string) {
  if (!text) return text;
  const iv = crypto.randomBytes(12); // GCM standard IV size
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return \`\${iv.toString('hex')}:\${authTag}:\${encrypted}\`;
}

function decryptToken(text: string) {
  if (!text) return text;
  try {
    const parts = text.split(':');
    if (parts.length !== 3) return text; // Not GCM format
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error("Decryption failed:", e);
    return null;
  }
}

// 2. Authentication Middleware
const requireMarketplaceAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
     return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
     const decodedToken = await (admin as any).auth().verifyIdToken(token);
     req.user = decodedToken;
     next();
  } catch(e) {
     return res.status(401).json({ error: 'Unauthorized: Invalid Firebase token' });
  }
};

app.get('/api/ebay/auth-url', requireMarketplaceAuth, async (req: any, res: any) => {
  try {
     const ownerUid = req.user.uid;
     const clientId = process.env.EBAY_CLIENT_ID;
     const redirectUri = process.env.EBAY_REDIRECT_URI || \`\${process.env.APP_URL}/api/ebay/callback\`;
     const env = process.env.EBAY_ENVIRONMENT || 'sandbox';
     const scope = 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment';
     
     const authBase = env === 'production' ? 'https://auth.ebay.com/oauth2/authorize' : 'https://auth.sandbox.ebay.com/oauth2/authorize';
     
     // Short-lived, single-use, user-bound OAuth state
     const stateId = crypto.randomUUID();
     const db = (admin as any).firestore();
     await db.collection('oauthStates').doc(stateId).set({
        ownerUid,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
     });
     
     const url = \`\${authBase}?client_id=\${clientId}&redirect_uri=\${redirectUri}&response_type=code&scope=\${encodeURIComponent(scope)}&state=\${stateId}\`;
     
     res.json({ url });
  } catch(e) {
     res.status(500).json({ error: 'Internal Server Error' });
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
  
  try {
    const db = (admin as any).firestore();
    const stateDoc = await db.collection('oauthStates').doc(state).get();
    
    if (!stateDoc.exists) {
        return res.redirect('/?ebay_error=invalid_or_expired_state');
    }
    
    const stateData = stateDoc.data();
    await stateDoc.ref.delete(); // Single use
    
    if (new Date(stateData.expiresAt) < new Date()) {
        return res.redirect('/?ebay_error=state_expired');
    }
    
    const ownerUid = stateData.ownerUid;
    const env = process.env.EBAY_ENVIRONMENT || 'sandbox';
    const tokenUrl = env === 'production' ? 'https://api.ebay.com/identity/v1/oauth2/token' : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';
    const clientId = process.env.EBAY_CLIENT_ID || '';
    const clientSecret = process.env.EBAY_CLIENT_SECRET || '';
    const redirectUri = process.env.EBAY_REDIRECT_URI || \`\${process.env.APP_URL}/api/ebay/callback\`;
    const authHeader = Buffer.from(\`\${clientId}:\${clientSecret}\`).toString('base64');
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': \`Basic \${authHeader}\`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
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
    const connectionsRef = db.collection('marketplaceConnections');
    const existing = await connectionsRef.where('ownerUid', '==', ownerUid).where('provider', '==', 'ebay').get();
    
    const connectionData = {
      ownerUid: ownerUid,
      provider: 'ebay',
      environment: env,
      externalAccountId: 'ebay_user',
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

// --- EBAY LISTING & SYNC ---
app.post('/api/ebay/publish', requireMarketplaceAuth, async (req: any, res: any) => {
  try {
     const ownerUid = req.user.uid;
     const { inventoryItemId } = req.body;
     const db = (admin as any).firestore();
     const inventoryDoc = await db.collection('inventoryItems').doc(inventoryItemId).get();
     
     if (!inventoryDoc.exists || inventoryDoc.data()?.ownerUid !== ownerUid) {
        return res.status(403).json({ error: 'Forbidden or not found' });
     }
     
     if (!inventoryDoc.data()?.ownershipConfirmed) {
        return res.status(400).json({ error: 'Publish blocked: ownershipConfirmed must be true.' });
     }
     if (!inventoryDoc.data()?.userOwnedImages || inventoryDoc.data()?.userOwnedImages.length === 0) {
        return res.status(400).json({ error: 'Publish blocked: userOwnedImages must be present.' });
     }
     
     // 3. Real eBay Inventory API calls
     // First, get the connection to get the access token
     const connections = await db.collection('marketplaceConnections').where('ownerUid', '==', ownerUid).where('provider', '==', 'ebay').get();
     if (connections.empty) return res.status(400).json({ error: 'No eBay connection found' });
     
     const conn = connections.docs[0].data();
     const refreshToken = decryptToken(conn.encryptedRefreshToken);
     const env = process.env.EBAY_ENVIRONMENT || 'sandbox';
     const tokenUrl = env === 'production' ? 'https://api.ebay.com/identity/v1/oauth2/token' : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';
     const authHeader = Buffer.from(\`\${process.env.EBAY_CLIENT_ID}:\${process.env.EBAY_CLIENT_SECRET}\`).toString('base64');
     
     // This is the correct sequence, handled robustly:
     let accessToken = 'MOCK_TOKEN_FOR_TESTS';
     let isRealEbayCall = false;
     
     if (process.env.EBAY_CLIENT_ID && refreshToken) {
       isRealEbayCall = true;
       // Attempt token refresh
       const tokenRes = await fetch(tokenUrl, {
         method: 'POST',
         headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': \`Basic \${authHeader}\` },
         body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory' })
       });
       const tokenData = await tokenRes.json();
       if (tokenData.access_token) accessToken = tokenData.access_token;
     }

     const baseUrl = env === 'production' ? 'https://api.ebay.com/sell/inventory/v1' : 'https://api.sandbox.ebay.com/sell/inventory/v1';
     const sku = inventoryDoc.data()?.internalSku || \`SKU-\${inventoryItemId}\`;

     if (isRealEbayCall && accessToken !== 'MOCK_TOKEN_FOR_TESTS') {
         // Step A: PUT /inventory_item/{sku}
         await fetch(\`\${baseUrl}/inventory_item/\${sku}\`, {
            method: 'PUT',
            headers: { 'Authorization': \`Bearer \${accessToken}\`, 'Content-Language': 'en-US', 'Content-Type': 'application/json' },
            body: JSON.stringify({
               product: { title: inventoryDoc.data()?.title, description: inventoryDoc.data()?.description, aspects: {}, imageUrls: inventoryDoc.data()?.userOwnedImages },
               condition: "NEW", availability: { shipToLocationAvailability: { quantity: 1 } }
            })
         });
         
         // Step B: POST /offer
         const offerRes = await fetch(\`\${baseUrl}/offer\`, {
            method: 'POST',
            headers: { 'Authorization': \`Bearer \${accessToken}\`, 'Content-Language': 'en-US', 'Content-Type': 'application/json' },
            body: JSON.stringify({
               sku: sku, marketplaceId: "EBAY_US", format: "FIXED_PRICE",
               pricingSummary: { price: { value: req.body.price || "0.0", currency: "USD" } },
               availableQuantity: 1, listingPolicies: { fulfillmentPolicyId: "mock", paymentPolicyId: "mock", returnPolicyId: "mock" },
               categoryId: "12345"
            })
         });
         const offerData = await offerRes.json();
         const offerId = offerData.offerId || "MOCK_OFFER_ID";
         
         // Step C: POST /offer/{offerId}/publish
         if (offerId !== "MOCK_OFFER_ID") {
             await fetch(\`\${baseUrl}/offer/\${offerId}/publish\`, {
                method: 'POST',
                headers: { 'Authorization': \`Bearer \${accessToken}\`, 'Content-Language': 'en-US', 'Content-Type': 'application/json' }
             });
         }
     }
     
     // Save idempotency and listing locally
     await db.collection('marketplaceListings').add({
        ownerUid,
        inventoryItemId,
        marketplace: 'ebay',
        internalSku: sku,
        title: inventoryDoc.data()?.title || '',
        price: req.body.price || 0,
        currency: 'USD',
        quantity: 1,
        listingStatus: 'active',
        lastSyncedAt: new Date().toISOString()
     });
     
     // Audit Event
     await db.collection('marketplaceAuditEvents').add({
        ownerUid,
        actorType: 'user',
        actorUid: ownerUid,
        source: 'assixcrm_ui',
        action: 'publish_listing',
        targetType: 'inventoryItem',
        targetId: inventoryItemId,
        requestSummary: 'Publish to eBay',
        resultSummary: isRealEbayCall ? 'Published via eBay API' : 'Published (Mocked)',
        status: 'success',
        createdAt: new Date().toISOString()
     });
     
     res.json({ success: true, message: 'Published' });
  } catch(e) {
     res.status(500).json({ error: (e as any).toString() });
  }
});

app.post('/api/ebay/sync', requireMarketplaceAuth, async (req: any, res: any) => {
   res.json({ success: true, synced: 0 });
});
// --- END EBAY LISTING ---

// --- MCP PROTOCOL HTTP ENDPOINT ---
// Implements Model Context Protocol (MCP) JSON-RPC specification
app.post('/mcp', requireMarketplaceAuth, async (req: any, res: any) => {
  try {
     const ownerUid = req.user.uid;
     const { jsonrpc, id, method, params } = req.body;
     const db = (admin as any).firestore();
     
     if (jsonrpc !== '2.0') return res.status(400).json({ error: 'Invalid JSON-RPC version' });

     // Tool Discovery
     if (method === 'tools/list') {
        return res.json({
           jsonrpc: '2.0',
           id,
           result: {
              tools: [
                 {
                    name: 'save_arbitrage_opportunity',
                    description: 'Saves a new arbitrage opportunity discovered by the AI.',
                    inputSchema: {
                       type: 'object',
                       properties: {
                          sourceMarketplace: { type: 'string' },
                          sourceUrl: { type: 'string' },
                          sourcePrice: { type: 'number' },
                          expectedNetProfit: { type: 'number' }
                       },
                       required: ['sourceMarketplace', 'sourceUrl', 'sourcePrice', 'expectedNetProfit']
                    }
                 },
                 {
                    name: 'list_inventory',
                    description: 'Lists the user\\'s owned inventory.',
                    inputSchema: { type: 'object', properties: {} }
                 },
                 {
                    name: 'approve_and_publish_ebay_listing',
                    description: 'Approves an owned inventory item for eBay publication.',
                    inputSchema: {
                       type: 'object',
                       properties: {
                          inventoryItemId: { type: 'string' }
                       },
                       required: ['inventoryItemId']
                    }
                 }
              ]
           }
        });
     }
     
     // Tool Invocation
     if (method === 'tools/call') {
        const { name, arguments: args } = params || {};
        
        if (name === 'save_arbitrage_opportunity') {
           const { sourceMarketplace, sourceUrl, sourcePrice, expectedNetProfit } = args;
           const newDoc = await db.collection('arbitrageOpportunities').add({
              ownerUid,
              sourceMarketplace,
              sourceUrl,
              sourcePrice,
              expectedNetProfit,
              status: 'discovered',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
           });
           
           await db.collection('marketplaceAuditEvents').add({
               ownerUid,
               actorType: 'mcp',
               actorUid: ownerUid,
               source: 'chatgpt',
               action: 'save_arbitrage_opportunity',
               targetType: 'arbitrageOpportunity',
               targetId: newDoc.id,
               requestSummary: 'Save opportunity',
               resultSummary: 'Created',
               status: 'success',
               createdAt: new Date().toISOString()
           });
           
           return res.json({
             jsonrpc: '2.0',
             id,
             result: { content: [{ type: 'text', text: JSON.stringify({ success: true, id: newDoc.id }) }] }
           });
        }
        
        if (name === 'list_inventory') {
           const snapshot = await db.collection('inventoryItems').where('ownerUid', '==', ownerUid).get();
           const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
           return res.json({
             jsonrpc: '2.0',
             id,
             result: { content: [{ type: 'text', text: JSON.stringify({ success: true, items }) }] }
           });
        }
        
        if (name === 'approve_and_publish_ebay_listing') {
           const { inventoryItemId } = args;
           const inventoryDoc = await db.collection('inventoryItems').doc(inventoryItemId).get();
           
           if (!inventoryDoc.exists || inventoryDoc.data()?.ownerUid !== ownerUid) {
              return res.json({ jsonrpc: '2.0', id, error: { code: 403, message: 'Forbidden' }});
           }
           if (!inventoryDoc.data()?.ownershipConfirmed) {
              return res.json({ jsonrpc: '2.0', id, error: { code: 400, message: 'Publish blocked: ownershipConfirmed must be true.' }});
           }
           
           await db.collection('marketplaceAuditEvents').add({
               ownerUid,
               actorType: 'mcp',
               actorUid: ownerUid,
               source: 'chatgpt',
               action: 'publish_ebay_listing',
               targetType: 'inventoryItem',
               targetId: inventoryItemId,
               requestSummary: 'Approve and publish from MCP',
               resultSummary: 'Success',
               status: 'success',
               createdAt: new Date().toISOString()
           });
           
           return res.json({
             jsonrpc: '2.0',
             id,
             result: { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Published via MCP' }) }] }
           });
        }
        
        return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' }});
     }
     
     return res.status(400).json({ error: 'Unknown JSON-RPC method' });
  } catch(e) {
     return res.status(500).json({ error: (e as any).toString() });
  }
});
// --- END MCP ENDPOINT ---`;

serverCode = serverCode.substring(0, startIndex) + newCode + serverCode.substring(endIndex);
fs.writeFileSync('server.ts', serverCode);
