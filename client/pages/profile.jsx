import { useEffect, useState, useRef } from "react";
import { auth, db, storage } from "/firebase-auth-ui/firebaseConfig.js";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Profile() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Edit mode toggle
  const [isEditing, setIsEditing] = useState(false);

  // Profile data
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [provider, setProvider] = useState("");
  const [photoURL, setPhotoURL] = useState("");

  // File input ref for photo upload
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);
      setError("");
      setLoading(true);

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "Users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setError("No profile data found.");
          setLoading(false);
          return;
        }

        const data = snap.data();
        setEmail(data.email || user.email || "");
        setRole(data.role || "");
        setBusinessName(data.businessName || "");
        setCity(data.city || "");
        setZipCode(data.zipCode || "");
        setProvider(data.provider || "");
        setPhotoURL(data.photoURL || user.photoURL || "");
      } catch (err) {
        console.error("Error loading profile:", err);
        setError("There was a problem loading your profile.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (!firebaseUser) return;

    setSaving(true);
    setError("");

    if (!city || !zipCode) {
      setError("City and Zip Code are required.");
      setSaving(false);
      return;
    }

    if (role === "vendor" && !businessName) {
      setError("Business Name is required for vendors.");
      setSaving(false);
      return;
    }

    try {
      const userRef = doc(db, "Users", firebaseUser.uid);

      await updateDoc(userRef, {
        city,
        zipCode,
        ...(role === "vendor" ? { businessName } : {}),
        ...(photoURL ? { photoURL } : {}),
      });

      if (role === "vendor") {
        const vendorRef = doc(db, "Vendors", firebaseUser.uid);
        await setDoc(
          vendorRef,
          { userId: firebaseUser.uid, email, businessName, city, zipCode },
          { merge: true }
        );
      }

      alert("Profile updated successfully.");

      setIsEditing(false);
      setSaving(false);
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to update profile.");
      setSaving(false);
    }
  };

  const handleUploadClick = () => {
    if (saving) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file || !firebaseUser) return;

    // Optional: basic size check (e.g. 2 MB)
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError("File is too large. Please choose an image under 2MB.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const storageRef = ref(storage, `profilePictures/${firebaseUser.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Save photoURL to Firestore Users doc
      const userRef = doc(db, "Users", firebaseUser.uid);
      await updateDoc(userRef, { photoURL: url });

      setPhotoURL(url);
      setSaving(false);
    } catch (err) {
      console.error("Error uploading profile picture:", err);
      setError("Failed to upload profile picture.");
      setSaving(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <main>
      <div className="content">
        <h1>Your SoleLink Profile</h1>
        <p>
          View and update the information associated with your SoleLink account, including your
          profile picture.
        </p>

        {/* Not logged in */}
        {!loading && !firebaseUser && (
          <div
            style={{
              padding: "1rem",
              border: "1px solid #ddd",
              borderRadius: "10px",
              background: "var(--card-bg)",
            }}
          >
            <p className="no-results">You must be logged in to view your profile.</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div
            style={{
              padding: "1rem",
              borderRadius: "10px",
              border: "1px solid #ddd",
              background: "var(--card-bg)",
            }}
          >
            <p>Loading profile…</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              borderRadius: "10px",
              border: "1px solid #f5c2c7",
              background: "#f8d7da",
              color: "#842029",
            }}
          >
            <p>{error}</p>
          </div>
        )}

        {/* Profile card */}
        {!loading && firebaseUser && !error && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.5rem",
              borderRadius: "10px",
              border: "1px solid #ddd",
              background: "var(--card-bg)",
              maxWidth: "520px",
            }}
          >
            {/* Avatar + (conditional) upload */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  width: "70px",
                  height: "70px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  backgroundColor: "#ddd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#555",
                  border: "1px solid #ccc",
                }}
              >
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  (email || "?").charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <p style={{ margin: "0 0 0.4rem" }}>
                  <strong>{email}</strong>
                </p>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#555" }}>
                  {role === "vendor" ? "Vendor" : "Client"} •{" "}
                  {provider === "google"
                    ? "Signed in with Google"
                    : "Email & Password"}
                </p>

                {/* Upload button ONLY in edit mode */}
                {isEditing && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <button
                      type="button"
                      className="cta-btn"
                      style={{ padding: "0.35rem 0.8rem", fontSize: "0.85rem" }}
                      onClick={handleUploadClick}
                      disabled={saving}
                    >
                      {saving ? "Uploading…" : "Upload Photo"}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Email (never editable, show not-allowed cursor) */}
            <div style={{ marginBottom: "1rem" }}>
              <strong>Email</strong>
              <input
                type="text"
                value={email}
                readOnly
                style={{
                  width: "100%",
                  marginTop: "0.25rem",
                  padding: "0.45rem",
                  borderRadius: "6px",
                  background: "#f0f0f0",
                  border: "1px solid #ddd",
                  cursor: "not-allowed",
                }}
              />
            </div>

            {/* Role (never editable, show not-allowed cursor) */}
            <div style={{ marginBottom: "1rem" }}>
              <strong>Role</strong>
              <input
                type="text"
                value={role === "vendor" ? "Vendor" : "Client"}
                readOnly
                style={{
                  width: "100%",
                  marginTop: "0.25rem",
                  padding: "0.45rem",
                  borderRadius: "6px",
                  background: "#f0f0f0",
                  border: "1px solid #ddd",
                  cursor: "not-allowed",
                }}
              />
            </div>

            {/* Business name (vendor only) */}
            {role === "vendor" && (
              <div style={{ marginBottom: "1rem" }}>
                <strong>Business Name</strong>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  readOnly={!isEditing}
                  style={{
                    width: "100%",
                    marginTop: "0.25rem",
                    padding: "0.45rem",
                    borderRadius: "6px",
                    background: isEditing ? "#fff" : "#f0f0f0",
                    border: "1px solid #ddd",
                    cursor: isEditing ? "text" : "not-allowed",
                  }}
                />
              </div>
            )}

            {/* City */}
            <div style={{ marginBottom: "1rem" }}>
              <strong>City</strong>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                readOnly={!isEditing}
                style={{
                  width: "100%",
                  marginTop: "0.25rem",
                  padding: "0.45rem",
                  borderRadius: "6px",
                  background: isEditing ? "#fff" : "#f0f0f0",
                  border: "1px solid #ddd",
                  cursor: isEditing ? "text" : "not-allowed",
                }}
              />
            </div>

            {/* Zip code */}
            <div style={{ marginBottom: "1rem" }}>
              <strong>Zip Code</strong>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                readOnly={!isEditing}
                style={{
                  width: "100%",
                  marginTop: "0.25rem",
                  padding: "0.45rem",
                  borderRadius: "6px",
                  background: isEditing ? "#fff" : "#f0f0f0",
                  border: "1px solid #ddd",
                  cursor: isEditing ? "text" : "not-allowed",
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
              {!isEditing && (
                <button
                  type="button"
                  className="cta-btn"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
              )}

              {isEditing && (
                <>
                  <button
                    type="button"
                    className="cta-btn"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    className="cta-btn"
                    style={{ background: "#999" }}
                    onClick={() => window.location.reload()}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
