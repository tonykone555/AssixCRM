const admin = require('firebase-admin');
const serviceAccount = require('./firebase-blueprint.json');

// We need to use default credentials or the correct project ID to query the db in this environment
admin.initializeApp({
  projectId: 'ai-studio-66ee38ae-e141-4c35-b855-0c19342c0c5b'
});

const db = admin.firestore();

async function check() {
  const users = await db.collection('users').get();
  console.log(`Found ${users.size} users.`);
  users.forEach(d => console.log(d.id, d.data().email, d.data().role));
}

check().catch(console.error);
