# MNNIT Network Portal - System Architecture & Data Models

This document presents the complete architectural schema design of the **MNNIT Allahabad Network Complaint Portal**. It is structured into **four core interconnected clusters**, highlighting major business entities and their relationships.

---

## 1. Master Architectural Overview

The system bridges **Students**, **Staff / Technicians**, **Physical Network Hardware**, and **Autonomous AI Agents** into an integrated workflow.

```mermaid
graph TD
    subgraph Cluster1["1. Student Complaint Lifecycle"]
        C[Complaint Document]
        CH[Audit History Timeline]
        R[Student Star Rating]
    end

    subgraph Cluster2["2. Network Infrastructure & Assets"]
        LOC[Hierarchical Locations<br/>Hostel / Building / Room]
        AST[Network Assets<br/>Switch / Router / AP]
        PORT[Switch Port Mapping]
        STK[Consumable Stock Items]
        TX[Stock Transactions]
    end

    subgraph Cluster3["3. Agentic AI & Knowledge Base"]
        JOB[Agent Processing Jobs]
        RUNS[Agent Sub-Task Telemetry]
        DOC[RAG Knowledge Base Docs]
        CHAT[Anonymous Assistant Chats]
    end

    subgraph Cluster4["4. Staff & Accountability"]
        STAFF[Staff Users & Technicians]
        PROF[Technician Workload Profile]
        AUDIT[Admin Security Logs]
    end

    %% Cross-Cluster Links
    C -->|Logs events to| CH
    C -->|Receives feedback in| R
    C -->|Assigned to| STAFF
    STAFF -->|Embedded profile| PROF
    
    LOC -->|Parent-Child Hierarchy| LOC
    LOC -->|Houses| AST
    AST -->|Equipped with| PORT
    PORT -->|Delivers link to| LOC
    C -->|Pinned to| LOC
    C -->|Affects equipment| AST
    
    C -->|Triggers evaluation| JOB
    JOB -->|Executes sub-agents| RUNS
    DOC -->|Provides context chunks to| CHAT
    CHAT -->|Can pre-fill| C

    C -->|Consumes parts from| TX
    STK -->|Transacted via| TX
    TX -->|Used by technician| STAFF
    STAFF -->|Tracked via| AUDIT
```

---

## 2. Cluster 1: Complaint Lifecycle & Resolution Schemas

Tracks complaints from student submission through AI triage, technician repair, stock consumption, and student rating confirmation.

```mermaid
erDiagram
    COMPLAINT ||--o{ COMPLAINT_HISTORY : "tracks timeline events"
    COMPLAINT ||--o| RATING : "receives student review"
    COMPLAINT ||--o{ USED_STOCK_ITEM : "embeds consumed parts"
    COMPLAINT ||--o{ ASSET_ACTION : "embeds hardware status changes"

    COMPLAINT {
        string ticket_id PK "12-digit unique ID (YYMMDDHHMMSS)"
        string student_name "Student full name"
        string student_email "College email address"
        string student_mobile "10-digit mobile number"
        string location "Hostel / Department name"
        string address_room "Specific room or lab number"
        string problem_type "WIFI | LAN | IP | PROXY | PORT | OTHER"
        string status "SUBMITTED | CLASSIFIED | ASSIGNED | DIAGNOSED | ACTION_TAKEN | CLOSED"
        string priority "LOW | MEDIUM | HIGH | CRITICAL"
        string assigned_technician_id FK "References StaffUser"
        string diagnosis "Technician fault diagnosis text"
        string solution "Technician fix description"
        datetime created_at "Registration timestamp"
        datetime closed_at "Final closure timestamp"
    }

    COMPLAINT_HISTORY {
        string ticket_id FK "References Complaint"
        string event_type "STATUS_CHANGE | ASSIGNMENT | PRIORITY_CHANGE | JUNK"
        string from_status "Previous lifecycle status"
        string to_status "New lifecycle status"
        string actor_type "USER | SYSTEM | AGENT"
        string actor_name "Name of technician, manager, or AI"
        string note "Audit justification or escalation note"
        datetime at "Event timestamp"
    }

    RATING {
        string ticket_id FK "References Complaint"
        int rating "1 to 5 Stars scale"
        string feedback "Optional student feedback comments"
        datetime rated_at "Rating timestamp"
    }

    USED_STOCK_ITEM {
        string stock_item_id FK "References StockItem"
        string name "Item display name (e.g. Cat6 Cable)"
        int quantity "Number of units used"
        string used_by "Technician name"
        datetime used_at "Usage timestamp"
    }

    ASSET_ACTION {
        string asset_id FK "References NetworkAsset"
        string new_status "FAULTY | REPLACED | UNDER_REPAIR"
        string reason "Explanation of equipment modification"
    }
```

### Key Business Significance:
- **Zero-Data-Loss Audit Trail**: Every status transition, priority upgrade, and technician re-assignment is immutably logged in `COMPLAINT_HISTORY`.
- **Embedded Accountability**: Parts used and hardware replaced are recorded directly inside the complaint record to guarantee billing and stock integrity.

---

## 3. Cluster 2: Network Infrastructure, Assets & Stock Schemas

Models physical campus geography (hostels, labs, floors, rooms), hardware assets (switches, routers, APs), switch port patchings, and consumable stock parts.

```mermaid
erDiagram
    LOCATION ||--o{ LOCATION : "parent-child tree (Hostel -> Room)"
    LOCATION ||--o{ NETWORK_ASSET : "contains hardware"
    LOCATION ||--o{ SWITCH_PORT : "serves specific room"
    NETWORK_ASSET ||--o{ SWITCH_PORT : "has physical ports"
    STOCK_ITEM ||--o{ STOCK_TRANSACTION : "logged changes"
    LOCATION ||--o{ STOCK_ITEM : "store room location"

    LOCATION {
        string id PK "Unique location ID"
        string name "e.g. SVBH Hostel, Room 102, CC Lab"
        string code "e.g. SVBH, SVBH-R102, CC-LAB1"
        string type "HOSTEL | BUILDING | LAB | ROOM"
        string parent_id FK "Self-reference to parent location"
    }

    NETWORK_ASSET {
        string id PK "Unique asset ID"
        string asset_tag UK "Inventory barcode tag (e.g. MNNIT-SW-001)"
        string serial_number UK "Manufacturer hardware serial"
        string category "SWITCH | ROUTER | ACCESS_POINT | UPS"
        string make "Manufacturer (Cisco, Aruba, D-Link)"
        string model "Model number"
        string status "IN_USE | SPARE | FAULTY | UNDER_REPAIR | RETIRED"
        string location_id FK "Current installed location"
        string ip_address "Management IP address"
        string mac_address "Physical MAC address"
        int total_ports "Total physical port count"
    }

    SWITCH_PORT {
        string id PK "Unique port record ID"
        string switch_id FK "References NetworkAsset (Switch)"
        int port_number "Port index (1 to 48)"
        string status "FREE | CONNECTED | FAULTY | RESERVED"
        int vlan "Configured VLAN ID"
        string location_id FK "Specific room or lab port feeds"
    }

    STOCK_ITEM {
        string id PK "Unique stock item ID"
        string item_type "Item title (RJ45, Cat6, SFP Module)"
        string make "Brand / Vendor"
        int quantity_available "Current available inventory balance"
        int minimum_level "Re-order threshold alert limit"
        string store_location_id FK "Inventory store room reference"
    }

    STOCK_TRANSACTION {
        string id PK "Transaction record ID"
        string stock_item_id FK "References StockItem"
        int change "Positive (restock) or negative (issue)"
        string reason "Usage description or repair purpose"
        string complaint_id FK "Linked complaint ticket ID"
        string by "Technician or store manager name"
        datetime date "Timestamp"
    }
```

### Key Business Significance:
- **Hierarchical Geography**: Locations are recursive parent-child trees (`SVBH Hostel > Floor 1 > Room 102`).
- **Hardware vs. Consumable Separation**: High-value devices (`NETWORK_ASSET`) are individually serialized and repaired, whereas small parts (`STOCK_ITEM`) are tracked by inventory balance.

---

## 4. Cluster 3: AI Agentic Pipeline & Knowledge Base Schemas

Coordinates the multi-stage autonomous AI pipeline (Classification, Priority, Equipment Matching, Technician Scoring) and the RAG (Retrieval-Augmented Generation) knowledge base.

```mermaid
erDiagram
    AGENT_JOB ||--o{ AGENT_RUN : "executes sub-tasks"
    AGENT_JOB }o--|| COMPLAINT : "processes complaint"
    DOCUMENT ||--o{ DOCUMENT_CHUNK : "split into vectors"
    CHAT_SESSION ||--o{ CHAT_MESSAGE : "contains turns"

    AGENT_JOB {
        string id PK "Unique job identifier"
        string ticket_id FK "Target complaint ticket"
        string stage "FULL | CLASSIFY_ONLY | ASSIGN_ONLY"
        string status "PENDING | RUNNING | COMPLETED | FAILED"
        datetime created_at "Enqueue timestamp"
        datetime completed_at "Finish timestamp"
        string error_message "Diagnostic failure detail"
    }

    AGENT_RUN {
        string id PK "Telemetry record ID"
        string job_id FK "References AgentJob"
        string agent_name "Classification | Priority | Equipment | Assignment"
        float duration_ms "Execution latency in milliseconds"
        string status "SUCCESS | FAILED"
        json output_data "Structured AI inference results"
    }

    DOCUMENT {
        string id PK "Document ID"
        string filename "Uploaded manual or SOP name"
        string source_type "UPLOAD (PDF/DOCX) | CHAT (Promoted session)"
        string category_slug "Associated network topic category"
        string status "PENDING | INDEXED | FAILED"
        int chunk_count "Number of indexed vector chunks in ChromaDB"
    }

    CHAT_SESSION {
        string id PK "Anonymous student session ID"
        int message_count "0 to 10 limit enforcement counter"
        string detected_category "Inferred problem category"
        string status "UNASSIGNED | PROMOTED_TO_RAG"
        datetime created_at "Session initialization timestamp"
    }

    CHAT_MESSAGE {
        string role "user | assistant"
        string content "Message dialogue text"
        bool is_off_topic "Guard filter rejection flag"
        string source_doc_ids "Referenced knowledge base documents"
        datetime created_at "Turn timestamp"
    }
```

### Key Business Significance:
- **Observability**: `AGENT_RUN` tracks execution time and accuracy of every individual AI sub-agent.
- **Two-Step RAG Retrieval**: Student chat turns undergo contextual reformulation to resolve pronouns before vector similarity search against `DOCUMENT` chunks.

---

## 5. Cluster 4: Staff Roles & Technician Accountability Schemas

Governs Role-Based Access Control (RBAC), technician availability schedules, workload caps, and administrative audit logging.

```mermaid
erDiagram
    STAFF_USER ||--o| TECHNICIAN_PROFILE : "has if role is TECHNICIAN"
    STAFF_USER ||--o{ ADMIN_AUDIT_LOG : "generates admin actions"
    STAFF_USER ||--o{ COMPLAINT : "assigned to resolve"

    STAFF_USER {
        string id PK "Unique staff account ID"
        string username UK "Login username"
        string full_name "Staff display name"
        string email "Official email address"
        string role "ADMIN | MANAGER | TECHNICIAN"
        bool is_active "Account status flag"
        bool notify_on_new_complaint "Email notification preference"
    }

    TECHNICIAN_PROFILE {
        string availability "AVAILABLE | UNAVAILABLE"
        list zones "Assigned campus zones (e.g. SVBH, CC, PGH)"
        list categories "Specialized skillsets (WIFI, LAN, FIBER)"
        int max_open_complaints "Maximum concurrent capacity cap (default: 5)"
    }

    ADMIN_AUDIT_LOG {
        string id PK "Audit entry ID"
        string action "MARK_JUNK | CREATE_STAFF | UPDATE_SETTINGS"
        string actor_id FK "References StaffUser (Admin)"
        json details "Action payload metadata"
        datetime timestamp "Log timestamp"
    }
```

### Key Business Significance:
- **Technician Burnout Guard**: `max_open_complaints` ensures no technician is assigned more active tickets than their threshold.
- **Admin Audit Trail**: High-stakes operations (marking junk tickets, password resets, setting changes) are strictly logged in `ADMIN_AUDIT_LOG`.

---

## 6. Relational Cardinality Summary Table

| Relationship | Cardinality | Business Meaning |
| :--- | :---: | :--- |
| **Location ➔ Location** | `1 : N` | Recursive campus hierarchy (`Parent Hostel` ➔ `Child Rooms`). |
| **Location ➔ NetworkAsset** | `1 : N` | A single room or rack houses multiple switches, routers, and access points. |
| **NetworkAsset ➔ SwitchPort** | `1 : N` | One physical switch contains 24 or 48 ports. |
| **SwitchPort ➔ Location** | `N : 1` | Multiple switch ports provide network links to the same hostel room or lab. |
| **Complaint ➔ ComplaintHistory** | `1 : N` | A complaint collects a timeline of status updates, reassignments, and notes. |
| **Complaint ➔ StaffUser** | `N : 1` | Many complaints are assigned to one qualified technician. |
| **Complaint ➔ StockTransaction** | `1 : N` | Resolving a complaint consumes multiple stock items (e.g. 2 patch cords, 4 connectors). |
| **StockItem ➔ StockTransaction** | `1 : N` | An inventory item logs multiple issue and restock events over time. |
| **AgentJob ➔ AgentRun** | `1 : N` | An end-to-end AI evaluation runs multiple sub-agents (Classification, Priority, Routing). |
