const fetch = require('node-fetch');

async function run() {
  const apiUrl = "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.reddit.com%2Fr%2Fstreetwearstartup%2Fnew.rss";
  const response = await fetch(apiUrl);
  const json = await response.json();
  console.log(Object.keys(json.items[0]));
  console.log(json.items[0].title);
  console.log(json.items[0].description ? "Has description" : "No desc");
  console.log(json.items[0].content ? "Has content" : "No content");
  
  // print an item text to see if we can extract ig handles without https://instagram.com 
  const text = json.items[1].content;
  console.log(text.substring(0, 500));
}
run();
