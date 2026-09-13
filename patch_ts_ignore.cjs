const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "credential: admin.credential.cert(serviceAccount)",
  "// @ts-ignore\n        credential: admin.credential.cert(serviceAccount)"
);

code = code.replace(
  "const userSnapshot = await admin.firestore().collection('users').doc(receiverEmail.toLowerCase()).get();",
  "// @ts-ignore\n      const userSnapshot = await admin.firestore().collection('users').doc(receiverEmail.toLowerCase()).get();"
);

code = code.replace(
  "const response = await admin.messaging().send(message);",
  "// @ts-ignore\n      const response = await admin.messaging().send(message);"
);

fs.writeFileSync('server.ts', code);
