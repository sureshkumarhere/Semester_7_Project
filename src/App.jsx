import React, { useState, useRef } from 'react';
import Header from './components/Header';
import ComplaintForm from './components/ComplaintForm';
import ChatSidebar from './components/ChatSidebar';
import { MessageSquareText } from 'lucide-react';
import './App.css';

export default function App() {
  const [chatWidth, setChatWidth] = useState(380);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const isDragging = useRef(false);

  // Drag handlers for adjusting split width
  const startResizing = () => {
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth > 280 && newWidth < 700) {
      setChatWidth(newWidth);
    }
  };

  const stopResizing = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
  };

  return (
    <div className="app-container">
      <Header />

      <div className="main-content">
        {/* Left Side: Official Portal Form */}
        <div className="portal-section">
          <ComplaintForm />
        </div>

        {/* Floating Toggle Button when closed */}
        {!isChatOpen && (
          <button className="chat-toggle-btn" onClick={() => setIsChatOpen(true)}>
            <MessageSquareText size={20} />
            <span>AI Support</span>
          </button>
        )}

        {/* Right Side: Split View Chatbot Drawer */}
        {isChatOpen && (
          <div className="split-chat-wrapper" style={{ width: `${chatWidth}px` }}>
            {/* Draggable Divider Handle */}
            <div className="resizer-handle" onMouseDown={startResizing} />
            <ChatSidebar onClose={() => setIsChatOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}


