import React, { useState } from "react";


function Chats() {
  const [selectedChat, setSelectedChat] = useState(null);


  const chatList = [
    {
      id: 1,
      vendor: "CleanKicks",
      lastMessage: "Hello, we just finished cleaning...",
      time: "2:45 PM",
      messages: [
        { sender: "vendor", text: "Hello, we just finished cleaning your shoes, they will be ready for pick up tomorrow!" },
        { sender: "user", text: "Thanks, I will stop by tomorrow!" }
      ],
    }
  ];

  return (
    <main className="content chat-page">
      <h1>Your Conversations</h1>
      <div className="chat-container">
        {/* Chat List Sidebar */}
        <aside className="chat-list">
          {chatList.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${
                selectedChat && selectedChat.id === chat.id ? "active" : ""
              }`}
              onClick={() => setSelectedChat(chat)}
            >
              <h3>{chat.vendor}</h3>
              <p>{chat.lastMessage}</p>
              <span className="chat-time">{chat.time}</span>
            </div>
          ))}
        </aside>

        {/* Chat Window */}
        <section className="chat-window">
          {selectedChat ? (
            <>
              <div className="chat-header">
                <h2>{selectedChat.vendor}</h2>
              </div>
              <div className="chat-messages">
                {selectedChat.messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`message ${msg.sender === "user" ? "user" : "vendor"}`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <input type="text" placeholder="Type a message..." disabled />
                <button disabled>Send</button>
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
