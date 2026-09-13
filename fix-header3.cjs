const fs = require('fs');
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
  "LayoutGrid,\n  List,",
  "LayoutGrid,\n  List,\n  Sparkles,"
);

fs.writeFileSync('src/components/Header.tsx', code);
