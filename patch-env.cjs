const fs = require('fs');
let code = fs.readFileSync('.env.example', 'utf8');
if (!code.includes('GOOGLE_MAPS_API_KEY')) {
  code += '\n# Google Maps API Key for Place Search\nGOOGLE_MAPS_API_KEY=\n';
  fs.writeFileSync('.env.example', code);
}
