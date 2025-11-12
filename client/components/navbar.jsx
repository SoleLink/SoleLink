import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase-auth-ui/firebaseConfig";
import AuthModal from "./AuthModal";
import "/style.css";

function Navbar() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="logo">SoleLink</div>
        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/vendors">Vendors</Link></li>
          <li><Link to="/contactus">Contact Us</Link></li>
          <li><Link to="/chats">Chats</Link></li>
        </ul>

        <div className="nav-actions">
          {currentUser ? (
            <div className="user-info">
              <span className="user-email">{currentUser.email}</span>
              <button className="login-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={() => setIsAuthModalOpen(true)}>
              Login
            </button>
          )}
        </div>
      </nav>
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
}

export default Navbar;
