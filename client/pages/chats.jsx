import React, { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "/firebase-auth-ui/firebaseConfig.js";
import {
  subscribeToUserChats,
  subscribeToMessages,
  sendMessage,
  formatMessageTime,
  markMessagesRead,
  setTyping,
  uploadChatFile,
} from "/src/services/chatService";

// Helper: format sticky date separators
function formatDateLabel(date) {
  const today = new Date();
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const t = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const diffDays = Math.round((t - d) / (1000 * 60 * 60 * 24)) * -1;

  if (diffDays === 0) return "Today";
  if (diffDays === -1) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

// Helper: show the "other" person's name for the chat header / pill
function getChatDisplayName(chat, currentUser) {
  if (!chat) return "Chats";
  if (!currentUser) return chat.vendorName || chat.userName || "Conversation";

  if (chat.vendorId && chat.userId) {
    if (currentUser.uid === chat.vendorId) {
      // Vendor is logged in → show client name
      return chat.userName || "Client";
    } else if (currentUser.uid === chat.userId) {
      // Client is logged in → show vendor name
      return chat.vendorName || "Vendor";
    }
  }

  // Fallback
  return chat.vendorName || chat.userName || "Conversation";
}

function Chats() {
  const [currentUser, setCurrentUser] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  const [isTypingLocal, setIsTypingLocal] = useState(false); // this user typing
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Attachment state
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentName, setAttachmentName] = useState("");
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");

  // Auto-scroll down when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auth + chat list subscription
  useEffect(() => {
    let unsubscribeChats = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setChatList([]);
      setSelectedChatId(null);
      setSelectedChat(null);
      setMessages([]);
      setAttachmentFile(null);
      setAttachmentName("");
      setAttachmentError("");

      if (unsubscribeChats) {
        unsubscribeChats();
        unsubscribeChats = null;
      }

      if (user) {
        unsubscribeChats = subscribeToUserChats(user.uid, (chats) => {
          setChatList(chats);
        });
      }
    });

    return () => {
      if (unsubscribeChats) unsubscribeChats();
      unsubscribeAuth();
    };
  }, []);

  // Auto-select first chat when there is no selection
  useEffect(() => {
    if (currentUser && chatList.length > 0 && !selectedChatId) {
      setSelectedChatId(chatList[0].id);
    }
  }, [currentUser, chatList, selectedChatId]);

  // Subscribe to messages for selected chat
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    const unsubscribeMessages = subscribeToMessages(selectedChatId, (msgs) => {
      setMessages(msgs);
    });

    return () => {
      unsubscribeMessages();
    };
  }, [selectedChatId]);

  // Keep selectedChat object in sync
  useEffect(() => {
    const found = chatList.find((c) => c.id === selectedChatId);
    setSelectedChat(found || null);
  }, [chatList, selectedChatId]);

  // Mark messages as read when messages change
  useEffect(() => {
    if (!selectedChatId || !currentUser || messages.length === 0) return;
    markMessagesRead(selectedChatId, currentUser.uid).catch((err) =>
      console.error("Error marking messages read", err)
    );
  }, [messages, selectedChatId, currentUser]);

  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
    // clear attachment + typing when switching
    setAttachmentFile(null);
    setAttachmentName("");
    setAttachmentError("");
  };

  // Send message (with optional attachment)
  const handleSendMessage = async () => {
    if (!currentUser || !selectedChatId) return;
    const trimmed = newMessage.trim();

    if (!trimmed && !attachmentFile) return;

    try {
      setAttachmentError("");
      let attachmentMeta = null;

      if (attachmentFile) {
        setUploadingAttachment(true);
        attachmentMeta = await uploadChatFile(selectedChatId, attachmentFile);
        setUploadingAttachment(false);
      }

      await sendMessage(selectedChatId, currentUser.uid, trimmed, attachmentMeta);
      setNewMessage("");
      setAttachmentFile(null);
      setAttachmentName("");

      // Stop typing
      if (isTypingLocal) {
        setTyping(selectedChatId, currentUser.uid, false).catch(() => {});
        setIsTypingLocal(false);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setUploadingAttachment(false);
      setAttachmentError("Failed to send message or upload file. Please try again.");
      alert("Failed to send message. Please try again.");
    }
  };

  // Handle textarea typing (for typing indicator)
  const handleChangeMessage = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    if (!currentUser || !selectedChatId) return;

    // Turn typing on if not already
    if (!isTypingLocal) {
      setTyping(selectedChatId, currentUser.uid, true).catch(() => {});
      setIsTypingLocal(true);
    }

    // Reset timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Turn typing off after 1.5 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(selectedChatId, currentUser.uid, false).catch(() => {});
      setIsTypingLocal(false);
    }, 1500);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle selecting a file
  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setAttachmentFile(file);
    setAttachmentName(file.name);
    setAttachmentError("");
  };

  // Presence / last seen
  const getPresenceLabel = (chat) => {
    if (!chat || !chat.updatedAt) return "Offline";

    const date = chat.updatedAt.toDate();
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);

    if (diffMin < 2) return "Online";
    if (diffMin < 60) return `Last seen ${diffMin} min ago`;

    const hours = Math.floor(diffMin / 60);
    if (hours < 24) return `Last seen ${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `Last seen ${days}d ago`;
  };

  // Determine typing status by other user
  const getOtherTypingLabel = () => {
    if (!selectedChat || !selectedChat.typing || !currentUser) return "";

    const entries = Object.entries(selectedChat.typing);
    const other = entries.find(
      ([userId, isTyping]) => userId !== currentUser.uid && isTyping
    );
    if (!other) return "";

    const otherUserId = other[0];
    let label = "The other user is typing…";
    if (selectedChat.vendorId && selectedChat.userId) {
      if (otherUserId === selectedChat.vendorId) label = "Vendor is typing…";
      else if (otherUserId === selectedChat.userId) label = "Client is typing…";
    }
    return label;
  };

  const headerTitle = getChatDisplayName(selectedChat, currentUser);
  const headerStatus = selectedChat ? getPresenceLabel(selectedChat) : "";
  const otherTypingLabel = getOtherTypingLabel();

  // Build grouped messages with sticky date separators
  const groupedMessages = [];
  let lastDateKey = null;

  messages.forEach((msg) => {
    if (!msg.timestamp) return;
    const dateObj = msg.timestamp.toDate
      ? msg.timestamp.toDate()
      : new Date(msg.timestamp);

    const key = dateObj.toDateString();
    if (key !== lastDateKey) {
      groupedMessages.push({
        type: "date",
        id: `date-${key}`,
        label: formatDateLabel(dateObj),
      });
      lastDateKey = key;
    }

    groupedMessages.push({
      type: "msg",
      ...msg,
    });
  });

  // Compute read receipts (WhatsApp-style)
  const getReadReceiptIcon = (msg) => {
    if (!currentUser || !selectedChat || msg.senderId !== currentUser.uid) {
      return null;
    }

    const participants = selectedChat.participantIds || [];
    const others = participants.filter((id) => id !== currentUser.uid);
    const readBy = msg.readBy || [];

    // If no others, treat as delivered only
    if (others.length === 0) {
      return (
        <span
          style={{
            marginLeft: "4px",
            fontSize: "11px",
            color: "#9ca3af",
          }}
        >
          ✓
        </span>
      );
    }

    const allSeen = others.every((id) => readBy.includes(id));

    // Single grey check = delivered
    // Double blue check = seen
    if (allSeen) {
      return (
        <span
          style={{
            marginLeft: "4px",
            fontSize: "11px",
            color: "#3b82f6", // blue for seen
          }}
        >
          ✓✓
        </span>
      );
    } else {
      return (
        <span
          style={{
            marginLeft: "4px",
            fontSize: "11px",
            color: "#9ca3af", // grey
          }}
        >
          ✓
        </span>
      );
    }
  };

  return (
    <main>
      <div className="content">
        <h1>Chats</h1>
        <p>
          Connect with vendors and manage your SoleLink conversations in one
          place.
        </p>

        {!currentUser && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              borderRadius: "10px",
              border: "1px solid #ddd",
              background: "var(--card-bg)",
            }}
          >
            <p className="no-results" style={{ margin: 0 }}>
              You must be logged in to view and send messages.
            </p>
          </div>
        )}

        {currentUser && (
          <div
            style={{
              marginTop: "1.5rem",
              border: "1px solid #ddd",
              borderRadius: "12px",
              background: "var(--card-bg)",
              overflow: "hidden",
            }}
          >
            {/* Header: selected chat + presence + conversation pills */}
            <div
              style={{
                padding: "1rem",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              {/* Selected conversation header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.8rem",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "999px",
                      background: "#e5e7eb",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      fontWeight: 600,
                      marginRight: "10px",
                    }}
                  >
                    {headerTitle.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "15px" }}>
                      {headerTitle}
                    </div>
                    {selectedChat && (
                      <div
                        style={{
                          fontSize: "12px",
                          color:
                            headerStatus === "Online"
                              ? "#16a34a"
                              : "#6b7280",
                          display: "flex",
                          gap: "6px",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background:
                              headerStatus === "Online"
                                ? "#22c55e"
                                : "#9ca3af",
                          }}
                        ></span>
                        {otherTypingLabel || headerStatus}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "11px",
                    color: "#6b7280",
                  }}
                >
                  {chatList.length} conversation
                  {chatList.length === 1 ? "" : "s"}
                </div>
              </div>

              {/* Conversation chips */}
              {chatList.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  {chatList.map((chat) => {
                    const isActive = chat.id === selectedChatId;
                    const label = getChatDisplayName(chat, currentUser);

                    const lastMsgFromOther =
                      chat.lastSenderId &&
                      currentUser &&
                      chat.lastSenderId !== currentUser.uid;

                    return (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => handleSelectChat(chat.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "0.45rem 0.75rem",
                          borderRadius: "999px",
                          border: isActive
                            ? "1px solid transparent"
                            : "1px solid #d1d5db",
                          background: isActive
                            ? "var(--accent-color)"
                            : "#ffffff",
                          color: isActive ? "#ffffff" : "#374151",
                          fontSize: "13px",
                          cursor: "pointer",
                          position: "relative",
                        }}
                      >
                        {/* Avatar */}
                        <div
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "999px",
                            background: "#e5e7eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 600,
                          }}
                        >
                          {label.charAt(0).toUpperCase()}
                        </div>

                        {/* Label */}
                        <span
                          style={{
                            maxWidth: "120px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={label}
                        >
                          {label}
                        </span>

                        {/* Unread dot (if last msg from other and chat not active) */}
                        {lastMsgFromOther && !isActive && (
                          <span
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: "var(--accent-color)",
                              position: "absolute",
                              top: "-2px",
                              right: "-2px",
                            }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="no-results" style={{ margin: "0.25rem 0 0" }}>
                  No conversations yet. Start a chat from the Vendors page.
                </p>
              )}
            </div>

            {/* Chat body: messages + input */}
            {selectedChat ? (
              <>
                {/* Messages area */}
                <div
                  style={{
                    height: "360px",
                    overflowY: "auto",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {groupedMessages.map((item) => {
                    if (item.type === "date") {
                      return (
                        <div
                          key={item.id}
                          style={{
                            textAlign: "center",
                            margin: "0.35rem 0",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "999px",
                              background: "#e5e7eb",
                              fontSize: "11px",
                              color: "#4b5563",
                            }}
                          >
                            {item.label}
                          </span>
                        </div>
                      );
                    }

                    const msg = item;
                    const isOwn =
                      currentUser && msg.senderId === currentUser.uid;

                    // Detect if there's an attachment
                    const hasAttachment = !!msg.fileUrl;

                    const isImage =
                      hasAttachment &&
                      msg.fileType &&
                      msg.fileType.startsWith("image/");

                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isOwn ? "flex-end" : "flex-start",
                          maxWidth: "70%",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <div
                          style={{
                            background: isOwn
                              ? "var(--accent-color)"
                              : "#e5e7eb",
                            color: isOwn ? "#fff" : "#111827",
                            padding: "8px 12px",
                            borderRadius: "14px",
                            borderBottomRightRadius: isOwn ? "4px" : "14px",
                            borderBottomLeftRadius: isOwn ? "14px" : "4px",
                            fontSize: "14px",
                            wordWrap: "break-word",
                          }}
                        >
                          {/* Attachment preview */}
                          {hasAttachment && (
                            <div style={{ marginBottom: msg.text ? "6px" : 0 }}>
                              {isImage ? (
                                <a
                                  href={msg.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ display: "inline-block" }}
                                >
                                  <img
                                    src={msg.fileUrl}
                                    alt={msg.fileName || "Attachment"}
                                    style={{
                                      maxWidth: "200px",
                                      maxHeight: "200px",
                                      borderRadius: "8px",
                                      display: "block",
                                      marginBottom: "4px",
                                    }}
                                  />
                                  {msg.fileName && (
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        textDecoration: "underline",
                                      }}
                                    >
                                      {msg.fileName}
                                    </span>
                                  )}
                                </a>
                              ) : (
                                <a
                                  href={msg.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    fontSize: "13px",
                                    textDecoration: "underline",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <span>📎</span>
                                  <span>{msg.fileName || "Download file"}</span>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Text body (if any) */}
                          {msg.text}
                        </div>

                        <div
                          style={{
                            fontSize: "11px",
                            color: "#6b7280",
                            marginTop: "2px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: isOwn
                              ? "flex-end"
                              : "flex-start",
                          }}
                        >
                          {formatMessageTime(msg.timestamp)}
                          {/* Read receipt icon for own messages */}
                          {isOwn && getReadReceiptIcon(msg)}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div
                  style={{
                    padding: "0.7rem 1rem",
                    borderTop: "1px solid #e5e7eb",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {/* Attachment preview + error */}
                  {(attachmentName || attachmentError) && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: attachmentError ? "#b91c1c" : "#374151",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>
                        {attachmentError
                          ? attachmentError
                          : `Attached: ${attachmentName}`}
                      </span>
                      {attachmentName && !uploadingAttachment && (
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentFile(null);
                            setAttachmentName("");
                            setAttachmentError("");
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "#6b7280",
                            cursor: "pointer",
                            fontSize: "12px",
                            textDecoration: "underline",
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                    }}
                  >
                    {/* Hidden file input + label button */}
                    <label
                      style={{
                        borderRadius: "999px",
                        border: "1px solid #d1d5db",
                        padding: "0.45rem 0.8rem",
                        fontSize: "13px",
                        cursor: "pointer",
                        background: "#ffffff",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      📎 Attach
                      <input
                        type="file"
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                      />
                    </label>

                    <textarea
                      value={newMessage}
                      onChange={handleChangeMessage}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message…"
                      rows={1}
                      style={{
                        flex: 1,
                        resize: "none",
                        padding: "0.55rem 0.6rem",
                        borderRadius: "10px",
                        border: "1px solid #d1d5db",
                        fontSize: "14px",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={
                        (!newMessage.trim() && !attachmentFile) ||
                        uploadingAttachment
                      }
                      className="cta-btn"
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {uploadingAttachment ? "Sending…" : "Send"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  padding: "1.5rem",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "#6b7280" }}>
                  Select a conversation above to start chatting.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default Chats;
