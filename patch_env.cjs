const fs = require('fs');
let code = fs.readFileSync('.env.example', 'utf8');

code = code.replace(/MARKETPLACE_TOKEN_ENCRYPTION_KEY=.*/, 'MARKETPLACE_TOKEN_ENCRYPTION_KEY=# Provide a base64-encoded 32-byte secure random string (e.g., node -e "console.log(crypto.randomBytes(32).toString(\'base64\'))")');

fs.writeFileSync('.env.example', code);
