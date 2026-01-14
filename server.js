import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json()); // Enable JSON body parsing for auth

// --- IN-MEMORY DATABASE ---
// In a real app, use a database (Postgres, MongoDB).
// Data will reset if the server restarts on Render free tier.
const db = {
  users: [], // { id, username, email, password, avatarUrl }
  messages: [], // { id, content, senderId, channelId, timestamp }
  dms: [], // { id, user1Id, user2Id }
};

// --- AUTH API ---

app.post('/api/register', (req, res) => {
  const { email, password, username, avatarUrl } = req.body;

  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const newUser = {
    id: crypto.randomUUID(),
    email,
    password, // In real app: Hash this!
    username,
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
  };

  db.users.push(newUser);
  // Return user without password
  const { password: _, ...userSafe } = newUser;
  res.json(userSafe);
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const { password: _, ...userSafe } = user;
  res.json(userSafe);
});

// Serve static files from the React build directory (dist)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Track active socket connections: socketId -> userId
const socketUserMap = new Map();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // User authenticates via socket to come "online"
  socket.on('join_server', (user) => {
    socketUserMap.set(socket.id, user.id);
    socket.join('global_status'); // Room for user status updates
    
    // Broadcast status to everyone
    io.emit('user_status_change', { userId: user.id, status: 'online' });
    
    // Send full user list to the connecting user
    const userList = db.users.map(u => {
      // Check if user has ANY active socket
      const isOnline = [...socketUserMap.values()].includes(u.id);
      const { password, ...safeUser } = u;
      return { ...safeUser, status: isOnline ? 'online' : 'offline' };
    });
    
    socket.emit('sync_users', userList);
  });

  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
    
    // Send history for this channel
    const channelMessages = db.messages
      .filter(m => m.channelId === channelId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Oldest first
    
    // Hydrate messages with sender info
    const hydratedMessages = channelMessages.map(msg => {
      const sender = db.users.find(u => u.id === msg.senderId);
      const { password, ...safeSender } = sender || { username: 'Unknown', avatarUrl: '' };
      return { ...msg, sender: safeSender };
    });

    socket.emit('channel_history', { channelId, messages: hydratedMessages });
  });

  socket.on('send_message', (message) => {
    // Save to DB
    const storedMessage = {
      id: message.id,
      content: message.content,
      senderId: message.sender.id,
      channelId: message.channelId,
      timestamp: message.timestamp
    };
    db.messages.push(storedMessage);

    // Broadcast to room
    io.to(message.channelId).emit('receive_message', message);
  });

  socket.on('typing', (data) => {
    socket.to(data.channelId).emit('display_typing', data);
  });

  socket.on('disconnect', () => {
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      socketUserMap.delete(socket.id);
      // Check if user has other sockets open
      const isStillOnline = [...socketUserMap.values()].includes(userId);
      if (!isStillOnline) {
        io.emit('user_status_change', { userId, status: 'offline' });
      }
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// Catch-all handler
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});