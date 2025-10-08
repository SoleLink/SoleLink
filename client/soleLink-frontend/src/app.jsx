import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "/components/navbar";
import Home from "/pages/home";
import Vendors from "/pages/vendors";
import ContactUs from "/pages/contactus";
import Chats from "/pages/chats";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/contactus" element={<ContactUs />} />
        <Route path="/chats" element = {<Chats />} />
      </Routes>
      <footer>© 2025 SoleLink</footer>
    </Router>
  );
}

export default App;