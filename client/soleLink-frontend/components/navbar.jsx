import React from "react";
import { Link } from "react-router-dom";
import "/style.css";

function Navbar() {

 
  return (
    <nav className="navbar">
      <div className="logo">SoleLink</div>
      <ul className="nav-links">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/vendors">Vendors</Link></li>
        <li><Link to="/contactus">Contact Us</Link></li>
        <li><Link to="chats">Chats</Link></li>
      </ul>

      <div className="nav-actions">
        <button className="login-btn">Login</button>
        
         
       
      </div>
    </nav>
  );
}

export default Navbar;
