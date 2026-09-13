const fs = require('fs');

// Fix server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');
serverCode = serverCode.replace("import admin from 'firebase-admin';", "import * as admin from 'firebase-admin';");
fs.writeFileSync('server.ts', serverCode);

// Fix firebase.ts
let firebaseCode = fs.readFileSync('src/lib/firebase.ts', 'utf8');
firebaseCode = firebaseCode.replace("const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;", "const vapidKey = (import.meta as any).env.VITE_FIREBASE_VAPID_KEY;");
fs.writeFileSync('src/lib/firebase.ts', firebaseCode);
