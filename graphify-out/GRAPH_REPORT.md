# Graph Report - .  (2026-04-20)

## Corpus Check
- Corpus is ~14,200 words - fits in a single context window. You may not need a graph.

## Summary
- 128 nodes · 213 edges · 20 communities detected
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Worker API + Auth Handlers|Worker API + Auth Handlers]]
- [[_COMMUNITY_ChatArea Real-time Features|ChatArea Real-time Features]]
- [[_COMMUNITY_Admin Panel + App Shell|Admin Panel + App Shell]]
- [[_COMMUNITY_ChatRoom Durable Object|ChatRoom Durable Object]]
- [[_COMMUNITY_ChatArea Utilities|ChatArea Utilities]]
- [[_COMMUNITY_AdminPanel AST Nodes|AdminPanel AST Nodes]]
- [[_COMMUNITY_FileSidebar AST Nodes|FileSidebar AST Nodes]]
- [[_COMMUNITY_Toast Notification|Toast Notification]]
- [[_COMMUNITY_App Entry Point|App Entry Point]]
- [[_COMMUNITY_Create Channel Modal|Create Channel Modal]]
- [[_COMMUNITY_File Upload Modal|File Upload Modal]]
- [[_COMMUNITY_Login Component|Login Component]]
- [[_COMMUNITY_Profile Sidebar|Profile Sidebar]]
- [[_COMMUNITY_Sidebar Navigation|Sidebar Navigation]]
- [[_COMMUNITY_Cloudflare Free Tier Rationale|Cloudflare Free Tier Rationale]]
- [[_COMMUNITY_Vite Config (AST)|Vite Config (AST)]]
- [[_COMMUNITY_React Entry (main.jsx)|React Entry (main.jsx)]]
- [[_COMMUNITY_Vite Config (semantic)|Vite Config (semantic)]]
- [[_COMMUNITY_HTML Shell|HTML Shell]]
- [[_COMMUNITY_Blink Project Docs|Blink Project Docs]]

## God Nodes (most connected - your core abstractions)
1. `fetch()` - 28 edges
2. `corsResponse()` - 27 edges
3. `getAuth()` - 18 edges
4. `ChatArea Component` - 17 edges
5. `Cloudflare Worker Main Handler` - 12 edges
6. `App Root Component` - 11 edges
7. `requireAdmin()` - 6 edges
8. `Sidebar Component` - 6 edges
9. `signJWT()` - 5 edges
10. `handleRegister()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Security: IP Whitelist Concept` --rationale_for--> `Cloudflare Worker Main Handler`  [EXTRACTED]
  README.md → worker/src/index.js
- `Admin Role-Based Access Control (OWNER/ADMIN)` --shares_data_with--> `App Root Component`  [INFERRED]
  worker/src/index.js → src/App.jsx
- `Admin User Directory with Delete Action` --references--> `Admin Role-Based Access Control (OWNER/ADMIN)`  [INFERRED]
  src/components/AdminPanel.jsx → worker/src/index.js
- `JWT Token LocalStorage Persistence` --shares_data_with--> `JWT Sign/Verify + PBKDF2 Password Hashing`  [INFERRED]
  src/components/Login.jsx → worker/src/index.js
- `Unread Count Polling (30s interval)` --calls--> `Cloudflare Worker Main Handler`  [EXTRACTED]
  src/App.jsx → worker/src/index.js

## Hyperedges (group relationships)
- **Real-time Messaging Pipeline** — chatarea_websocket_connection, worker_chatroom_durable_object, chatarea_message_item, chatarea_typing_indicator [INFERRED 0.92]
- **Authentication Flow (Email + Google OAuth + JWT)** — login_component, login_google_oauth, worker_jwt_auth, worker_google_auth_handler, login_jwt_token_storage [INFERRED 0.90]
- **Admin Access Control Pattern** — worker_admin_rbac, adminpanel_admin_panel_component, app_app_component, sidebar_component [INFERRED 0.85]

## Communities

### Community 0 - "Worker API + Auth Handlers"
Cohesion: 0.21
Nodes (30): corsResponse(), decodeJWT(), fetch(), getAuth(), handleAdmin(), handleAdminUsers(), handleChannels(), handleCreateChannel() (+22 more)

### Community 1 - "ChatArea Real-time Features"
Cohesion: 0.09
Nodes (28): Browser Push Notifications, Channel Invite Link Generation, ChatArea Component, Emoji Picker (@emoji-mart/react), Link Preview Fetcher, @Mention Autocomplete, MessageItem Sub-Component (memoized), In-Channel Message Search (+20 more)

### Community 2 - "Admin Panel + App Shell"
Cohesion: 0.12
Nodes (21): Recent Activity Log, AdminPanel Component, Admin User Directory with Delete Action, Workspace Stats (users, messages, active, files), Cloudflare Worker API Base URL, App Root Component, Theme Persistence (localStorage), Toast Notification System (+13 more)

### Community 3 - "ChatRoom Durable Object"
Cohesion: 0.2
Nodes (7): b64url(), ChatRoom, handleGoogleAuth(), handleRegister(), handleWebSocket(), hashPassword(), signJWT()

### Community 4 - "ChatArea Utilities"
Cohesion: 0.25
Nodes (0): 

### Community 5 - "AdminPanel AST Nodes"
Cohesion: 0.5
Nodes (0): 

### Community 6 - "FileSidebar AST Nodes"
Cohesion: 0.67
Nodes (0): 

### Community 7 - "Toast Notification"
Cohesion: 0.67
Nodes (0): 

### Community 8 - "App Entry Point"
Cohesion: 1.0
Nodes (0): 

### Community 9 - "Create Channel Modal"
Cohesion: 1.0
Nodes (0): 

### Community 10 - "File Upload Modal"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Login Component"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Profile Sidebar"
Cohesion: 1.0
Nodes (0): 

### Community 13 - "Sidebar Navigation"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Cloudflare Free Tier Rationale"
Cohesion: 1.0
Nodes (2): Rationale: Deploy on Cloudflare Free Tier, Tech Stack: React/Vite + Cloudflare Workers/D1/R2

### Community 15 - "Vite Config (AST)"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "React Entry (main.jsx)"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Vite Config (semantic)"
Cohesion: 1.0
Nodes (1): Vite Build Configuration

### Community 18 - "HTML Shell"
Cohesion: 1.0
Nodes (1): HTML Shell / Root Document

### Community 19 - "Blink Project Docs"
Cohesion: 1.0
Nodes (1): Blink Internal Office Hub

## Knowledge Gaps
- **19 isolated node(s):** `Vite Build Configuration`, `Theme Persistence (localStorage)`, `React App Entry Point`, `HTML Shell / Root Document`, `Blink Internal Office Hub` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `App Entry Point`** (2 nodes): `App()`, `App.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Create Channel Modal`** (2 nodes): `CreateChannelModal()`, `CreateChannelModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `File Upload Modal`** (2 nodes): `FileModal()`, `FileModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Component`** (2 nodes): `Login()`, `Login.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Profile Sidebar`** (2 nodes): `ProfileSidebar()`, `ProfileSidebar.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sidebar Navigation`** (2 nodes): `Sidebar()`, `Sidebar.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Cloudflare Free Tier Rationale`** (2 nodes): `Rationale: Deploy on Cloudflare Free Tier`, `Tech Stack: React/Vite + Cloudflare Workers/D1/R2`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config (AST)`** (1 nodes): `vite.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `React Entry (main.jsx)`** (1 nodes): `main.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config (semantic)`** (1 nodes): `Vite Build Configuration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `HTML Shell`** (1 nodes): `HTML Shell / Root Document`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Blink Project Docs`** (1 nodes): `Blink Internal Office Hub`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ChatArea Component` connect `ChatArea Real-time Features` to `Admin Panel + App Shell`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `App Root Component` connect `Admin Panel + App Shell` to `ChatArea Real-time Features`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `Cloudflare Worker Main Handler` connect `ChatArea Real-time Features` to `Admin Panel + App Shell`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **What connects `Vite Build Configuration`, `Theme Persistence (localStorage)`, `React App Entry Point` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `ChatArea Real-time Features` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Admin Panel + App Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._