const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const publishLogic = `
async function publishToEbay(ownerUid: string, inventoryItemId: string, price: number) {
     const db = getFirestore();
     const inventoryDoc = await db.collection('inventoryItems').doc(inventoryItemId).get();
     
     if (!inventoryDoc.exists || inventoryDoc.data()?.ownerUid !== ownerUid) {
        throw new Error('Forbidden or not found');
     }
     
     if (!inventoryDoc.data()?.ownershipConfirmed) {
        throw new Error('Publish blocked: ownershipConfirmed must be true.');
     }
     if (!inventoryDoc.data()?.userOwnedImages || inventoryDoc.data()?.userOwnedImages.length === 0) {
        throw new Error('Publish blocked: userOwnedImages must be present.');
     }
     if (!inventoryDoc.data()?.condition) {
        throw new Error('Publish blocked: condition must be provided.');
     }
     if (price <= 0) {
        throw new Error('Publish blocked: Price must be strictly positive.');
     }
     
     const connections = await db.collection('marketplaceConnections').where('ownerUid', '==', ownerUid).where('provider', '==', 'ebay').get();
     if (connections.empty) throw new Error('No eBay connection found');
     
     const conn = connections.docs[0].data();
     const refreshToken = decryptToken(conn.encryptedRefreshToken);
     const env = conn.environment || 'sandbox'; // use connection env, not process.env
     const tokenUrl = env === 'production' ? 'https://api.ebay.com/identity/v1/oauth2/token' : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token';
     const authHeader = Buffer.from(\`\${process.env.EBAY_CLIENT_ID}:\${process.env.EBAY_CLIENT_SECRET}\`).toString('base64');
     
     if (!process.env.EBAY_CLIENT_ID || !refreshToken) {
         throw new Error('Missing eBay credentials or refresh token');
     }
     
     const tokenRes = await fetch(tokenUrl, {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': \`Basic \${authHeader}\` },
       body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory' })
     });
     
     const tokenData = await tokenRes.json();
     if (!tokenData.access_token) {
        throw new Error('eBay token refresh failed: ' + JSON.stringify(tokenData));
     }
     const accessToken = tokenData.access_token;
     
     const baseUrl = env === 'production' ? 'https://api.ebay.com/sell/inventory/v1' : 'https://api.sandbox.ebay.com/sell/inventory/v1';
     const sku = inventoryDoc.data()?.internalSku || \`SKU-\${inventoryItemId}\`;
     
     // Required aspects check
     // (In a real production app, we would fetch taxonomy requirements. We simulate the HTTP validation structure here).
     
     const putRes = await fetch(\`\${baseUrl}/inventory_item/\${sku}\`, {
        method: 'PUT',
        headers: { 'Authorization': \`Bearer \${accessToken}\`, 'Content-Language': 'en-US', 'Content-Type': 'application/json' },
        body: JSON.stringify({
           product: { title: inventoryDoc.data()?.title, description: inventoryDoc.data()?.description, aspects: inventoryDoc.data()?.attributes || {}, imageUrls: inventoryDoc.data()?.userOwnedImages },
           condition: inventoryDoc.data()?.condition, availability: { shipToLocationAvailability: { quantity: 1 } }
        })
     });
     
     if (!putRes.ok) {
         const putErr = await putRes.text();
         throw new Error('eBay PUT inventory failed: ' + putErr);
     }
     
     const offerRes = await fetch(\`\${baseUrl}/offer\`, {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${accessToken}\`, 'Content-Language': 'en-US', 'Content-Type': 'application/json' },
        body: JSON.stringify({
           sku: sku, marketplaceId: "EBAY_US", format: "FIXED_PRICE",
           pricingSummary: { price: { value: price.toString(), currency: "USD" } },
           availableQuantity: 1, listingPolicies: { fulfillmentPolicyId: conn.fulfillmentPolicyId, paymentPolicyId: conn.paymentPolicyId, returnPolicyId: conn.returnPolicyId },
           categoryId: inventoryDoc.data()?.category || "UNKNOWN",
           merchantLocationKey: conn.merchantLocationKey
        })
     });
     
     const offerData = await offerRes.json();
     if (!offerRes.ok || !offerData.offerId) {
        throw new Error('eBay POST offer failed: ' + JSON.stringify(offerData));
     }
     
     const publishRes = await fetch(\`\${baseUrl}/offer/\${offerData.offerId}/publish\`, {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${accessToken}\`, 'Content-Language': 'en-US', 'Content-Type': 'application/json' }
     });
     
     const publishData = await publishRes.json();
     if (!publishRes.ok || !publishData.listingId) {
        throw new Error('eBay publish offer failed: ' + JSON.stringify(publishData));
     }
     
     // Save idempotency and listing locally
     await db.collection('marketplaceListings').add({
        ownerUid,
        inventoryItemId,
        marketplace: 'ebay',
        internalSku: sku,
        externalOfferId: offerData.offerId,
        externalListingId: publishData.listingId,
        title: inventoryDoc.data()?.title || '',
        price: price,
        currency: 'USD',
        quantity: 1,
        listingStatus: 'active',
        lastSyncedAt: new Date().toISOString()
     });
     
     await db.collection('marketplaceAuditEvents').add({
        ownerUid,
        actorType: 'user',
        actorUid: ownerUid,
        source: 'assixcrm_ui',
        action: 'publish_listing',
        targetType: 'inventoryItem',
        targetId: inventoryItemId,
        requestSummary: 'Publish to eBay',
        resultSummary: 'Published via eBay API',
        status: 'success',
        createdAt: new Date().toISOString()
     });
     
     return publishData.listingId;
}
`;

// Replace the route logic
const routeRegex = /app\.post\('\/api\/ebay\/publish', requireMarketplaceAuth, async \(req: any, res: any\) => \{[\s\S]*?\}\);/m;
const newRoute = `app.post('/api/ebay/publish', requireMarketplaceAuth, async (req: any, res: any) => {
  try {
     const listingId = await publishToEbay(req.user.uid, req.body.inventoryItemId, req.body.price);
     res.json({ success: true, listingId });
  } catch(e) {
     const db = getFirestore();
     await db.collection('marketplaceAuditEvents').add({
        ownerUid: req.user.uid, actorType: 'user', actorUid: req.user.uid, source: 'assixcrm_ui', action: 'publish_listing', targetType: 'inventoryItem', targetId: req.body.inventoryItemId,
        requestSummary: 'Publish to eBay', resultSummary: 'Failed: ' + (e as any).toString(), status: 'failure', createdAt: new Date().toISOString()
     });
     res.status(500).json({ error: (e as any).toString() });
  }
});`;

code = code.replace(routeRegex, publishLogic + '\n' + newRoute);

// Also replace the MCP call
const mcpReplace = /\/\/ We must invoke the real publication service logic here instead of duplicating\.[\s\S]*?return \{ content: \[\{ type: 'text', text: JSON\.stringify\(\{ success: true, message: 'Published via MCP' \}\) \}\] \};/m;
code = code.replace(mcpReplace, `const listingId = await publishToEbay(ownerUid, inventoryItemId, args.price || 0);\n           return { content: [{ type: 'text', text: JSON.stringify({ success: true, listingId }) }] };`);

fs.writeFileSync('server.ts', code);
