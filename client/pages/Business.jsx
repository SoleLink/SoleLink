import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase-auth-ui/firebaseConfig.js";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Business() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [vendorData, setVendorData] = useState(null);
  const [role, setRole] = useState(null); // "vendor", "client", or null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setVendorData(null);
      setRole(null);
      setError("");
      setLoading(true);

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get role from Users collection
        const userRef = doc(db, "Users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setRole(userData.role || null);
        } else {
          setRole(null);
        }

        // Try to get vendor details from Vendors collection
        const vendorRef = doc(db, "Vendors", user.uid);
        const vendorSnap = await getDoc(vendorRef);

        if (vendorSnap.exists()) {
          setVendorData(vendorSnap.data());
        } else {
          setVendorData(null);
        }
      } catch (err) {
        console.error("Error loading business data:", err);
        setError("There was a problem loading your business information.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleGoToProfile = () => {
    navigate("/profile");
  };

  return (
    <main>
      <div className="content">
        <h1>Your SoleLink Business</h1>
        <p>
          This area is for vendors to review and manage their SoleLink business presence.
          In future versions, you’ll be able to manage services, pricing, and appointments here.
        </p>

        {/* Not logged in */}
        {!loading && !firebaseUser && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.25rem",
              borderRadius: "10px",
              border: "1px solid #ddd",
              background: "var(--card-bg)",
            }}
          >
            <p className="no-results" style={{ margin: 0 }}>
              You are not logged in. Please log in as a vendor to view your business page.
            </p>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.25rem",
              borderRadius: "10px",
              border: "1px solid #ddd",
              background: "var(--card-bg)",
            }}
          >
            <p style={{ margin: 0 }}>Loading your business information…</p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.25rem",
              borderRadius: "10px",
              border: "1px solid #f5c2c7",
              background: "#f8d7da",
              color: "#842029",
            }}
          >
            <p style={{ margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Logged in but not vendor */}
        {!loading && firebaseUser && role && role !== "vendor" && !error && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.25rem",
              borderRadius: "10px",
              border: "1px solid #ddd",
              background: "var(--card-bg)",
            }}
          >
            <p className="no-results" style={{ margin: 0 }}>
              This page is for vendor accounts. Your current role is{" "}
              <strong>{role}</strong>. If you want to become a vendor, please
              contact support or update your account with a vendor profile.
            </p>
          </div>
        )}

        {/* Vendor view */}
        {!loading &&
          firebaseUser &&
          role === "vendor" &&
          !error && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1.5rem",
                borderRadius: "10px",
                border: "1px solid #ddd",
                background: "var(--card-bg)",
                maxWidth: "600px",
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: "0.75rem" }}>
                Business Overview
              </h2>

              {vendorData ? (
                <>
                  <div style={{ marginBottom: "0.75rem" }}>
                    <strong>Business Name:</strong>
                    <br />
                    <span>{vendorData.businessName || "Not provided"}</span>
                  </div>

                  <div style={{ marginBottom: "0.75rem" }}>
                    <strong>Location:</strong>
                    <br />
                    <span>
                      {vendorData.city || "City not provided"}{" "}
                      {vendorData.zipCode || ""}
                    </span>
                  </div>

                  <div style={{ marginBottom: "0.75rem" }}>
                    <strong>Contact Email:</strong>
                    <br />
                    <span>{vendorData.email || firebaseUser.email}</span>
                  </div>

                  <p style={{ marginTop: "1rem", marginBottom: "0.75rem" }}>
                    This is how your business appears in SoleLink’s vendor
                    searches. If you need to update your business name or
                    location, use the button below to edit your profile.
                  </p>
                </>
              ) : (
                <p className="no-results" style={{ marginTop: 0 }}>
                  We couldn’t find a vendor listing for your account yet. You
                  can create or update your business details from your profile
                  page.
                </p>
              )}

              <button
                type="button"
                className="cta-btn"
                style={{ marginTop: "0.75rem" }}
                onClick={handleGoToProfile}
              >
                Go to Profile to Edit Business Info
              </button>
            </div>
          )}
      </div>
    </main>
  );
}
