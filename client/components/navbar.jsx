import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase-auth-ui/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import AuthModal from "./AuthModal";
import "/style.css";

function Navbar() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setUserRole(null);

      if (!user) return;

      try {
        setRoleLoading(true);
        const userRef = doc(db, "Users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          setUserRole(data.role || null);
        } else {
          setUserRole(null);
        }
      } catch (err) {
        console.error("Failed to fetch user role:", err);
        setUserRole(null);
      } finally {
        setRoleLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserRole(null);
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const isVendor = currentUser && userRole === "vendor";
  const vendorsLinkLabel = isVendor ? "Business" : "Vendors";
  const vendorsLinkTo = isVendor ? "/Business" : "/vendors";

  return (
    <>
      <nav className="navbar">

        {/* ---------- LOGO SECTION ---------- */}
        <div className="logo" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img
              src="/logo.png"        
              alt="SoleLink Logo"
              style={{ height: "91px", width: "91px", objectFit: "contain" }}
            />
            <span style={{ fontSize: "20px", fontWeight: "600", marginLeft: "6px", color: "white" }}>
              SoleLink
            </span>
          </Link>
        </div>
        {/* ---------- END LOGO SECTION ---------- */}

        <ul className="nav-links">
          <li>
            <Link to="/">Home</Link>
          </li>

          <li>
            <Link to={vendorsLinkTo}>{vendorsLinkLabel}</Link>
          </li>

          <li>
            <Link to="/contactus">Contact Us</Link>
          </li>

          <li>
            <Link to="/chats">Chats</Link>
          </li>
          
          <li>
            <Link to="/profile">Profile</Link>
          </li>
          
        </ul>

        <div className="nav-actions">
          {currentUser ? (
            <div className="user-info">
              <span className="user-email">
                {currentUser.email}
                {roleLoading
                  ? " (loading role...)"
                  : userRole
                  ? ` • ${userRole === "vendor" ? "Vendor" : "Client"}`
                  : ""}
              </span>
              <button className="login-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <button
              className="login-btn"
              onClick={() => setIsAuthModalOpen(true)}
            >
              Login
            </button>
          )}
        </div>
      </nav>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
}

export default Navbar;
