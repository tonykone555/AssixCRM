const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const mcpCode = `
// --- MCP ENDPOINT FOR CHATGPT ---
app.post('/mcp', async (req: any, res: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.split('Bearer ')[1];
  try {
     const decoded = await admin.auth().verifyIdToken(token);
     const ownerUid = decoded.uid;
     
     const { action, params } = req.body;
     const db = admin.firestore();
     
     if (action === 'save_arbitrage_opportunity') {
        const { sourceMarketplace, sourceUrl, sourcePrice, expectedNetProfit } = params;
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
        
        return res.json({ success: true, id: newDoc.id });
     }
     
     if (action === 'list_inventory') {
        const snapshot = await db.collection('inventoryItems').where('ownerUid', '==', ownerUid).get();
        const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        return res.json({ success: true, items });
     }
     
     if (action === 'approve_and_publish_ebay_listing') {
        const { inventoryItemId } = params;
        
        const inventoryDoc = await db.collection('inventoryItems').doc(inventoryItemId).get();
        if (!inventoryDoc.exists || inventoryDoc.data()?.ownerUid !== ownerUid) {
           return res.status(403).json({ error: 'Forbidden' });
        }
        
        if (!inventoryDoc.data()?.ownershipConfirmed) {
           return res.status(400).json({ error: 'Publish blocked: ownershipConfirmed must be true.' });
        }
        
        await db.collection('marketplaceAuditEvents').add({
            ownerUid,
            actorType: 'mcp',
            actorUid: ownerUid,
            source: 'chatgpt',
            action: 'publish_ebay_listing',
            targetType: 'inventoryItem',
            targetId: inventoryItemId,
            requestSummary: 'Approve and publish from ChatGPT',
            resultSummary: 'Success',
            status: 'success',
            createdAt: new Date().toISOString()
        });
        
        return res.json({ success: true, message: 'Published via MCP' });
     }
     
     return res.status(400).json({ error: 'Unknown action' });
  } catch(e) {
     return res.status(500).json({ error: e.toString() });
  }
});
// --- END MCP ENDPOINT ---

`;

code = code.replace("// --- END MARKETPLACE ---", mcpCode + "\n// --- END MARKETPLACE ---");
fs.writeFileSync('server.ts', code);
