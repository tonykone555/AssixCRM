const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

code = code.replace(
  /uploadBatchId: lead\.uploadBatchId \|\| undefined,\n\s*uploadBatchName: lead\.uploadBatchName \|\| undefined,\n\s*uploadBatchDate: lead\.uploadBatchDate \|\| undefined,/,
  `uploadBatchId: lead.uploadBatchId || null,
    uploadBatchName: lead.uploadBatchName || null,
    uploadBatchDate: lead.uploadBatchDate || null,`
);

fs.writeFileSync('src/lib/firebase.ts', code);
