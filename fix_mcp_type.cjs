const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /const listingId = await publishToEbay\(ownerUid, inventoryItemId, args\.price \|\| 0\);/;
const replacement = "const listingId = await publishToEbay(ownerUid, inventoryItemId, (args as any).price || 0);";

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code);
