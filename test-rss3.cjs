const fetch = require('node-fetch');

async function run() {
  const apiUrl = "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.reddit.com%2Fr%2Fstreetwearstartup%2Fnew.rss";
  const response = await fetch(apiUrl);
  const json = await response.json();
  const leads = [];
  json.items.forEach((item) => {
    const text = (item.title + " " + item.content).replace(/<[^>]+>/g, ' ');
    
    // IG extraction
    let handle = '';
    const igUrlMatch = item.content.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i);
    if (igUrlMatch) {
      handle = igUrlMatch[1].replace(/[\/'"]/g, '');
    } else {
      const igTextMatch = text.match(/(?:IG|Instagram)[\s:-]*@?([a-zA-Z0-9_.]+)/i);
      if (igTextMatch) handle = igTextMatch[1];
    }
    
    // Website extraction
    let website = '';
    const urlRegex = /href="(https?:\/\/(?!www\.reddit\.com|reddit\.com|preview\.redd\.it|imgur\.com|i\.redd\.it|v\.redd\.it)[^"]+)"/ig;
    let match;
    while ((match = urlRegex.exec(item.content)) !== null) {
      if (!website) website = match[1];
    }
    
    // If no website found in hrefs, maybe in text?
    if (!website) {
       const siteRegex = /(?:https?:\/\/)?(?!www\.reddit\.com|reddit\.com|preview\.redd\.it|imgur\.com|i\.redd\.it|v\.redd\.it|instagram\.com)(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(\/[a-zA-Z0-9-_.]+)*\/?/ig;
       // ... text parsing might be too noisy. Let's stick to links for now, plus any clear links.
    }
    
    // Image thumbnail
    const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/i);
    const thumbnail = imgMatch ? imgMatch[1].replace(/&amp;/g, '&') : '';
    
    // Fallback: Even if they don't explicitly drop their IG or Website, we can still list the post as a "Lead" with a Reddit link!
    if (!handle && !website) {
       // Let's use their Reddit username as the handle, or just store the Reddit post link as their website!
       website = item.link; // The reddit post
       handle = "Reddit User"; // We can try to extract author:
       const authorMatch = item.author || "Unknown";
    }

    leads.push({
      title: item.title,
      handle: handle || item.author || 'Unknown',
      website: website || item.link,
      thumbnail: thumbnail,
    });
  });
  console.log("Total Items:", json.items.length);
  console.log("Leads extracted:", leads.length);
  console.log(leads.slice(0, 3));
}
run();
