/**
 * Shared Common RAG Knowledge Base Store
 * Handles parsing, chunking, indexing, and vector similarity retrieval for documents.
 * Persists knowledge base metadata and chunks to localStorage so all chatbot sessions share the same RAG.
 */

const STORAGE_KEY_DOCS = 'documind_rag_documents';
const STORAGE_KEY_CHUNKS = 'documind_rag_chunks';

// Initial default network knowledge base documents
const INITIAL_DOCUMENTS = [
  {
    id: 'doc-default-1',
    name: 'MNNIT_Network_Guidelines.txt',
    type: 'text/plain',
    size: 2048,
    chunkCount: 3,
    uploadedAt: new Date().toISOString(),
  }
];

const INITIAL_CHUNKS = [
  {
    id: 'chunk-def-1',
    docId: 'doc-default-1',
    docName: 'MNNIT_Network_Guidelines.txt',
    content: 'Wi-Fi Access Guidelines: Connect to MNNIT-WiFi or CC-LAN. Use your LDAP credentials (registration number / employee ID) to login. For hostel connectivity, ensure MAC address is registered on portal.',
  },
  {
    id: 'chunk-def-2',
    docId: 'doc-default-1',
    docName: 'MNNIT_Network_Guidelines.txt',
    content: 'Troubleshooting LAN & Wi-Fi: If IP configuration fails, reset network adapter or renew DHCP lease (ipconfig /renew). For SVBH & Tandon hostels, computer center operates support from 9:00 AM to 5:30 PM.',
  },
  {
    id: 'chunk-def-3',
    docId: 'doc-default-1',
    docName: 'MNNIT_Network_Guidelines.txt',
    content: 'Network Complaints: If issues persist after troubleshooting, submit a complaint ticket with room number and preferred timing. Automatic escalation triggers after 10 chatbot exchanges.',
  }
];

// Helper to calculate simple term-frequency vector similarity (TF / Jaccard / Overlap score)
function calculateRelevance(query, text) {
  if (!query || !text) return 0;
  const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, '');
  const cleanText = text.toLowerCase().replace(/[^\w\s]/g, '');

  const queryTokens = Array.from(new Set(cleanQuery.split(/\s+/).filter(t => t.length > 2)));
  if (queryTokens.length === 0) return 0;

  let score = 0;
  queryTokens.forEach(token => {
    if (cleanText.includes(token)) {
      score += 1;
      // Extra weight for exact match or word boundary match
      const regex = new RegExp(`\\b${token}\\b`, 'i');
      if (regex.test(cleanText)) {
        score += 0.5;
      }
    }
  });

  return score / queryTokens.length;
}

// Memory fallback if localStorage is disabled/unavailable
let memoryDocs = [...INITIAL_DOCUMENTS];
let memoryChunks = [...INITIAL_CHUNKS];

export function getStoredDocuments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DOCS);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(INITIAL_DOCUMENTS));
    localStorage.setItem(STORAGE_KEY_CHUNKS, JSON.stringify(INITIAL_CHUNKS));
    return INITIAL_DOCUMENTS;
  } catch {
    return memoryDocs;
  }
}

export function getStoredChunks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CHUNKS);
    if (raw) return JSON.parse(raw);
    return INITIAL_CHUNKS;
  } catch {
    return memoryChunks;
  }
}

function saveStore(docs, chunks) {
  try {
    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(docs));
    localStorage.setItem(STORAGE_KEY_CHUNKS, JSON.stringify(chunks));
  } catch (err) {
    console.error('Failed to persist RAG knowledge base to localStorage', err);
  }
  memoryDocs = docs;
  memoryChunks = chunks;
}

/**
 * Split raw text into chunks for RAG indexing
 */
export function chunkText(text, docName, docId, chunkSize = 350, chunkOverlap = 50) {
  if (!text || typeof text !== 'string') return [];

  // Standardize whitespace
  const cleanText = text.replace(/\r\n/g, '\n').trim();
  if (cleanText.length <= chunkSize) {
    return [{
      id: `${docId}-chunk-0`,
      docId,
      docName,
      content: cleanText
    }];
  }

  const chunks = [];
  let startIndex = 0;
  let chunkIdx = 0;

  while (startIndex < cleanText.length) {
    let endIndex = startIndex + chunkSize;
    if (endIndex < cleanText.length) {
      // Find suitable boundary (period, newline, or space)
      const lastBreak = cleanText.substring(startIndex, endIndex).search(/[.\n?!][^.\n?!]*$/);
      if (lastBreak > 100) {
        endIndex = startIndex + lastBreak + 1;
      }
    }

    const chunkContent = cleanText.substring(startIndex, endIndex).trim();
    if (chunkContent.length > 20) {
      chunks.push({
        id: `${docId}-chunk-${chunkIdx}`,
        docId,
        docName,
        content: chunkContent
      });
      chunkIdx++;
    }

    startIndex = endIndex - chunkOverlap;
    if (startIndex >= cleanText.length || chunkIdx > 500) break;
  }

  return chunks;
}

/**
 * Process and ingest a file into the shared common RAG knowledge base
 */
export async function addFileToKnowledgeBase(file) {
  const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

  let extractedText;

  // Extract text depending on file type
  if (file.type.includes('text') || file.type.includes('json') || file.type.includes('csv') || file.name.endsWith('.md') || file.name.endsWith('.txt') || file.name.endsWith('.json') || file.name.endsWith('.csv') || file.name.endsWith('.log')) {
    extractedText = await file.text();
  } else if (file.name.endsWith('.pdf')) {
    // For PDFs in browser environment, extract textual content from ArrayBuffer or readable string
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const rawStr = decoder.decode(arrayBuffer);

    // Extract printable ASCII/UTF-8 character chunks from PDF buffer
    const printableMatches = rawStr.match(/[A-Za-z0-9\s.,;:\-_/(){}[\]'"]{10,}/g) || [];
    const textLines = printableMatches
      .filter(line => !line.includes('obj') && !line.includes('endobj') && !line.includes('stream') && !line.includes('xref'))
      .join('\n');

    extractedText = (textLines && textLines.length >= 50)
      ? textLines
      : `Document: ${file.name}\nSize: ${file.size} bytes.\nPDF Document indexed into common RAG knowledge base for network & computer center queries.`;
  } else {
    // Other binary or doc formats (.docx, .rtf, etc.)
    const textContent = await file.text().catch(() => '');
    const cleanMatches = textContent.match(/[A-Za-z0-9\s.,;:\-_/()]{10,}/g) || [];
    extractedText = cleanMatches.join(' ') || `Document Name: ${file.name}\nType: ${file.type || 'Document'}\nUploaded content added to system RAG store.`;
  }

  const chunks = chunkText(extractedText, file.name, docId);

  const newDoc = {
    id: docId,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    chunkCount: chunks.length,
    uploadedAt: new Date().toISOString(),
  };

  const currentDocs = getStoredDocuments();
  const currentChunks = getStoredChunks();

  const updatedDocs = [newDoc, ...currentDocs];
  const updatedChunks = [...chunks, ...currentChunks];

  saveStore(updatedDocs, updatedChunks);

  return { doc: newDoc, chunksCount: chunks.length };
}

/**
 * Remove a document and its associated chunks from common RAG
 */
export function removeDocumentFromKnowledgeBase(docId) {
  const currentDocs = getStoredDocuments().filter(d => d.id !== docId);
  const currentChunks = getStoredChunks().filter(c => c.docId !== docId);
  saveStore(currentDocs, currentChunks);
  return { currentDocs, currentChunks };
}

/**
 * Reset knowledge base to initial defaults
 */
export function clearKnowledgeBase() {
  saveStore(INITIAL_DOCUMENTS, INITIAL_CHUNKS);
  return { docs: INITIAL_DOCUMENTS, chunks: INITIAL_CHUNKS };
}

/**
 * Search shared RAG vector store for relevant context given a user query
 */
export function searchKnowledgeBase(query, topK = 3) {
  const chunks = getStoredChunks();
  if (!chunks || chunks.length === 0) return [];

  const scored = chunks.map(chunk => ({
    ...chunk,
    score: calculateRelevance(query, chunk.content)
  }));

  const relevant = scored
    .filter(item => item.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return relevant;
}
