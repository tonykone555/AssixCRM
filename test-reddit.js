const fetch = require('node-fetch');
async function run() {
  try {
    const res = await fetch('https://www.reddit.com/r/streetwearstartup/new.json?limit=25', {
      headers: { 'User-Agent': 'AssixAgent/1.0' }
    });
    const json = await res.json();
    console.log("Success, got", json.data.children.length, "posts");
    
    for (let i = 0; i < 3; i++) {
        const post = json.data.children[i].data;
        console.log("Title:", post.title);
        console.log("Selftext len:", post.selftext.length);
        console.log("URL:", post.url);
    }
  } catch(e) {
    console.error(e);
  }
}
run();
