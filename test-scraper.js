async function test() {
  const res = await fetch('http://localhost:3000/api/scrape-osint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'site:instagram.com "clothing brand" "@gmail.com"', platform: 'Instagram', pages: 1 })
  });
  console.log(res.status);
  const data = await res.json();
  console.log(data);
}
test();
