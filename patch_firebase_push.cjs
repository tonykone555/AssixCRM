const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

if (!code.includes("getMessaging")) {
  code = code.replace(
    "import { initializeApp } from 'firebase/app';",
    "import { initializeApp } from 'firebase/app';\nimport { getMessaging, getToken, isSupported } from 'firebase/messaging';"
  );
  
  code += `

// --- Push Notifications ---
export const requestPushPermission = async (userEmail: string) => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('Push messaging is not supported in this browser.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(app);
      // We expect VITE_FIREBASE_VAPID_KEY in env
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
         console.log('No VAPID key found in env, skipping push registration');
         return;
      }
      const token = await getToken(messaging, { vapidKey });
      if (token) {
        // Save token to users collection
        const normalizedEmail = userEmail.toLowerCase();
        await setDoc(doc(db, 'users', normalizedEmail), {
          fcmToken: token,
          email: normalizedEmail,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log('Push token saved for', normalizedEmail);
      }
    }
  } catch (err) {
    console.warn('Error requesting push permission:', err);
  }
};
`;
  fs.writeFileSync('src/lib/firebase.ts', code);
}
