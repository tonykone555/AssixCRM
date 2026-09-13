const isJunk = (val) => !val || val.trim() === '' || val.toLowerCase().includes('lead') || val.toLowerCase() === 'n/a' || val.toLowerCase() === 'unknown';

console.log('isJunk("@leads56"):', isJunk("@leads56"));
console.log('isJunk("Lead 12"):', isJunk("Lead 12"));
console.log('isJunk("lead12"):', isJunk("lead12"));
