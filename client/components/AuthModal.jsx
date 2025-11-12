import React, { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase-auth-ui/firebaseConfig";

function AuthModal({ isOpen, onClose }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setMessage("Login successful");
        setTimeout(() => {
          onClose();
          setEmail("");
          setPassword("");
          setMessage("");
        }, 1000);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setMessage("Registration successful");
        setTimeout(() => {
          onClose();
          setEmail("");
          setPassword("");
          setMessage("");
        }, 1000);
      }
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="container" onClick={(e) => e.stopPropagation()}>
        <h1 className="brand">SoleLink</h1>
        <div className="auth-box">
          <h2>{isLogin ? "Login" : "Register"}</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit">{isLogin ? "Login" : "Register"}</button>
          </form>
          <p className="switch">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setIsLogin(!isLogin);
                setMessage("");
              }}
            >
              {isLogin ? "Register here" : "Login here"}
            </a>
          </p>
          {message && (
            <p
              id="message"
              style={{
                color: message.includes("successful") ? "green" : "red",
                marginTop: "10px",
                fontSize: "14px"
              }}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
