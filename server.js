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
// Increase limit for Base64 image uploads
app.use(express.json({ limit: '50mb' }));

// --- INITIAL DATA GENERATORS ---
const generateChannels = (serverId) => [
  { id: `${serverId}-general`, name: 'general', type: 'TEXT', description: 'General chat.' },
  { id: `${serverId}-random`, name: 'random', type: 'TEXT', description: 'Off-topic.' },
];

const DEFAULT_SERVERS = [
  {
    id: 'server-gemini',
    name: 'Gemini Community',
    iconUrl: 'https://picsum.photos/seed/gemini/100/100',
    ownerId: 'system',
    channels: generateChannels('server-gemini')
  },
  {
    id: 'server-react',
    name: 'React Developers',
    iconUrl: 'https://picsum.photos/seed/react/100/100',
    ownerId: 'system',
    channels: generateChannels('server-react')
  }
];

// --- IN-MEMORY DATABASE ---
const db = {
  users: [], // { id, username, email, password, avatarUrl, friendIds: [] }
  messages: [], // { id, content, senderId, channelId, timestamp, attachments }
  servers: [...DEFAULT_SERVERS],
  // Track which users have "Open" DMs with each other
  openDms: [], // { userId, recipientId, channelId, lastInteraction }
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
    password, 
    username,
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    color: '#' + Math.floor(Math.random()*16777215).toString(16),
    friendIds: []
  };

  db.users.push(newUser);
  const { password: _, ...userSafe } = newUser;
  
  // Broadcast new user existence to everyone so member lists update immediately
  io.emit('user_registered', { ...userSafe, status: 'offline' });
  
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

// --- STATIC FILES ---
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e8 // 100 MB for socket uploads
});

const PORT = process.env.PORT || 3001;

// Track active socket connections: socketId -> userId
const socketUserMap = new Map();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join_server', (user) => {
    socketUserMap.set(socket.id, user.id);
    socket.join('global_status');
    
    // 1. Broadcast online status
    io.emit('user_status_change', { userId: user.id, status: 'online' });
    
    // 2. Send User List
    const userList = db.users.map(u => {
      const isOnline = [...socketUserMap.values()].includes(u.id);
      const { password, ...safeUser } = u;
      return { ...safeUser, status: isOnline ? 'online' : 'offline' };
    });
    socket.emit('sync_users', userList);

    // 3. Send Server List
    socket.emit('sync_servers', db.servers);

    // 4. Send Active DMs (Personalized list)
    const myDms = db.openDms.filter(d => d.userId === user.id);
    // Hydrate DM objects
    const hydratedDms = myDms.map(dm => {
      const recipient = db.users.find(u => u.id === dm.recipientId);
      return {
        id: dm.channelId,
        name: recipient ? recipient.username : 'Unknown',
        type: 'DM',
        recipientId: dm.recipientId
      };
    });
    socket.emit('sync_dms', hydratedDms);
  });

  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
    
    // Send history
    const channelMessages = db.messages
      .filter(m => m.channelId === channelId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
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
      senderId: message.senderId,
      channelId: message.channelId,
      timestamp: message.timestamp,
      attachments: message.attachments || []
    };
    db.messages.push(storedMessage);

    // DM Logic: Ensure DM exists in "Open DMs" for both parties
    if (message.channelId.includes('_') && !message.channelId.includes('server-')) {
       // It's a DM (implied by ID format for this demo)
       const participants = message.channelId.split('_');
       const u1 = participants[0];
       const u2 = participants[1];

       // Ensure U1 has it open
       if (!db.openDms.find(d => d.userId === u1 && d.recipientId === u2)) {
         db.openDms.push({ userId: u1, recipientId: u2, channelId: message.channelId });
         // Notify U1 to update sidebar
         const recipient = db.users.find(u => u.id === u2);
         const s1 = [...socketUserMap.entries()].find(([_, uid]) => uid === u1)?.[0];
         if (s1 && recipient) io.to(s1).emit('new_dm_opened', { id: message.channelId, name: recipient.username, type: 'DM', recipientId: u2 });
       }
       
       // Ensure U2 has it open
       if (!db.openDms.find(d => d.userId === u2 && d.recipientId === u1)) {
         db.openDms.push({ userId: u2, recipientId: u1, channelId: message.channelId });
         // Notify U2 to update sidebar
         const recipient = db.users.find(u => u.id === u1);
         const s2 = [...socketUserMap.entries()].find(([_, uid]) => uid === u2)?.[0];
         if (s2 && recipient) io.to(s2).emit('new_dm_opened', { id: message.channelId, name: recipient.username, type: 'DM', recipientId: u1 });
       }
    }

    // Hydrate sender for broadcast
    const sender = db.users.find(u => u.id === message.senderId);
    const hydratedMsg = { ...storedMessage, sender: sender || { username: 'Unknown' } };

    // Broadcast
    io.to(message.channelId).emit('receive_message', hydratedMsg);
  });

  socket.on('create_server', (serverData) => {
    // serverData: { name, ownerId }
    const newServer = {
      id: `server-${crypto.randomUUID()}`,
      name: serverData.name,
      iconUrl: `https://picsum.photos/seed/${serverData.name}/100/100`,
      ownerId: serverData.ownerId,
      channels: [
        { id: `c-${crypto.randomUUID()}`, name: 'general', type: 'TEXT', description: 'General chat' }
      ]
    };
    db.servers.push(newServer);
    io.emit('sync_servers', db.servers); // Update everyone's sidebar
  });

  socket.on('create_channel', ({ serverId, channelName, type }) => {
    const server = db.servers.find(s => s.id === serverId);
    if (server) {
      const newChannel = {
        id: `c-${crypto.randomUUID()}`,
        name: channelName,
        type: type || 'TEXT',
        description: 'New channel'
      };
      server.channels.push(newChannel);
      io.emit('sync_servers', db.servers); // Refresh structure for everyone
    }
  });

  socket.on('add_friend', ({ userId, friendId }) => {
     const user = db.users.find(u => u.id === userId);
     const friend = db.users.find(u => u.id === friendId);
     
     if (user && friend && !user.friendIds.includes(friendId)) {
       user.friendIds.push(friendId);
       friend.friendIds.push(userId); // Auto accept for this demo
       
       // Notify both
       const s1 = [...socketUserMap.entries()].find(([_, uid]) => uid === userId)?.[0];
       const s2 = [...socketUserMap.entries()].find(([_, uid]) => uid === friendId)?.[0];
       
       if (s1) io.to(s1).emit('friend_update', user.friendIds);
       if (s2) io.to(s2).emit('friend_update', friend.friendIds);
     }
  });

  socket.on('typing', (data) => {
    socket.to(data.channelId).emit('display_typing', data);
  });

  socket.on('disconnect', () => {
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      socketUserMap.delete(socket.id);
      const isStillOnline = [...socketUserMap.values()].includes(userId);
      if (!isStillOnline) {
        io.emit('user_status_change', { userId, status: 'offline' });
      }
    }
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});