
import React, { useState } from "react";


function Vendors() {
  // Track user input and filtered results
  const [location, setLocation] = useState("");
  const [filteredVendors, setFilteredVendors] = useState([]);

 
  const vendors = [
    { id: 1, name: "CleanKicks", city: "New York", services: "Shoe Cleaning & Repair" },
    { id: 2, name: "SoleFixers", city: "Los Angeles", services: "Sneaker Restoration" },
  ];

  // Function to handle search
  const handleSearch = (e) => {
    e.preventDefault();
    const searchTerm = location.trim().toLowerCase();

    const results = vendors.filter((vendor) =>
      vendor.city.toLowerCase().includes(searchTerm)
    );

    setFilteredVendors(results);
  };

  return (
    <main className="content">
      <h1>Find Nearby Shoe Vendors</h1>
      <p>Enter your location to discover trusted shoe cleaning and repair services near you.</p>

      {/* Search bar */}
      <form className="search-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Enter your city or ZIP code..."
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="cta-btn">
          Search
        </button>
      </form>

      {/* Search results */}
      <section className="vendor-results">
        {filteredVendors.length > 0 ? (
          <ul className="vendor-list">
            {filteredVendors.map((vendor) => (
              <li key={vendor.id}>
                <h3>{vendor.name}</h3>
                <p>
                   <strong>{vendor.city}</strong>
                </p>
                <p>{vendor.services}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-results">No vendors found. Try searching another city.</p>
        )}
      </section>
    </main>
  );
}

export default Vendors;
