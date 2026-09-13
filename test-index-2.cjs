const admin = require('firebase-admin');
const serviceAccount = require('./firebase-blueprint.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'assix-agent-tars'
});
const db = admin.firestore();
async function check() {
  try {
    const q = await db.collection('leads').where('assignedAccountEmails', 'array-contains', 'test@test.com').orderBy('updatedAt', 'desc').limit(5).get();
    console.log("Success! size:", q.size);
  } catch (e) {
    console.error("Failed:", e.message);
  }
}
check().catch(console.error);
