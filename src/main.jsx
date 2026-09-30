import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log("🚀 [DEBUG]: Main entry point executing...");

const rootElement = document.getElementById('root');
if (rootElement) {
  console.log("✅ [DEBUG]: Found #root element in index.html");
} else {
  console.error("❌ [DEBUG]: #root element NOT found in index.html!");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)