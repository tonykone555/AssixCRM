const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const redditEndpoint = `
  // Reddit Lead Radar Endpoint
  app.get('/api/reddit-leads', async (req: any, res: any) => {
    try {
      const { subreddit = 'streetwearstartup' } = req.query;
      const rssUrl = \`https://www.reddit.com/r/\${subreddit}/new.rss\`;
      const apiUrl = \`https://api.rss2json.com/v1/api.json?rss_url=\${encodeURIComponent(rssUrl)}\`;
      
      const response = await fetch(apiUrl);
      const json = await response.json();
      
      if (!json.items) {
        return res.json({ leads: [] });
      }
      
      const leads = [];
      const seen = new Set();
      
      json.items.forEach((item) => {
        const html = item.content || '';
        
        // Match instagram
        const igMatch = html.match(/(?:https?:\\/\\/)?(?:www\\.)?instagram\\.com\\/([a-zA-Z0-9_.]+)/i);
        const handle = igMatch ? igMatch[1].replace(/[\\/'"]/g, '') : '';
        
        // Match website (excluding reddit and imgur)
        const urlRegex = /href="(https?:\\/\\/(?!www\\.reddit\\.com|reddit\\.com|preview\\.redd\\.it|imgur\\.com|i\\.redd\\.it)[^"]+)"/ig;
        let website = '';
        let match;
        while ((match = urlRegex.exec(html)) !== null) {
          if (!website) website = match[1];
        }
        
        // Extract thumbnail
        const imgMatch = html.match(/<img[^>]+src="([^">]+)"/i);
        const thumbnail = imgMatch ? imgMatch[1] : '';

        // If they have either IG or a website, it's a potential lead
        if (handle || website) {
          const key = handle || website;
          if (!seen.has(key)) {
             seen.add(key);
             leads.push({
               id: item.guid,
               title: item.title.replace(/&amp;/g, '&'),
               author: item.author,
               link: item.link,
               handle: handle,
               website: website,
               thumbnail: thumbnail,
               pubDate: item.pubDate
             });
          }
        }
      });
      
      res.json({ leads });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch radar leads' });
    }
  });
`;

if (!code.includes("/api/reddit-leads")) {
  code = code.replace(
    "app.post('/api/notify', async (req: any, res: any) => {",
    redditEndpoint + "\n  app.post('/api/notify', async (req: any, res: any) => {"
  );
  fs.writeFileSync('server.ts', code);
}
