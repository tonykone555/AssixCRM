import { app, db } from './src/lib/firebase';
import { collection, getDocs } from "firebase/firestore";

async function check() {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    console.log('users size', querySnapshot.size);
    querySnapshot.forEach((doc) => {
      console.log(doc.id, doc.data());
    });
  } catch (err) {
    console.error(err);
  }
}
check();
