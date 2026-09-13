import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY.startsWith('{')) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} else {
  serviceAccount = JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'utf8'));
}

const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app, "ai-studio-66ee38ae-e141-4c35-b855-0c19342c0c5b");
async function run() {
  const snapshot = await db.collection('leads').get();
  console.log("Total leads in Firestore:", snapshot.size);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data().name);
  });
}
run().catch(console.error);
