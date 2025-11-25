// src/firebaseMessaging.js
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { app } from "../firebase-auth-ui/firebaseConfig.js"; // adjust if your export is different

let messagingPromise = null;

async function getMessagingInstance() {
  if (!messagingPromise) {
    messagingPromise = (async () => {
      const supported = await isSupported();
      if (!supported) {
        console.warn("FCM is not supported in this browser.");
        return null;
      }
      return getMessaging(app);
    })();
  }
  return messagingPromise;
}

export async function requestNotificationPermissionAndToken(vapidKey) {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.log("Notification permission not granted");
    return null;
  }

  try {
    const token = await getToken(messaging, { vapidKey });
    console.log("FCM token:", token);
    return token;
  } catch (err) {
    console.error("Error getting FCM token:", err);
    return null;
  }
}

export async function subscribeToForegroundMessages(callback) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log("Foreground message received:", payload);
    callback?.(payload);
  });

  return unsubscribe;
}
