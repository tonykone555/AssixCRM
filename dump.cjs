const admin = require('firebase-admin');
const fs = require('fs');
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY.startsWith('{')) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else {
  serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'utf8'));
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
async function run() {
  const snapshot = await db.collection('leads').get();
  console.log("Total leads in Firestore:", snapshot.size);
}
run().catch(console.error);
