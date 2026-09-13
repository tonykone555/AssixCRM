import { app, db } from './src/lib/firebase';
import { doc, setDoc } from "firebase/firestore";

async function check() {
  try {
    await setDoc(doc(db, "messages", "test-msg"), { text: 'hello', createdAt: new Date().toISOString() });
    console.log("Write successful!");
  } catch(e) {
    console.error("Write failed:", e.message);
  }
}
check();
