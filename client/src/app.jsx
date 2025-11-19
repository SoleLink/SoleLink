// client/src/app.jsx
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "/components/navbar";
import Home from "/pages/home";
import Vendors from "/pages/vendors";
import ContactUs from "/pages/contactus";
import Chats from "/pages/chats";
import Profile from "/pages/profile";
import Business from "/pages/Business";
import { initFcm, onForegroundMessage } from "/src/fcm.js";

function App() {
  useEffect(() => {
    // Initialize Firebase Cloud Messaging
    initFcm();

    // Listen for messages when the app is open
    const unsubPromise = onForegroundMessage((payload) => {
      console.log("Received foreground FCM payload:", payload);
      // TODO: show a toast, badge, or in-app notification
    });

    // onForegroundMessage returns a promise that resolves to an unsubscribe
    let unsubscribe = null;
    unsubPromise.then((fn) => {
      unsubscribe = fn;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/business" element={<Business />} />
        <Route path="/contactus" element={<ContactUs />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
      <footer>© 2025 SoleLink</footer>
    </Router>
  );
}

export default App;
