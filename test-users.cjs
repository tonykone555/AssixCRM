const admin = require('firebase-admin');
const serviceAccount = require('./firebase-blueprint.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
async function getUsers() {
  const snapshot = await db.collection('users').get();
  console.log(`Found ${snapshot.size} users.`);
  snapshot.forEach(doc => console.log(doc.id, doc.data()));
}
getUsers().catch(console.error);
