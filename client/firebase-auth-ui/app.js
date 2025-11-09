// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCALm8ytZNwP39sRdFyhE-M8FM6IKEee7g",
  authDomain: "solelink-fa511.firebaseapp.com",
  projectId: "solelink-fa511",
  storageBucket: "solelink-fa511.firebasestorage.app",
  messagingSenderId: "904651830008",
  appId: "1:904651830008:web:3feb88449a02717bf0410d",
  measurementId: "G-4PCXP7B8WX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

let isLogin = true;
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const toggleText = document.getElementById('toggle-text');
const toggleLink = document.getElementById('toggle-link');
const message = document.getElementById('message');

toggleLink.addEventListener('click', () => {
  isLogin = !isLogin;
  formTitle.textContent = isLogin ? "Login" : "Register";
  submitBtn.textContent = isLogin ? "Login" : "Register";
  toggleText.innerHTML = isLogin
    ? `Don't have an account? <span id="toggle-link">Register</span>`
    : `Already have an account? <span id="toggle-link">Login</span>`;
});

submitBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    if (isLogin) {
      await signInWithEmailAndPassword(auth, email, password);
      message.style.color = "green";
      message.textContent = "Login successful";
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
      message.style.color = "green";
      message.textContent = "Registration successful";
    }
  } catch (err) {
    message.style.color = "red";
    message.textContent = err.message;
  }
});