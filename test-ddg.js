async function test() {
  const query = 'site:instagram.com "clothing brand" "@gmail.com"';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  });
  console.log('Status:', response.status);
  const html = await response.text();
  console.log('Includes result?', html.includes('result__snippet'));
  console.log('Includes captcha?', html.toLowerCase().includes('captcha'));
  console.log('HTML size:', html.length);
  if (!html.includes('result__snippet')) {
     console.log('HTML snippet:', html.substring(0, 500));
  }
}
test();
