# Knowledge Base Ingestion & RAG Pipeline Architecture

This document details how student chats and uploaded documents (PDF, DOCX, TXT) flow through the RAG pipeline into ChromaDB, and how context is retrieved during student troubleshooting sessions.

---

## 1. Document & Chat Ingestion Pipeline

```
[Uploaded File / Promoted Chat]
        │
        ▼
[Text Extraction Parser]  ──►  PDF (pypdf), DOCX (python-docx), TXT / Chat turns
        │
        ▼
[PII Sanitizer]           ──►  Strips emails, phone numbers, and plain passwords
        │
        ▼
[Text Chunker]            ──►  Splits into ~800 char chunks with ~100 char overlap
        │
        ▼
[Vector Store Embedding]  ──►  Generates vectors and stores in ChromaDB collection 'network_kb'
        │
        ▼
[Database Status Update]  ──►  Updates documents.status to 'INDEXED' with chunk_count
```

---

## 2. RAG Retrieval & Two-Step Contextual Reformulation

To prevent multi-turn conversational amnesia (e.g., student asking follow-ups like *"I already tried that, what else?"* or *"Where is that setting in Windows?"*), the system employs **Two-Step Query Rewriting (Contextual Query Reformulation)** before ChromaDB similarity matching.

```
[Student Message Turn]
          │
          ▼
[1. Guard & Classification]  ──►  Rejects off-topic queries immediately
          │
          ▼
[2. Contextual Query Reformulator]
  (History + User Query)     ──►  Resolves pronouns, incorporates previous technical entities
          │                       (e.g., "SVBH", "eduroam", "Windows 11") into a standalone query
          ▼
[3. ChromaDB Vector Search]  ──►  Cosine similarity search on reformulated technical query (Top 6)
          │
          ▼
[4. Score Threshold Filter]  ──►  Discards weak chunks (< 0.3 similarity score)
          │
          ▼
[5. Prompt Context Injection]──►  Injects retrieved SOP text into chat_system.txt under CONTEXT:
          │
          ▼
[6. Multi-Provider LLM Turn] ──►  Generates grounded, numbered troubleshooting advice
```

### Retrieval Steps in Detail:
1. **User Query Input**: Student sends a message via `POST /api/chat/{id}/message`.
2. **Guard Step**: `guard_and_classify` checks network scope and maps high-level problem categories. Off-topic queries receive the standard refusal.
3. **Two-Step Query Rewriting (`contextualize_query`)**:
   - **Turn 1 (Initial Call)**: Translates informal Hinglish/student phrasings (e.g. *"net bohot slow h"*, *"wifi pe yellow triangle aa rha h"*) into formal technical networking terminology (e.g. *"Wi-Fi throughput bandwidth latency congestion"*, *"Wi-Fi limited connectivity DHCP IP conflict"*) so ChromaDB matches official English SOPs.
   - **Turn 2+ (Follow-up Calls)**: Resolves conversational pronouns ("it", "where is that setting") and incorporates previous technical entities (hostel name, OS, switch port, eduroam).
   - Fallback protection guarantees that if rewriting fails or times out, the raw user message is used.
4. **Similarity Search**: `retrieve_context` queries ChromaDB (`network_kb` collection) with the reformulated query for up to 6 chunks.
5. **Similarity Threshold Filtering**: Chunks with similarity score below `MIN_SIMILARITY_THRESHOLD = 0.3` are discarded.
6. **Prompt Injection**: Surviving chunks are injected into `chat_system.txt` under the `CONTEXT:` section.
7. **LLM Generation**: LLM generates friendly, beginner-level troubleshooting steps grounded in retrieved college documentation.
