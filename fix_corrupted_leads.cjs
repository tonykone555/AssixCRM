const admin = require('firebase-admin');
const serviceAccount = require('./firebase-blueprint.json');

// Initialize App
const projectId = 'ai-studio-66ee38ae-e141-4c35-b855-0c19342c0c5b'; // Using user's firestore DB id
admin.initializeApp({
  projectId: projectId
});

const db = admin.firestore();

async function fixLeads() {
  const snapshot = await db.collection('leads').get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.instagramHandle && data.handle) {
      console.log('Fixing lead:', doc.id);
      await doc.ref.update({
        instagramHandle: data.handle,
        website: data.profileUrl || data.website || null
      });
      count++;
    }
  }
  console.log(`Fixed ${count} corrupted leads.`);
}

fixLeads().catch(console.error);
