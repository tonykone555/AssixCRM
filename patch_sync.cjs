const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const syncLogic = `app.post('/api/ebay/sync-cron', async (req: any, res: any) => {
    const authHeader = req.headers.authorization;
    if (process.env.NODE_ENV === 'production' && authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
        return res.status(401).json({ error: 'Unauthorized CRON' });
    }
    
    const db = getFirestore();
    const connections = await db.collection('marketplaceConnections').where('provider', '==', 'ebay').where('connectionStatus', '==', 'connected').get();
    let synced = 0;
    
    for (const connDoc of connections.docs) {
        try {
           const conn = connDoc.data();
           const ownerUid = conn.ownerUid;
           const refreshToken = decryptToken(conn.encryptedRefreshToken);
           const env = conn.environment || 'sandbox';
           const tokenUrl = env === 'production' ? 'https://api.ebay.com/identity/v1/oauth2/token' : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';
           const authHeaderStr = Buffer.from(\`\${process.env.EBAY_CLIENT_ID}:\${process.env.EBAY_CLIENT_SECRET}\`).toString('base64');
           
           if (!process.env.EBAY_CLIENT_ID || !refreshToken) continue;
           
           const tokenRes = await fetch(tokenUrl, {
             method: 'POST',
             headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': \`Basic \${authHeaderStr}\` },
             body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, scope: 'https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.inventory' })
           });
           
           const tokenData = await tokenRes.json();
           if (!tokenData.access_token) continue;
           const accessToken = tokenData.access_token;
           
           const baseUrl = env === 'production' ? 'https://api.ebay.com/sell/fulfillment/v1' : 'https://api.sandbox.ebay.com/sell/fulfillment/v1';
           
           const ordersRes = await fetch(\`\${baseUrl}/order?filter=creationdate:[\${new Date(Date.now() - 24*60*60*1000).toISOString()}..]\`, {
               headers: { 'Authorization': \`Bearer \${accessToken}\` }
           });
           
           if (!ordersRes.ok) continue;
           const ordersData = await ordersRes.json();
           
           for (const order of ordersData.orders || []) {
               const orderRef = db.collection('orders').doc(order.orderId);
               await orderRef.set({
                   ownerUid,
                   marketplace: 'ebay',
                   externalOrderId: order.orderId,
                   fulfillmentStatus: order.orderFulfillmentStatus,
                   orderedAt: order.creationDate,
                   lastSyncedAt: new Date().toISOString()
               }, { merge: true });
               synced++;
           }
        } catch (e) {
            console.error('Error syncing connection', connDoc.id, e);
        }
    }
    
    res.json({ success: true, synced });
});`;

const syncRegex = /app\.post\('\/api\/ebay\/sync', requireMarketplaceAuth, async \(req: any, res: any\) => \{\s*res\.json\(\{ success: true, synced: 0 \}\);\s*\}\);/m;
code = code.replace(syncRegex, syncLogic);

fs.writeFileSync('server.ts', code);
