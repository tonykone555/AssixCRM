const fs = require('fs');
let code = fs.readFileSync('src/components/LeadRadar.tsx', 'utf8');

code = code.replace("name: item.handle || item.author,", "name: item.name || item.author || 'Unknown',");
code = code.replace("instagramHandle: item.handle || '',", "instagramHandle: item.instagramHandle || '',");
code = code.replace("notes: \\`Found via Radar (r/\\${subreddit})\\\\n\\\\nPost: \\${item.title}\\\\nLink: \\${item.link}\\`,", "notes: \\`Found via Radar (r/\\${subreddit})\\\\n\\\\nPost: \\${item.name}\\\\nLink: \\${item.website}\\`,");
code = code.replace("setAddedIds(prev => new Set(prev).add(item.id));", "setAddedIds(prev => new Set(prev).add(item.website));");
code = code.replace("key={item.id}", "key={item.website}");
code = code.replace("addedIds.has(item.id)", "addedIds.has(item.website)");

// Also change item.handle in the UI to item.instagramHandle
code = code.replace(/{item.handle}/g, "{item.instagramHandle}");
code = code.replace(/item.handle &&/g, "item.instagramHandle &&");

fs.writeFileSync('src/components/LeadRadar.tsx', code);
