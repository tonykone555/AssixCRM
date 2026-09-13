import cheerio from 'cheerio';
async function test() {
  const query = 'site:instagram.com "clothing brand" "@gmail.com"';
  const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  console.log('Status:', response.status);
  const html = await response.text();
  console.log('HTML size:', html.length);
  const $ = cheerio.load(html);
  const titles = [];
  $('.algo').each((_, el) => {
     titles.push($(el).find('h3').text() || $(el).find('.title').text());
  });
  console.log('Found:', titles.length);
}
test();
