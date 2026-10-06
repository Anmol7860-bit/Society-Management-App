import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAUCFiJ7K9tEvdD14ssrTvdJrB6OyKuAZc",
  authDomain: "gatekeep-9094f.firebaseapp.com",
  projectId: "gatekeep-9094f",
  storageBucket: "gatekeep-9094f.firebasestorage.app",
  messagingSenderId: "170762478739",
  appId: "1:170762478739:web:97fa6189bc89b8fb389966"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
