const fetch = require('node-fetch'); // node fetch if needed, but node 18 has fetch

async function run() {
  const apiUrl = `https://www.reddit.com/r/streetwearstartup/new.json?limit=50`;
  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });
  const json = await response.json();
  if (!json.data || !json.data.children) {
    console.log("No data", json);
    return;
  }
  
  const leads = [];
  json.data.children.forEach(child => {
    const data = child.data;
    const text = (data.selftext || '') + ' ' + (data.title || '') + ' ' + (data.url || '');
    
    // ig
    const igMatch = text.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i) || text.match(/@([a-zA-Z0-9_.]+)/i); // weak match for @, let's stick to IG url or clear ig mentions
    
    let handle = '';
    const igUrlMatch = text.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i);
    if (igUrlMatch) {
      handle = igUrlMatch[1];
    } else {
      const igHandleMatch = text.match(/IG:\s*@?([a-zA-Z0-9_.]+)/i) || text.match(/instagram:\s*@?([a-zA-Z0-9_.]+)/i);
      if (igHandleMatch) handle = igHandleMatch[1];
    }
    
    // website
    const urlRegex = /(https?:\/\/(?!www\.reddit\.com|reddit\.com|preview\.redd\.it|imgur\.com|i\.redd\.it|v\.redd\.it|instagram\.com)[^\s]+)/ig;
    let website = '';
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      if (!website) website = match[1];
    }
    
    // thumbnail
    let thumbnail = '';
    if (data.preview && data.preview.images && data.preview.images[0]) {
      thumbnail = data.preview.images[0].source.url.replace(/&amp;/g, '&');
    } else if (data.url && data.url.match(/\.(jpeg|jpg|gif|png)$/)) {
      thumbnail = data.url;
    }
    
    if (handle || website) {
      leads.push({ title: data.title, handle, website, thumbnail });
    }
  });
  console.log("Found leads:", leads.length);
  console.log(leads.slice(0, 3));
}
run();
