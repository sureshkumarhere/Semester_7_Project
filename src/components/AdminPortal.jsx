import { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Database, CheckCircle, RefreshCw, AlertCircle, FileCode, FileSpreadsheet, File } from 'lucide-react';
import {
  getStoredDocuments,
  getStoredChunks,
  addFileToKnowledgeBase,
  removeDocumentFromKnowledgeBase,
  clearKnowledgeBase
} from '../utils/knowledgeBase';

export default function AdminPortal() {
  const [documents, setDocuments] = useState(() => getStoredDocuments());
  const [chunks, setChunks] = useState(() => getStoredChunks());
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const fileInputRef = useRef(null);

  const loadKBData = () => {
    const docs = getStoredDocuments();
    const chks = getStoredChunks();
    setDocuments(docs);
    setChunks(chks);
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setStatusMsg({ type: 'info', text: `Processing ${files.length} file(s) into common RAG store...` });

    try {
      let totalNewChunks = 0;
      for (let i = 0; i < files.length; i++) {
        const res = await addFileToKnowledgeBase(files[i]);
        totalNewChunks += res.chunksCount;
      }
      loadKBData();
      setStatusMsg({
        type: 'success',
        text: `Successfully uploaded and indexed ${files.length} file(s) into ${totalNewChunks} RAG chunks!`
      });
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Failed to process files. Please check format.' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleRemove = (docId, docName) => {
    if (window.confirm(`Are you sure you want to remove "${docName}" from the RAG knowledge base?`)) {
      removeDocumentFromKnowledgeBase(docId);
      loadKBData();
      setStatusMsg({ type: 'info', text: `Removed "${docName}" from common RAG.` });
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Reset knowledge base to default configuration?')) {
      clearKnowledgeBase();
      loadKBData();
      setStatusMsg({ type: 'info', text: 'Reset RAG knowledge base to default state.' });
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (['json', 'js', 'html', 'css', 'py'].includes(ext)) return <FileCode size={18} className="icon-code" />;
    if (['csv', 'xlsx', 'xls'].includes(ext)) return <FileSpreadsheet size={18} className="icon-sheet" />;
    if (['pdf', 'txt', 'md', 'doc', 'docx'].includes(ext)) return <FileText size={18} className="icon-doc" />;
    return <File size={18} className="icon-file" />;
  };

  return (
    <div className="admin-portal">
      <div className="admin-header">
        <div className="admin-title">
          <Database size={24} className="accent-icon" />
          <div>
            <h2>Admin Knowledge Base Management (Common RAG)</h2>
            <p>Upload diverse document types (.pdf, .txt, .docx, .md, .csv, .json) to integrate into the shared RAG vector store for all future chatbot sessions.</p>
          </div>
        </div>
        <button className="reset-btn" onClick={handleClearAll} title="Reset to default">
          <RefreshCw size={14} /> Reset Store
        </button>
      </div>

      {statusMsg && (
        <div className={`status-banner ${statusMsg.type}`}>
          {statusMsg.type === 'success' && <CheckCircle size={16} />}
          {statusMsg.type === 'error' && <AlertCircle size={16} />}
          {statusMsg.type === 'info' && <Database size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.json,.csv,.doc,.docx,.log"
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(Array.from(e.target.files))}
        />
        <Upload size={36} className="upload-icon" />
        <h3>Click or Drag & Drop files here to upload</h3>
        <p>Supports <strong>PDF, TXT, Markdown (.md), JSON, CSV, DOCX</strong> and more</p>
        <div className="allowed-badges">
          <span className="type-badge">PDF</span>
          <span className="type-badge">TXT</span>
          <span className="type-badge">DOCX</span>
          <span className="type-badge">CSV</span>
          <span className="type-badge">JSON</span>
          <span className="type-badge">MD</span>
        </div>
        {isUploading && <div className="spinner">Indexing into common vector store...</div>}
      </div>

      {/* RAG Knowledge Base Stats */}
      <div className="stats-cards">
        <div className="stat-card">
          <span className="stat-num">{documents.length}</span>
          <span className="stat-label">Total Documents</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{chunks.length}</span>
          <span className="stat-label">Indexed RAG Chunks</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">Global</span>
          <span className="stat-label">Scope (All Chatbot Sessions)</span>
        </div>
      </div>

      {/* Documents List */}
      <div className="documents-section">
        <h3>Shared Knowledge Base Documents ({documents.length})</h3>
        {documents.length === 0 ? (
          <div className="empty-state">No documents in common RAG. Upload files above to populate knowledge base.</div>
        ) : (
          <div className="document-list">
            {documents.map((doc) => (
              <div key={doc.id} className="document-card">
                <div className="doc-info">
                  {getFileIcon(doc.name)}
                  <div className="doc-details">
                    <span className="doc-name">{doc.name}</span>
                    <span className="doc-meta">
                      {formatSize(doc.size)} • {doc.chunkCount} RAG chunks • Added {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="doc-actions">
                  <span className="rag-status-tag">Active in RAG</span>
                  <button
                    className="delete-btn"
                    onClick={() => handleRemove(doc.id, doc.name)}
                    title="Delete document"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
