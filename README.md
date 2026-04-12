# Blink | Internal Office Hub

Blink is a high-performance, internal office chat application built for real-time collaboration. It is designed to be deployed on the **Cloudflare Free Tier**.

## 🚀 Key Features
- **Real-time Messaging**: Instant communication via Cloudflare Durable Objects.
- **Office Security**: Pre-configured login shell with office-network restriction placeholders.
- **Admin Dashboard**: Comprehensive management of users, metrics, and system health.
- **File Sharing**: Drag-and-drop support for office documents and images.

## 🛠 Tech Stack
- **Frontend**: React (Vite) + Vanilla CSS
- **Backend**: Cloudflare Workers (API) + Durable Objects (WebSockets)
- **Database**: Cloudflare D1 (SQL)
- **Storage**: Cloudflare R2

## 📦 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Initialize Database**:
   Create your D1 database and apply the schema:
   ```bash
   npx wrangler d1 create blink-db
   npx wrangler d1 execute blink-db --file=./schema.sql
   ```

3. **Develop Locally**:
   ```bash
   npm run dev
   ```

4. **Deploy**:
   ```bash
   npx wrangler deploy
   ```

## 🔒 Security Note
Access is conceptually restricted to office IP ranges. To enforce this, update the IP whitelist in `worker/src/index.js`.
