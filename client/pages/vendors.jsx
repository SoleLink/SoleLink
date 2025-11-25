import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-auth-ui/firebaseConfig.js";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getOrCreateChat } from "../src/services/chatService";

export default function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [searchCity, setSearchCity] = useState("");
  const [searchZip, setSearchZip] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setVendors([]);
    setSelectedVendor(null);

    try {
      const vendorsRef = collection(db, "Vendors");
      const constraints = [];

      if (searchCity.trim() !== "") {
        constraints.push(where("city", "==", searchCity.trim()));
      }

      if (searchZip.trim() !== "") {
        constraints.push(where("zipCode", "==", searchZip.trim()));
      }

      if (constraints.length === 0) {
        setError("Please enter a city or zip code to search.");
        setLoading(false);
        return;
      }

      const q = query(vendorsRef, ...constraints);
      const snapshot = await getDocs(q);

      const results = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setVendors(results);

      if (results.length === 0) {
        setError("No vendors found for that search.");
      }
    } catch (err) {
      console.error("Error searching vendors:", err);
      setError("An error occurred while searching. Please try again.");
    }

    setLoading(false);
  };

  const handleChatWithVendor = async () => {
    if (!selectedVendor) return;

    const user = auth.currentUser;
    if (!user) {
      alert("Please log in to start a chat with a vendor.");
      return;
    }

    try {
      const chatId = await getOrCreateChat({
        userId: user.uid,
        vendorId: selectedVendor.userId || selectedVendor.id,
        vendorName: selectedVendor.businessName || "Vendor",
        userName: user.email,
      });

      // Go to chats page; you can read location.state.chatId in Chats if you want auto-select
      navigate("/chats", { state: { chatId } });
    } catch (err) {
      console.error("Error starting chat:", err);
      alert("Could not start a chat with this vendor. Please try again.");
    }
  };

  return (
    <main>
      <div className="content">
        <h1>Find Shoe Cleaning & Repair Vendors</h1>
        <p>
          Enter a city and/or zip code to find SoleLink vendors near you for shoe
          cleaning and repair services.
        </p>

        {/* Search form styled via style.css */}
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="City (e.g. Fairfax)"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            className="search-input"
            style={{ width: "40%" }}
          />
          <input
            type="text"
            placeholder="Zip Code (e.g. 22030)"
            value={searchZip}
            onChange={(e) => setSearchZip(e.target.value)}
            className="search-input"
            style={{ width: "20%" }}
          />
          <button type="submit" className="cta-btn" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        <div className="vendor-results">
          {error && <p className="no-results">{error}</p>}

          {vendors.length === 0 && !loading && !error && (
            <p className="no-results">
              No results yet. Try searching by city, zip code, or both.
            </p>
          )}

          {vendors.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "2rem",
                alignItems: "flex-start",
                marginTop: "1rem",
              }}
            >
              {/* Vendor list (master) */}
              <ul
                className="vendor-list"
                style={{ flex: 1, listStyle: "none", padding: 0 }}
              >
                {vendors.map((vendor) => {
                  const isSelected = selectedVendor?.id === vendor.id;
                  return (
                    <li
                      key={vendor.id}
                      onClick={() => setSelectedVendor(vendor)}
                      style={{
                        cursor: "pointer",
                        border: isSelected
                          ? "2px solid var(--accent-color)"
                          : "1px solid #ddd",
                      }}
                    >
                      <strong>{vendor.businessName || "Unnamed Vendor"}</strong>
                      <br />
                      <span>
                        {vendor.city} {vendor.zipCode}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* Detail panel (detail) */}
              <div
                style={{
                  flex: 1,
                  padding: "1rem",
                  borderRadius: "10px",
                  background: "var(--card-bg)",
                  border: "1px solid #ddd",
                }}
              >
                {selectedVendor ? (
                  <>
                    <h2>{selectedVendor.businessName || "Vendor Details"}</h2>
                    <p>
                      <strong>City:</strong> {selectedVendor.city}
                    </p>
                    <p>
                      <strong>Zip Code:</strong> {selectedVendor.zipCode}
                    </p>
                    <p>
                      <em>
                        Additional vendor details and contact options will appear here in
                        future versions of SoleLink.
                      </em>
                    </p>

                    <button
                      type="button"
                      className="cta-btn"
                      style={{ marginTop: "0.75rem" }}
                      onClick={handleChatWithVendor}
                    >
                      Chat with this vendor
                    </button>
                  </>
                ) : (
                  <p className="no-results" style={{ marginTop: 0 }}>
                    Select a vendor from the list to view more details.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
