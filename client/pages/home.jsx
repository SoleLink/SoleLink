
import React from "react";
import { Link } from "react-router-dom";
import shoeImage from "./shoe.jpg";

function Home() {
  return (
    <>
      <section className="background">
        <img src={shoeImage} alt="banner" className="banner-image" />
        <div className="background-text">Welcome to SoleLink</div>
      </section>
      <main className="content">
        <p>Find and connect with trusted shoe repair vendors near you.</p>
        <Link to="/vendors">
          <button className="cta-btn">Find a Vendor</button>
        </Link>
      </main>
    </>
  );
}

export default Home;
