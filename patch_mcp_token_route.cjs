const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const route = `
// MCP Token Generation Route
app.post('/api/mcp/generate-token', requireMarketplaceAuth, async (req: any, res: any) => {
    try {
        const db = getFirestore();
        const crypto = require('crypto');
        const token = 'mcp_' + crypto.randomBytes(32).toString('hex');
        
        await db.collection('mcpTokens').add({
            ownerUid: req.user.uid,
            token: token,
            createdAt: new Date().toISOString()
        });
        
        res.json({ token });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
`;

// Insert right before app.get('/mcp/sse')
code = code.replace("app.get('/mcp/sse'", route + "\napp.get('/mcp/sse'");
fs.writeFileSync('server.ts', code);
