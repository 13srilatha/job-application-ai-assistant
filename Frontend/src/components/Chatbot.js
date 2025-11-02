import React, { useState } from "react";

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { from: "user", text: input }]);
    setMessages((prev) => [...prev, { from: "bot", text: "Thinking..." }]);
    setInput("");
    // TODO: Replace with API call
    setTimeout(() => {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { from: "bot", text: "This is a demo chatbot response." },
      ]);
    }, 800);
  };

  return (
    <>
      <button
        className="robot-btn"
        onClick={() => setOpen(!open)}
        title="Chat with Assistant"
      >
        🤖
      </button>
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <span>Assistant</span>
            <button className="chat-close" onClick={() => setOpen(false)}>
              ✖
            </button>
          </div>
          <div className="chat-body">
            {messages.map((m, i) => (
              <div key={i} style={{ margin: "6px 0" }}>
                <b>{m.from === "user" ? "You" : "Bot"}:</b> {m.text}
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              type="text"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button onClick={handleSend}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
