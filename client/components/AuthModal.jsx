import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, db } from "../firebase-auth-ui/firebaseConfig";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("client"); // "client" or "vendor"
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [message, setMessage] = useState("");

  // Tracks when user came from Google and still needs to complete profile
  const [isGoogleProfilePending, setIsGoogleProfilePending] = useState(false);
  const [googleUid, setGoogleUid] = useState(null);
  const [googleEmail, setGoogleEmail] = useState("");

  const resetForm = () => {
    setIsLogin(true);
    setEmail("");
    setPassword("");
    setRole("client");
    setBusinessName("");
    setCity("");
    setZipCode("");
    setMessage("");
    setIsGoogleProfilePending(false);
    setGoogleUid(null);
    setGoogleEmail("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      if (isLogin) {
        // --- EMAIL/PASSWORD LOGIN ---
        await signInWithEmailAndPassword(auth, email, password);
        setMessage("Login successful");

        setTimeout(() => {
          onClose();
          resetForm();
        }, 800);
      } else {
        // --- REGISTER (email/password OR Google profile completion) ---
        if (role === "vendor" && (!businessName || !city || !zipCode)) {
          setMessage("Please fill in all vendor details.");
          return;
        }

        // If this is the Google-completion flow (no password, already authenticated)
        if (isGoogleProfilePending && googleUid) {
          const uid = googleUid;
          const finalEmail = googleEmail || email;

          const userData = {
            email: finalEmail,
            role,
            createdAt: serverTimestamp(),
            provider: "google",
          };

          if (role === "vendor") {
            userData.businessName = businessName;
            userData.city = city;
            userData.zipCode = zipCode;
          }

          // USERS COLLECTION (everyone)
          await setDoc(doc(db, "Users", uid), userData, { merge: true });

          // VENDORS COLLECTION (only vendors)
          if (role === "vendor") {
            await setDoc(
              doc(db, "Vendors", uid),
              {
                userId: uid,
                email: finalEmail,
                businessName,
                city,
                zipCode,
                createdAt: serverTimestamp(),
              },
              { merge: true }
            );
          }

          setMessage("Profile completed successfully");

          setTimeout(() => {
            onClose();
            resetForm();
          }, 800);
        } else {
          // --- NORMAL EMAIL/PASSWORD REGISTER ---
          const userCred = await createUserWithEmailAndPassword(
            auth,
            email,
            password
          );
          const uid = userCred.user.uid;

          const userData = {
            email,
            role,
            createdAt: serverTimestamp(),
            provider: "password",
          };

          if (role === "vendor") {
            userData.businessName = businessName;
            userData.city = city;
            userData.zipCode = zipCode;
          }

          // USERS COLLECTION (everyone)
          await setDoc(doc(db, "Users", uid), userData);

          // VENDORS COLLECTION (only vendors)
          if (role === "vendor") {
            await setDoc(doc(db, "Vendors", uid), {
              userId: uid,
              email,
              businessName,
              city,
              zipCode,
              createdAt: serverTimestamp(),
            });
          }

          setMessage("Registration successful");

          setTimeout(() => {
            onClose();
            resetForm();
          }, 800);
        }
      }
    } catch (err) {
      console.error(err);
      setMessage(err.message);
    }
  };

  // --- GOOGLE SIGN-IN ---
  const handleGoogleSignIn = async () => {
    setMessage("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const uid = user.uid;
      const emailFromGoogle = user.email || "";

      const userRef = doc(db, "Users", uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        // ✅ Already registered in Firestore → just log them in
        setMessage("Login successful with Google");
        setTimeout(() => {
          onClose();
          resetForm();
        }, 800);
        return;
      }

      // 🆕 First time Google login → ask to complete profile once
      setIsLogin(false); // switch to Register tab
      setIsGoogleProfilePending(true);
      setGoogleUid(uid);
      setGoogleEmail(emailFromGoogle);
      setEmail(emailFromGoogle); // prefill email in UI
      setPassword(""); // no password needed
      setMessage("Welcome! Please complete your SoleLink profile.");

    } catch (err) {
      console.error(err);
      setMessage(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: "9999",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          padding: "24px",
          borderRadius: "12px",
          width: "90%",
          maxWidth: "400px",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <h2>SoleLink</h2>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* TABS */}
        <div
          style={{
            display: "flex",
            marginBottom: "16px",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => {
              setIsLogin(true);
              setMessage("");
              setIsGoogleProfilePending(false);
            }}
            style={{
              flex: 1,
              padding: "10px 0",
              background: isLogin ? "#2563eb" : "#e5e7eb",
              color: isLogin ? "white" : "#374151",
              border: "none",
              cursor: "pointer",
            }}
          >
            Login
          </button>
          <button
            onClick={() => {
              setIsLogin(false);
              setMessage("");
            }}
            style={{
              flex: 1,
              padding: "10px 0",
              background: !isLogin ? "#2563eb" : "#e5e7eb",
              color: !isLogin ? "white" : "#374151",
              border: "none",
              cursor: "pointer",
            }}
          >
            Register
          </button>
        </div>

        {/* EMAIL/PASSWORD / GOOGLE-PROFILE FORM */}
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <input
            type="email"
           placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={isGoogleProfilePending && !isLogin} // Google flow: lock email
            style={{
              padding: "10px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              background:
                isGoogleProfilePending && !isLogin ? "#f3f4f6" : "white",
            }}
          />

          {/* Hide password field when completing Google profile in Register mode */}
          {!(isGoogleProfilePending && !isLogin) && (
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #d1d5db",
              }}
            />
          )}

          {/* ROLE TOGGLE (only matters in register mode) */}
          {!isLogin && (
            <div>
              <p style={{ marginBottom: "4px" }}>I am a:</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setRole("client")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #2563eb",
                    background: role === "client" ? "#2563eb" : "white",
                    color: role === "client" ? "white" : "#2563eb",
                    cursor: "pointer",
                  }}
                >
                  Client
                </button>

                <button
                  type="button"
                  onClick={() => setRole("vendor")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #2563eb",
                    background: role === "vendor" ? "#2563eb" : "white",
                    color: role === "vendor" ? "white" : "#2563eb",
                    cursor: "pointer",
                  }}
                >
                  Vendor
                </button>
              </div>
            </div>
          )}

          {/* VENDOR EXTRA FIELDS (only in REGISTER mode + vendor role) */}
          {!isLogin && role === "vendor" && (
            <>
              <input
                type="text"
                placeholder="Business Name"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
              />

              <input
                type="text"
                placeholder="City"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
              />

              <input
                type="text"
                placeholder="Zip Code"
                required
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
              />
            </>
          )}

          {/* MESSAGE */}
          {message && (
            <p
              style={{
                color: message.toLowerCase().includes("successful")
                  ? "green"
                  : "red",
                fontSize: "14px",
              }}
            >
              {message}
            </p>
          )}

          {/* SUBMIT (email/password or Google profile completion) */}
          <button
            type="submit"
            style={{
              padding: "10px",
              marginTop: "6px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            {isLogin
              ? "Login"
              : isGoogleProfilePending
              ? "Save Profile"
              : "Create Account"}
          </button>
        </form>

        {/* OR SEPARATOR */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            margin: "14px 0",
          }}
        >
          <div
            style={{ flex: 1, height: "1px", background: "#e5e7eb" }}
          ></div>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>OR</span>
          <div
            style={{ flex: 1, height: "1px", background: "#e5e7eb" }}
          ></div>
        </div>

        {/* GOOGLE SIGN IN BUTTON */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            background: "white",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            fontWeight: 500,
          }}
        >
          <span
            style={{
              width: "18px",
              height: "18px",
              borderRadius: "4px",
              background:
                "conic-gradient(from 0deg, #4285F4, #34A853, #FBBC05, #EA4335, #4285F4)",
            }}
          ></span>
          <span>Continue with Google</span>
        </button>
      </div>
    </div>
  );
}

export default AuthModal;
