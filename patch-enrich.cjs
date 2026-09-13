const fs = require('fs');
const serverPath = './server.ts';
let code = fs.readFileSync(serverPath, 'utf8');

const enrichEndpoint = `
  app.post('/api/enrich-website', async (req: any, res: any) => {
    try {
      let { url } = req.body;
      if (!url) return res.status(400).json({ error: 'Missing url' });
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      }).catch(err => null);

      if (!response) {
        return res.json({ success: false, error: 'Failed to fetch website' });
      }
      
      const html = await response.text();
      
      // Basic regex extraction
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
      const phoneRegex = /(?:\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}/g;
      
      const emails = [...new Set(html.match(emailRegex) || [])].filter(e => !e.includes('.png') && !e.includes('.jpg') && !e.includes('wixpress'));
      
      // Find ig links
      const igRegex = /instagram\\.com\\/([^\\/?"']+)/gi;
      let igMatches = [];
      let match;
      while ((match = igRegex.exec(html)) !== null) {
        if (match[1] && match[1] !== 'p' && match[1] !== 'reel' && match[1] !== 'explore') {
          igMatches.push(match[1]);
        }
      }
      igMatches = [...new Set(igMatches)];

      // Phone numbers (rough heuristic)
      const phonesRaw = [...new Set(html.match(phoneRegex) || [])].filter(p => p.length >= 10 && p.length <= 15);
      const phones = phonesRaw.map(p => p.trim());

      res.json({
        success: true,
        emails,
        instagram: igMatches,
        phones
      });

    } catch (err) {
      console.error(err);
      res.json({ success: false, error: 'Exception fetching website' });
    }
  });
`;

if (!code.includes('/api/enrich-website')) {
  code = code.replace("app.post('/api/scrape-osint'", enrichEndpoint + "\n  app.post('/api/scrape-osint'");
  fs.writeFileSync(serverPath, code);
  console.log("Endpoint added.");
} else {
  console.log("Endpoint already exists.");
}
