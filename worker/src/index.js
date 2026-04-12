/**
 * Blink Backend - Cloudflare Worker + Durable Objects
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Authentication Check (Simple placeholder for now)
    // In a real app, verify JWT or Session here

    // 2. Routing
    if (url.pathname.startsWith('/api/ws')) {
      // WebSocket Upgrade
      return handleWebSocket(request, env);
    }

    if (url.pathname.startsWith('/api/messages')) {
      return handleMessages(request, env);
    }

    if (url.pathname.startsWith('/api/user')) {
      return handleUser(request, env);
    }

    if (url.pathname.startsWith('/api/admin')) {
        return handleAdmin(request, env);
    }

    return new Response("Blink API", { status: 200 });
  }
};

/**
 * Handle WebSocket connections by passing them to the Durable Object
 */
async function handleWebSocket(request, env) {
  const upgradeHeader = request.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  const url = new URL(request.url);
  const roomId = url.searchParams.get('room') || 'general';
  
  // Get Durable Object ID
  const id = env.CHAT_ROOM.idFromName(roomId);
  const room = env.CHAT_ROOM.get(id);

  // Pass the request to the Durable Object
  return room.fetch(request);
}

async function handleMessages(request, env) {
    // Fetch message history from D1
    const { pathname } = new URL(request.url);
    const channelId = pathname.split('/').pop() || 'general';
    
    const { results } = await env.DB.prepare(
        "SELECT m.*, u.full_name, u.avatar_url FROM messages m JOIN users u ON m.user_id = u.id WHERE m.channel_id = ? ORDER BY m.timestamp ASC LIMIT 100"
    ).bind(channelId).all();

    return Response.json(results);
}

async function handleUser(request, env) {
    // Basic user info/auth Logic
    return Response.json({ success: true, message: "User API" });
}

async function handleAdmin(request, env) {
    // Admin stats
    const totalUsers = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first('count');
    const totalMessages = await env.DB.prepare("SELECT COUNT(*) as count FROM messages").first('count');
    
    return Response.json({
        stats: {
            totalUsers,
            totalMessages,
            activeToday: 42, // Mocked
            filesUploaded: 12 // Mocked
        }
    });
}

/**
 * Durable Object: ChatRoom
 * Handles real-time message broadcasting and WebSocket coordination.
 */
export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = []; // Keep track of active sessions
  }

  async fetch(request) {
    // Handle WebSocket upgrade
    const [client, server] = Object.values(new WebSocketPair());

    await this.handleSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async handleSession(webSocket) {
    webSocket.accept();
    
    const session = { webSocket, channelId: null };
    this.sessions.push(session);

    webSocket.addEventListener('message', async (msg) => {
      try {
        const data = JSON.parse(msg.data);
        
        if (data.type === 'join') {
            session.channelId = data.channelId;
        }

        if (data.type === 'message') {
            // 1. Persist to D1
            const messageId = crypto.randomUUID();
            await this.env.DB.prepare(
                "INSERT INTO messages (id, channel_id, user_id, content, type) VALUES (?, ?, ?, ?, ?)"
            ).bind(messageId, data.channelId, data.userId, data.content, 'TEXT').run();

            // 2. Broadcast to all users in this channel
            this.broadcast({
                type: 'new_message',
                message: {
                    id: messageId,
                    channel_id: data.channelId,
                    user_id: data.userId,
                    content: data.content,
                    full_name: data.userName,
                    timestamp: new Date().toISOString()
                }
            }, data.channelId);
        }
      } catch (e) {
        console.error("WS Error:", e);
      }
    });

    webSocket.addEventListener('close', () => {
      this.sessions = this.sessions.filter(s => s !== session);
    });
  }

  broadcast(message, channelId) {
    const data = JSON.stringify(message);
    this.sessions.forEach(session => {
        if (session.channelId === channelId) {
            try {
                session.webSocket.send(data);
            } catch (e) {
                // Remove broken sessions
                this.sessions = this.sessions.filter(s => s !== session);
            }
        }
    });
  }
}
