import * as cheerio from 'cheerio';
async function test() {
  const query = 'site:myshopify.com "streetwear"';
  const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  console.log('Status:', response.status);
  const html = await response.text();
  const $ = cheerio.load(html);
  
  $('.algo').each((_, el) => {
     let link = $(el).find('a').attr('href');
     let actualUrl = link;
     if (link && link.includes('RU=')) {
         try {
           const ruParam = link.split('RU=')[1].split('/')[0];
           if (ruParam) actualUrl = decodeURIComponent(ruParam);
         } catch(e) {}
     }
     console.log('--- Result ---');
     console.log('Title:', $(el).find('h3').text().trim());
     console.log('Link:', actualUrl);
  });
}
test();
