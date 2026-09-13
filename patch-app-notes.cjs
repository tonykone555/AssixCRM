const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetLine = "          notes: data.bio ? `Bio: ${data.bio}` : '',";
const replacementLine = "          notes: [data.bio ? `Bio: ${data.bio}` : '', data.draftMessage ? `\\nOutreach Draft:\\n${data.draftMessage}` : ''].filter(Boolean).join('\\n'),";

if (code.includes(targetLine)) {
    code = code.replace(targetLine, replacementLine);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Successfully patched App.tsx notes!");
} else {
    console.log("Could not find the target line in App.tsx.");
}
