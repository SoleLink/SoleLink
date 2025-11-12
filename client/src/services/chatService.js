import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../../firebase-auth-ui/firebaseConfig";

/**
 * Get or create a chat conversation between two users
 * @param {string} userId - Current user's ID
 * @param {string} vendorId - Vendor's ID
 * @param {string} vendorName - Vendor's display name
 * @returns {Promise<string>} - Chat ID
 */
export const getOrCreateChat = async (userId, vendorId, vendorName) => {
  // Create a unique chat ID based on user IDs (sorted to ensure consistency)
  const participants = [userId, vendorId].sort();
  const chatId = `${participants[0]}_${participants[1]}`;

  const chatRef = doc(db, "chats", chatId);

  // Check if chat exists
  const chatDoc = await getDoc(chatRef);

  if (!chatDoc.exists()) {
    // Create new chat
    await setDoc(chatRef, {
      participants: {
        [userId]: true,
        [vendorId]: true,
      },
      participantNames: {
        [userId]: "You",
        [vendorId]: vendorName,
      },
      lastMessage: "",
      lastMessageTime: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  }

  return chatId;
};

/**
 * Send a message to a chat
 * @param {string} chatId - Chat ID
 * @param {string} senderId - Sender's user ID
 * @param {string} text - Message text
 */
export const sendMessage = async (chatId, senderId, text) => {
  const messagesRef = collection(db, "chats", chatId, "messages");

  await addDoc(messagesRef, {
    senderId,
    text,
    timestamp: serverTimestamp(),
  });

  // Update chat's last message
  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    lastMessage: text.length > 50 ? text.substring(0, 50) + "..." : text,
    lastMessageTime: serverTimestamp(),
  });
};

/**
 * Subscribe to messages in a chat
 * @param {string} chatId - Chat ID
 * @param {Function} callback - Callback function to handle messages
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToMessages = (chatId, callback) => {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const q = query(messagesRef, orderBy("timestamp", "asc"));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(messages);
  });
};

/**
 * Get all chats for a user
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function to handle chat list updates
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToUserChats = (userId, callback) => {
  const chatsRef = collection(db, "chats");
  const q = query(
    chatsRef,
    where(`participants.${userId}`, "==", true),
    orderBy("lastMessageTime", "desc")
  );

  return onSnapshot(q, async (snapshot) => {
    const chats = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        // Get the other participant's name
        const otherParticipantId = Object.keys(data.participants).find(
          (id) => id !== userId
        );
        const vendorName = data.participantNames?.[otherParticipantId] || "Unknown";

        return {
          id: doc.id,
          vendor: vendorName,
          lastMessage: data.lastMessage || "",
          time: data.lastMessageTime
            ? new Date(data.lastMessageTime.toMillis()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          lastMessageTime: data.lastMessageTime,
        };
      })
    );
    callback(chats);
  });
};

/**
 * Format timestamp for display
 * @param {Timestamp} timestamp - Firestore timestamp
 * @returns {string} - Formatted time string
 */
export const formatMessageTime = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return date.toLocaleDateString();
};


