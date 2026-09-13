const admin = require('firebase-admin');
const serviceAccount = require('./firebase-blueprint.json');
admin.initializeApp({
  projectId: 'ai-studio-66ee38ae-e141-4c35-b855-0c19342c0c5b'
});
const db = admin.firestore();
async function check() {
  const users = await db.collection('users').get();
  console.log('--- USERS COLLECTION ---');
  users.forEach(d => console.log(d.id, d.data().email));

  const leads = await db.collection('leads').get();
  console.log('\n--- LEADS COLLECTION ---');
  const ownerEmails = new Set();
  const assignedEmails = new Set();
  leads.forEach(d => {
    const data = d.data();
    if (data.ownerEmail) ownerEmails.add(data.ownerEmail);
    if (data.assignedAccountEmails) {
      data.assignedAccountEmails.forEach(e => assignedEmails.add(e));
    }
  });
  console.log('Owner Emails:', Array.from(ownerEmails));
  console.log('Assigned Emails:', Array.from(assignedEmails));
}
check().catch(console.error);
