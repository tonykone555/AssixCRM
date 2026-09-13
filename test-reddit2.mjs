async function run() {
  try {
    const res = await fetch('https://corsproxy.io/?' + encodeURIComponent('https://www.reddit.com/r/streetwearstartup/new.json?limit=5'));
    const json = await res.json();
    console.log(res.status);
    console.log(json.data ? json.data.children.length : 'no data');
  } catch(e) {
    console.error(e);
  }
}
run();
