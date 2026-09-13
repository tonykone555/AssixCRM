async function run() {
  try {
    const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://www.reddit.com/r/streetwearstartup/new.rss');
    const json = await res.json();
    console.log(res.status);
    console.log(json.items ? json.items.length : 'no data');
    if (json.items) {
      console.log(json.items[0].title);
      console.log(json.items[0].content.substring(0,100));
    }
  } catch(e) {
    console.error(e);
  }
}
run();
