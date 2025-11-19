// client/src/fcm.js
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import app from "/firebase-auth-ui/firebaseConfig.js"; // your existing config

// ⚠️ Replace this with your actual Web Push certificate key from Firebase console
const VAPID_KEY = "BAVA1SdoUvcSktO51joeBNB2LBRlk8EhZZ9KdHU1v2NLjW5xUrcnppsoKtwjiDj2YoAgH5avXEyFCezrLJ5TWQs";

let messagingInstancePromise = null;

async function getMessagingInstance() {
  if (!messagingInstancePromise) {
    messagingInstancePromise = (async () => {
      const supported = await isSupported();
      if (!supported) {
        console.warn("FCM is not supported in this browser.");
        return null;
      }
      return getMessaging(app);
    })();
  }
  return messagingInstancePromise;
}

/**
 * Register the service worker and request permission + token.
 * Call this once (e.g., in App.jsx on mount).
 */
export async function initFcm() {
  try {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("Notification" in window)
    ) {
      console.warn("Notifications or Service Workers are not supported.");
      return null;
    }

    // Register the service worker
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );
    console.log("Service worker registered for FCM:", registration);

    const messaging = await getMessagingInstance();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission not granted.");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("FCM token:", token);
      // TODO: send token to your backend / Firestore if you want to target this user
    } else {
      console.warn("No FCM registration token available.");
    }

    return token;
  } catch (err) {
    console.error("Error initializing FCM:", err);
    return null;
  }
}

/**
 * Listen for foreground messages (when the web app tab is open).
 * You can use this to show in-app toasts, badges, etc.
 */
export async function onForegroundMessage(callback) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log("Foreground FCM message:", payload);
    callback?.(payload);
  });

  return unsubscribe;
}
