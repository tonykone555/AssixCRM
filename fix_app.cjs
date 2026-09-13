const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(")}\n      )}</main>", ")}\n      </main>");
fs.writeFileSync('src/App.tsx', code);
