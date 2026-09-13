const fs = require('fs');
let code = fs.readFileSync('src/components/Marketplace/MarketplaceDashboard.tsx', 'utf8');

const regex = /<p className="text-zinc-500 text-sm mb-6">Connect your eBay account to manage listings, inventory, and orders directly\.<\/p>/;
const newUI = `<p className="text-zinc-500 text-sm mb-6">Connect your eBay account to manage listings, inventory, and orders directly.</p>
             
             <div className="mb-8 p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                 <h4 className="font-bold text-sm mb-2 text-zinc-900 dark:text-white">ChatGPT / MCP Integration</h4>
                 <p className="text-xs text-zinc-500 mb-4">Generate a Personal Access Token to connect AssixCRM with ChatGPT or other MCP-compatible clients.</p>
                 <button
                    onClick={async () => {
                       try {
                           const token = await currentUser.getIdToken();
                           const res = await fetch('/api/mcp/generate-token', { method: 'POST', headers: { 'Authorization': \`Bearer \${token}\` }});
                           const data = await res.json();
                           alert("Your new MCP Token: " + data.token + "\\n\\nCopy this now, it won't be shown again!");
                       } catch(e) { alert('Failed to generate token'); }
                    }}
                    className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold rounded-lg text-sm shadow-sm hover:opacity-90 transition-opacity"
                 >
                     Generate Access Token
                 </button>
                 
                 <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs font-mono text-zinc-500 break-all">
                       MCP Server URL: {window.location.origin}/mcp/sse
                    </p>
                 </div>
             </div>`;

code = code.replace(regex, newUI);
fs.writeFileSync('src/components/Marketplace/MarketplaceDashboard.tsx', code);
