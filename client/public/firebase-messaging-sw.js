// client/public/firebase-messaging-sw.js

/* 
  Firebase Cloud Messaging Service Worker
  This file MUST be in /public so it is served from the site root.
*/

importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts(
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"
);

// 🔐 Use the same config as in your firebaseConfig.js
firebase.initializeApp({
  apiKey: "AIzaSyCALm8ytZNwP39sRdFyhE-M8FM6IKEee7g",
  authDomain: "solelink-fa511.firebaseapp.com",
  projectId: "solelink-fa511",
  storageBucket: "solelink-fa511.firebasestorage.app",
  messagingSenderId: "904651830008",
  appId: "1:904651830008:web:3feb88449a02717bf0410d",
  measurementId: "G-4PCXP7B8WX",
});

const messaging = firebase.messaging();

// Handle background messages (when tab is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Received background message ", payload);

  const notificationTitle = payload.notification?.title || "SoleLink";
  const notificationOptions = {
    body: payload.notification?.body || "New message",
    icon: "/logo.png", // optional: put your logo in public/logo.png
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
