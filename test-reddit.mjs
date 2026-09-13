async function run() {
  try {
    const res = await fetch('https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.reddit.com/r/streetwearstartup/new.json?limit=10'));
    const json = await res.json();
    console.log(res.status);
    const parsed = JSON.parse(json.contents);
    console.log(parsed.data ? parsed.data.children.length : 'no data');
  } catch(e) {
    console.error(e);
  }
}
run();
