import { useState } from 'react';
import { Send, Bot, AlertCircle, BookOpen } from 'lucide-react';
import { searchKnowledgeBase, getStoredDocuments } from '../utils/knowledgeBase';

export default function ChatSidebar({ onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your Network Support Assistant. Describe your issue or ask a question.' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    const userQuery = input.trim();
    if (!userQuery) return;

    const newMessages = [...messages, { role: 'user', text: userQuery }];
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

    // Search common RAG knowledge base for relevant chunks across all uploaded admin documents
    setTimeout(() => {
      const relevantChunks = searchKnowledgeBase(userQuery, 3);
      const totalDocsCount = getStoredDocuments().length;

      let answerText = '';
      let sourcesList = [];

      if (relevantChunks.length > 0) {
        sourcesList = Array.from(new Set(relevantChunks.map(c => c.docName)));
        const primaryContext = relevantChunks[0].content;

        answerText = `Based on our shared RAG Knowledge Base (${sourcesList.join(', ')}):\n\n${primaryContext}`;

        if (relevantChunks.length > 1) {
          answerText += `\n\nAdditional detail from ${relevantChunks[1].docName}: "${relevantChunks[1].content.slice(0, 160)}..."`;
        }
      } else {
        answerText = `I searched our common RAG knowledge base (${totalDocsCount} documents indexed), but didn't find an exact match for your query. For general network support, please check hostel router connections or log a formal complaint.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: answerText,
          sources: sourcesList
        }
      ]);
    }, 500);
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
              <div>
                <div className="msg-text">{msg.text}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="rag-citation">
                    <BookOpen size={12} />
                    <span>Source: {msg.sources.join(', ')}</span>
                  </div>
                )}
              </div>
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