importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBbFOPxVoBNFbW5-NUWCh9rZj6t75s7IGc",
  authDomain: "assix-agent-tars.firebaseapp.com",
  projectId: "assix-agent-tars",
  storageBucket: "assix-agent-tars.firebasestorage.app",
  messagingSenderId: "951229113159",
  appId: "1:951229113159:web:57944fc48f8d6e11992262"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
