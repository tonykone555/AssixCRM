import { initializeApp } from "firebase/app";
import { getFirestore, collection, getCountFromServer } from "firebase/firestore";

const firebaseConfig = {
  projectId: "assix-agent-tars",
  appId: "1:951229113159:web:57944fc48f8d6e11992262",
  apiKey: "AIzaSyBbFOPxVoBNFbW5-NUWCh9rZj6t75s7IGc",
  authDomain: "assix-agent-tars.firebaseapp.com"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "ai-studio-66ee38ae-e141-4c35-b855-0c19342c0c5b");

async function check() {
  try {
    const coll = collection(db, 'leads');
    const snapshot = await getCountFromServer(coll);
    console.log('Total Leads:', snapshot.data().count);
  } catch (err) {
    console.error(err.message);
  }
}
check();
