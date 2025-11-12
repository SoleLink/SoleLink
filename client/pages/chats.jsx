import React, { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase-auth-ui/firebaseConfig";
import {
  subscribeToUserChats,
  subscribeToMessages,
  sendMessage,
  formatMessageTime,
} from "../src/services/chatService";

function Chats() {
  const [currentUser, setCurrentUser] = useState(null);
  const [chatList, setChatList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef(null);

  // Track authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return unsubscribe;
  }, []);

  // Subscribe to user's chats
  useEffect(() => {
    if (!currentUser) {
      setChatList([]);
      return;
    }

    const unsubscribe = subscribeToUserChats(currentUser.uid, (chats) => {
      setChatList(chats);
    });

    return unsubscribe;
  }, [currentUser]);

  // Subscribe to messages when a chat is selected
  useEffect(() => {
    if (!selectedChatId || !currentUser) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(selectedChatId, (msgs) => {
      setMessages(msgs);
    });

    return unsubscribe;
  }, [selectedChatId, currentUser]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelectChat = (chat) => {
    setSelectedChat(chat);
    setSelectedChatId(chat.id);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedChatId || !currentUser) return;

    try {
      await sendMessage(selectedChatId, currentUser.uid, messageInput);
      setMessageInput("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!currentUser) {
    return (
      <main className="content chat-page">
        <h1>Your Conversations</h1>
        <div className="chat-container">
          <div className="chat-placeholder" style={{ textAlign: "center", padding: "2rem" }}>
            <p>Please log in to view your conversations</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="content chat-page">
      <h1>Your Conversations</h1>
      <div className="chat-container">
        {/* Chat List Sidebar */}
        <aside className="chat-list">
          {chatList.length === 0 ? (
            <div className="chat-placeholder" style={{ padding: "1rem" }}>
              <p>No conversations yet. Start chatting with a vendor!</p>
            </div>
          ) : (
            chatList.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item ${
                  selectedChatId === chat.id ? "active" : ""
                }`}
                onClick={() => handleSelectChat(chat)}
              >
                <h3>{chat.vendor}</h3>
                <p>{chat.lastMessage || "No messages yet"}</p>
                <span className="chat-time">{chat.time || ""}</span>
              </div>
            ))
          )}
        </aside>

        {/* Chat Window */}
        <section className="chat-window">
          {selectedChat ? (
            <>
              <div className="chat-header">
                <h2>{selectedChat.vendor}</h2>
              </div>
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="chat-placeholder" style={{ padding: "1rem" }}>
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isUser = msg.senderId === currentUser.uid;
                      return (
                        <div
                          key={msg.id}
                          className={`message ${isUser ? "user" : "vendor"}`}
                        >
                          <div className="message-text">{msg.text}</div>
                          {msg.timestamp && (
                            <div className="message-time">
                              {formatMessageTime(msg.timestamp)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
              <div className="chat-input">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <button onClick={handleSendMessage}>Send</button>
              </div>
            </>
          ) : (
            <div className="chat-placeholder">
              <p>Select a chat to view the conversation</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default Chats;
