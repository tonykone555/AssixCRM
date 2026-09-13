const fetch = require('node-fetch');

async function run() {
  const apiUrl = "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.reddit.com%2Fr%2Fstreetwearstartup%2Fnew.rss";
  const response = await fetch(apiUrl);
  const json = await response.json();
  
  if (!json.items) {
    console.log("No items");
    return;
  }
  
  const leads = [];
  json.items.forEach((item) => {
    const html = item.content || '';
    const igMatch = html.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i);
    const handle = igMatch ? igMatch[1].replace(/[\/'"]/g, '') : '';
    
    const urlRegex = /href="(https?:\/\/(?!www\.reddit\.com|reddit\.com|preview\.redd\.it|imgur\.com|i\.redd\.it)[^"]+)"/ig;
    let website = '';
    let match;
    while ((match = urlRegex.exec(html)) !== null) {
      if (!website) website = match[1];
    }
    
    const imgMatch = html.match(/<img[^>]+src="([^">]+)"/i);
    const thumbnail = imgMatch ? imgMatch[1] : '';

    if (handle || website) {
      leads.push({ handle, website, thumbnail });
    }
  });
  console.log("Found leads:", leads.length);
  if (leads.length > 0) console.log(leads[0]);
}
run();
