const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

const originalSendMessage = `export async function sendMessage(message: ChatMessage) {
  const msgRef = doc(db, 'messages', message.id);
  await setDoc(msgRef, message);
}`;

const newSendMessage = `export async function sendMessage(message: ChatMessage) {
  const msgRef = doc(db, 'messages', message.id);
  await setDoc(msgRef, message);

  // Try to send push notification via backend
  try {
    const receiver = message.receiverEmail || SUPER_ADMIN_EMAIL;
    const body = message.text || (message.screenshotUrl ? 'Sent an attachment' : 'Sent a message');
    
    // We only trigger this if it's sent to someone specific (or super admin).
    // In our app, if a normal user sends, it goes to SUPER_ADMIN_EMAIL.
    // If super admin sends, it goes to the user.
    await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        receiverEmail: receiver,
        title: \`New message from \${message.senderName}\`,
        body: body
      })
    });
  } catch (err) {
    console.warn("Could not dispatch push notification", err);
  }
}`;

if (code.includes(originalSendMessage)) {
  code = code.replace(originalSendMessage, newSendMessage);
  fs.writeFileSync('src/lib/firebase.ts', code);
}
