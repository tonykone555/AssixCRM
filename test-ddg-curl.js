async function test() {
  const query = 'site:instagram.com "clothing brand" "@gmail.com"';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  console.log('Status:', response.status);
  const html = await response.text();
  console.log('Includes result?', html.includes('result__snippet'));
  console.log('HTML size:', html.length);
  if (!html.includes('result__snippet')) {
     console.log('HTML snippet:', html.substring(0, 500));
  }
}
test();
