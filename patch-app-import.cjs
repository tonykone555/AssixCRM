const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const anchor = "import { SWRegister } from './components/SWRegister';";
const replacement = "import { SWRegister } from './components/SWRegister';\nimport { PlaceScannerModal } from './components/PlaceScannerModal';";

code = code.replace(anchor, replacement);
fs.writeFileSync('src/App.tsx', code);
