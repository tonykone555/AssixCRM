const admin = require('firebase-admin');
const serviceAccount = require('./firebase-blueprint.json');
admin.initializeApp({
  projectId: 'ai-studio-66ee38ae-e141-4c35-b855-0c19342c0c5b'
});
const db = admin.firestore();
async function check() {
  try {
    const q = await db.collection('leads').orderBy('updatedAt', 'desc').limit(5).get();
    console.log("Success! size:", q.size);
  } catch (e) {
    console.error("Failed:", e.message);
  }
}
check().catch(console.error);
