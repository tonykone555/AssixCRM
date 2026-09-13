import { app, db } from './src/lib/firebase';
import { doc, setDoc } from "firebase/firestore";

async function check() {
  try {
    await setDoc(doc(db, "test", "test"), { timestamp: Date.now() });
    console.log("Write successful!");
  } catch(e) {
    console.error("Write failed:", e.message);
  }
}
check();
