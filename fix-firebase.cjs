const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const oldSub = `  if (isSuperAdmin) {
    const q = query(leadsRef);
    return onSnapshot(
      q,
      (snapshot) => {
        const items: Lead[] = [];
        snapshot.forEach((doc) => {
          items.push(doc.data() as Lead);
        });
        items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        onUpdate(items);
      },
      (err) => {
        console.error('Firestore leads subscription error:', err);
        if (onError) onError(err);
      }
    );
  }

  // Non-super-admin: Listen to both owned leads AND leads assigned to user email
  const leadMap = new Map<string, Lead>();

  const processAndEmit = () => {
    const items = Array.from(leadMap.values());
    items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    onUpdate(items);
  };

  const q1 = query(leadsRef, where('ownerId', '==', userUid));
  const unsub1 = onSnapshot(
    q1,
    (snapshot) => {
      snapshot.forEach((doc) => {
        leadMap.set(doc.id, doc.data() as Lead);
      });
      processAndEmit();
    },
    (err) => console.warn('Query 1 error:', err)
  );

  const q2 = query(leadsRef, where('assignedAccountEmails', 'array-contains', userEmail));
  const unsub2 = onSnapshot(
    q2,
    (snapshot) => {
      snapshot.forEach((doc) => {
        leadMap.set(doc.id, doc.data() as Lead);
      });
      processAndEmit();
    },
    (err) => console.warn('Query 2 error:', err)
  );

  return () => {
    unsub1();
    unsub2();
  };`;

const newSub = `  // Fetch all leads for any authenticated user so everyone shares the same CRM data
  const q = query(leadsRef);
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Lead[] = [];
      snapshot.forEach((doc) => {
        items.push(doc.data() as Lead);
      });
      items.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
      onUpdate(items);
    },
    (err) => {
      console.error('Firestore leads subscription error:', err);
      if (onError) onError(err);
    }
  );`;

code = code.replace(oldSub, newSub);
fs.writeFileSync('src/lib/firebase.ts', code);
