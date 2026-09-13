const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldEndpoint = `  // Reddit Lead Radar Endpoint
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
               name: item.title,
               instagramHandle: handle,
               website: website,
               thumbnail: thumbnail || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80',
             });
          }
        }
      });
      
      res.json({ leads });
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch radar leads' });
    }
  });`;

const newEndpoint = `  // Reddit Lead Radar Endpoint
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
        const text = (item.title + " " + html).replace(/<[^>]+>/g, ' ');
        
        // Match instagram
        let handle = '';
        const igUrlMatch = html.match(/(?:https?:\\/\\/)?(?:www\\.)?instagram\\.com\\/([a-zA-Z0-9_.]+)/i);
        if (igUrlMatch) {
          handle = igUrlMatch[1].replace(/[\\/'"]/g, '');
        } else {
          const igTextMatch = text.match(/(?:IG|Instagram)[\\s:-]*@?([a-zA-Z0-9_.]+)/i);
          if (igTextMatch) handle = igTextMatch[1];
        }
        
        // Match website (excluding reddit and imgur)
        const urlRegex = /href="(https?:\\/\\/(?!www\\.reddit\\.com|reddit\\.com|preview\\.redd\\.it|imgur\\.com|i\\.redd\\.it|v\\.redd\\.it)[^"]+)"/ig;
        let website = '';
        let match;
        while ((match = urlRegex.exec(html)) !== null) {
          if (!website) website = match[1];
        }
        
        // Extract thumbnail
        const imgMatch = html.match(/<img[^>]+src="([^">]+)"/i);
        const thumbnail = imgMatch ? imgMatch[1].replace(/&amp;/g, '&') : '';

        // Generate final values
        const finalHandle = handle || item.author || 'Reddit User';
        const finalWebsite = website || item.link || '';
        
        const key = finalHandle + finalWebsite;
        if (!seen.has(key)) {
           seen.add(key);
           leads.push({
             name: item.title,
             instagramHandle: handle || '', // Keep clean for IG link if possible
             website: finalWebsite,
             thumbnail: thumbnail || 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&q=80',
             author: item.author || 'Reddit User'
           });
        }
      });
      
      res.json({ leads });
    } catch(err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch radar leads' });
    }
  });`;

if (code.includes('const key = handle || website;')) {
    code = code.replace(oldEndpoint, newEndpoint);
    fs.writeFileSync('server.ts', code);
    console.log("Patched reddit-leads");
} else {
    console.log("Could not find reddit-leads to patch");
}
