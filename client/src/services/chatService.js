// chatService.js
// Updated to support:
// - Reliable chat loading for existing accounts
// - participantIds for both sides (clients & vendors)
// - Read receipts via message.readBy (array of userIds)
// - Typing indicators via chat.typing.{userId}: boolean
// - File attachments via uploadChatFile + message.fileUrl, fileName, fileType, fileSize

import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase-auth-ui/firebaseConfig.js";

// -------------------------------------------------------------------
// Internal: one-time migration flag per user to backfill participantIds
// -------------------------------------------------------------------
const migrationRanForUser = {};

/**
 * One-time helper: for a given userId, find any old chats that only
 * have userId/vendorId and do NOT have participantIds, and backfill
 * participantIds = [userId, vendorId]. This fixes older chats not
 * showing up in subscribeToUserChats.
 */
async function migrateOldChatsForUser(userId) {
  try {
    const chatsRef = collection(db, "chats");

    const qAsClient = query(chatsRef, where("userId", "==", userId));
    const qAsVendor = query(chatsRef, where("vendorId", "==", userId));

    const [snapClient, snapVendor] = await Promise.all([
      getDocs(qAsClient),
      getDocs(qAsVendor),
    ]);

    const seenIds = new Set();
    const updates = [];

    const handleSnapshot = (snapshot) => {
      snapshot.forEach((docSnap) => {
        const chatId = docSnap.id;
        if (seenIds.has(chatId)) return;
        seenIds.add(chatId);

        const data = docSnap.data();
        const hasParticipants =
          Array.isArray(data.participantIds) &&
          data.participantIds.length > 0;

        if (!hasParticipants) {
          const ids = [];
          if (data.userId) ids.push(data.userId);
          if (data.vendorId && data.vendorId !== data.userId) {
            ids.push(data.vendorId);
          }

          if (ids.length > 0) {
            updates.push(
              updateDoc(doc(db, "chats", chatId), {
                participantIds: ids,
              })
            );
          }
        }
      });
    };

    handleSnapshot(snapClient);
    handleSnapshot(snapVendor);

    if (updates.length > 0) {
      await Promise.all(updates);
    }
  } catch (err) {
    console.error("Error migrating old chats for user:", err);
  }
}

// ===================================================================
// SUBSCRIBE TO USER CHAT LIST
// ===================================================================
/**
 * Subscribe to all chats for a given userId.
 * Uses participantIds array to find any chat where this user participates.
 * Also runs a one-time migration for older chats missing participantIds so
 * they start showing up.
 */
export function subscribeToUserChats(userId, callback) {
  if (!userId) return () => {};

  const chatsRef = collection(db, "chats");
  const qChats = query(
    chatsRef,
    where("participantIds", "array-contains", userId),
    orderBy("updatedAt", "desc")
  );

  // Run a one-time migration for this user to backfill participantIds
  if (!migrationRanForUser[userId]) {
    migrationRanForUser[userId] = true;
    migrateOldChatsForUser(userId);
  }

  const unsubscribe = onSnapshot(qChats, (snapshot) => {
    const chats = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return normalizeChat(docSnap.id, data);
    });
    callback(chats);
  });

  return unsubscribe;
}

/**
 * Normalize chat doc into the shape the UI expects.
 */
function normalizeChat(id, data) {
  return {
    id,
    vendor: data.vendorName || "Conversation",
    lastMessage: data.lastMessage || "",
    lastSenderId: data.lastSenderId || null,
    typing: data.typing || {}, // { userId: boolean }
    updatedAt: data.updatedAt || null,
    time: data.updatedAt ? formatListTime(data.updatedAt.toDate()) : "",
    ...data,
  };
}

// ===================================================================
// SUBSCRIBE TO MESSAGES IN A CHAT
// ===================================================================
/**
 * Subscribe to messages for a given chatId, ordered by timestamp asc.
 */
export function subscribeToMessages(chatId, callback) {
  if (!chatId) return () => {};

  const msgsRef = collection(db, "chats", chatId, "messages");
  const qMsgs = query(msgsRef, orderBy("timestamp", "asc"));

  const unsubscribe = onSnapshot(qMsgs, (snapshot) => {
    const messages = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    callback(messages);
  });

  return unsubscribe;
}

// ===================================================================
// FILE UPLOAD FOR ATTACHMENTS
// ===================================================================
/**
 * Upload a file to Firebase Storage for a specific chat.
 * Returns { url, name, type, size } for storing in the message.
 */
export async function uploadChatFile(chatId, file) {
  if (!chatId || !file) throw new Error("chatId and file are required");

  const safeName = file.name || "attachment";
  const path = `chatAttachments/${chatId}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  return {
    url,
    name: safeName,
    type: file.type || "application/octet-stream",
    size: typeof file.size === "number" ? file.size : null,
  };
}

// ===================================================================
// SEND MESSAGE (with optional attachment)
// ===================================================================
/**
 * Send a message in the given chat.
 * - Adds message to messages subcollection
 * - Sets readBy to include senderId
 * - Optionally includes file attachment metadata
 * - Updates chat's lastMessage / lastSenderId / updatedAt
 */
export async function sendMessage(chatId, senderId, text, attachment = null) {
  const trimmed = text ? text.trim() : "";
  if (!chatId || !senderId || (!trimmed && !attachment)) return;

  const msgsRef = collection(db, "chats", chatId, "messages");

  const messageData = {
    senderId,
    text: trimmed,
    timestamp: serverTimestamp(),
    readBy: [senderId], // Sender sees their own message as read
  };

  if (attachment) {
    messageData.fileUrl = attachment.url;
    messageData.fileName = attachment.name;
    messageData.fileType = attachment.type;
    messageData.fileSize = attachment.size;
  }

  await addDoc(msgsRef, messageData);

  // Decide what to show as lastMessage in the chat list
  let lastMessageText = trimmed;
  if (!lastMessageText && attachment) {
    lastMessageText = attachment.name
      ? `Sent: ${attachment.name}`
      : "Sent an attachment";
  }

  const chatRef = doc(db, "chats", chatId);
  await updateDoc(chatRef, {
    lastMessage: lastMessageText,
    lastSenderId: senderId,
    updatedAt: serverTimestamp(),
  });
}

// ===================================================================
// MARK MESSAGES AS READ
// ===================================================================
/**
 * Mark all messages in a chat as read by this userId.
 * Uses readBy: array of userIds on each message.
 */
export async function markMessagesRead(chatId, userId) {
  if (!chatId || !userId) return;

  const msgsRef = collection(db, "chats", chatId, "messages");
  const snapshot = await getDocs(msgsRef);

  const updates = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const readBy = data.readBy || [];
    if (!readBy.includes(userId)) {
      updates.push(
        updateDoc(doc(db, "chats", chatId, "messages", docSnap.id), {
          readBy: arrayUnion(userId),
        })
      );
    }
  });

  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

// ===================================================================
// TYPING INDICATOR
// ===================================================================
/**
 * Set typing state for a user in a given chat.
 * Stored in chat.typing.{userId} = true/false
 */
export async function setTyping(chatId, userId, isTyping) {
  if (!chatId || !userId) return;

  const chatRef = doc(db, "chats", chatId);

  await updateDoc(chatRef, {
    [`typing.${userId}`]: !!isTyping,
  });
}

// ===================================================================
// TIME FORMATTERS
// ===================================================================
/**
 * Format a message timestamp for display under each bubble.
 */
export function formatMessageTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : timestamp;
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format the time for the chat list (short form).
 */
function formatListTime(date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// ===================================================================
// GET OR CREATE CHAT FOR USER & VENDOR
// ===================================================================
/**
 * Get or create a one-to-one chat between a user and a vendor.
 * - userId: client user UID
 * - vendorId: vendor user UID
 */
export async function getOrCreateChat({
  userId,
  vendorId,
  vendorName,
  userName,
}) {
  if (!userId || !vendorId) {
    throw new Error("userId and vendorId are required");
  }

  const chatsRef = collection(db, "chats");

  // Check if chat already exists where both IDs are in participantIds
  const q = query(chatsRef, where("participantIds", "array-contains", userId));
  const existing = await getDocs(q);

  let match = null;
  existing.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.participantIds?.includes(vendorId)) {
      match = docSnap.id;
    }
  });

  if (match) return match;

  // Create a new chat
  const docRef = await addDoc(chatsRef, {
    participantIds: [userId, vendorId],
    userId,
    vendorId,
    vendorName,
    userName,
    lastMessage: "",
    lastSenderId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    typing: {},
  });

  return docRef.id;
}
