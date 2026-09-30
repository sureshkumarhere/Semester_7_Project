import React, { useState } from 'react';
import { Send, Bot, User, AlertCircle } from 'lucide-react';

export default function ChatSidebar({ onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your Network Support Assistant. Describe your issue or ask a question.' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', text: input }];
    setMessages(newMessages);
    setInput('');

    // Check message count condition (> 10 messages triggers complaint logging)
    if (newMessages.length >= 10) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'system',
            text: '⚠️ Message threshold reached (10+ messages). Automatically logging a formal complaint with the Computer Center...'
          }
        ]);
      }, 500);
      return;
    }

    // Mock AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'I am checking the network guides for your query...' }
      ]);
    }, 600);
  };

  return (
    <div className="chat-sidebar">
      <div className="chat-header">
        <div className="title">
          <Bot size={20} />
          <span>Network Support AI</span>
        </div>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>

      <div className="chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message-bubble ${msg.role}`}>
            {msg.role === 'system' ? (
              <div className="system-msg">
                <AlertCircle size={16} />
                <span>{msg.text}</span>
              </div>
            ) : (
              msg.text
            )}
          </div>
        ))}
      </div>

      <div className="chat-counter">
        Messages exchanged: {messages.length} / 10
      </div>

      <div className="chat-footer">
        <input
          type="text"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}