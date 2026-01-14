import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- IN-MEMORY DATABASE ---
// No default servers. Clean slate.
const db = {
  users: [], 
  messages: [], 
  servers: [],
  friendRequests: [], // { id, fromUserId, toUserId, status }
  openDms: [], 
};

// --- HELPER ---
const hasPermission = (server, userId, permission) => {
  if (server.ownerId === userId) return true;
  const userRoleIds = server.userRoles?.[userId] || [];
  const userRoles = server.roles.filter(r => userRoleIds.includes(r.id));
  return userRoles.some(r => r.permissions.includes('ADMIN') || r.permissions.includes(permission));
};

// --- AUTH API ---
app.post('/api/register', (req, res) => {
  const { email, password, username, avatarUrl } = req.body;
  if (db.users.find(u => u.email === email)) return res.status(400).json({ error: 'User already exists' });

  const newUser = {
    id: crypto.randomUUID(),
    email,
    password, 
    username,
    avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    bannerUrl: '',
    bio: 'Just another Discordia user.',
    friendIds: [],
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
  };

  db.users.push(newUser);
  const { password: _, ...userSafe } = newUser;
  io.emit('user_registered', { ...userSafe, status: 'offline' });
  res.json(userSafe);
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const { password: _, ...userSafe } = user;
  res.json(userSafe);
});

// --- SERVER & INVITE API ---
app.get('/invite/:code', (req, res) => {
    // This is just to handle the direct URL load in browser, the App.tsx handles the logic
    res.sendFile(path.join(distPath, 'index.html'));
});

// --- SOCKETS ---
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e8 
});

const PORT = process.env.PORT || 3001;
const socketUserMap = new Map();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join_server', (user) => {
    socketUserMap.set(socket.id, user.id);
    socket.join('global_status');
    io.emit('user_status_change', { userId: user.id, status: 'online' });

    // Sync Users
    const userList = db.users.map(u => {
      const isOnline = [...socketUserMap.values()].includes(u.id);
      const { password, ...safeUser } = u;
      return { ...safeUser, status: isOnline ? 'online' : 'offline' };
    });
    socket.emit('sync_users', userList);

    // Sync Servers (Only ones the user is a member of)
    const myServers = db.servers.filter(s => s.memberIds.includes(user.id));
    socket.emit('sync_servers', myServers);

    // Sync DMs
    const myDms = db.openDms.filter(d => d.userId === user.id);
    const hydratedDms = myDms.map(dm => {
      const recipient = db.users.find(u => u.id === dm.recipientId);
      return {
        id: dm.channelId, name: recipient ? recipient.username : 'Unknown', type: 'DM', recipientId: dm.recipientId
      };
    });
    socket.emit('sync_dms', hydratedDms);

    // Sync Friend Requests
    const myRequests = db.friendRequests.filter(r => r.toUserId === user.id && r.status === 'pending');
    socket.emit('sync_friend_requests', myRequests);
  });

  // --- SERVER MANAGEMENT ---

  socket.on('create_server', ({ name, ownerId, iconUrl }) => {
    const newServer = {
      id: `server-${crypto.randomUUID()}`,
      name,
      iconUrl: iconUrl || `https://picsum.photos/seed/${name}/100/100`,
      ownerId,
      memberIds: [ownerId],
      channels: [
        { id: `c-${crypto.randomUUID()}`, name: 'general', type: 'TEXT', description: 'General chat' }
      ],
      roles: [
          { id: 'role-admin', name: 'Admin', color: '#E74C3C', permissions: ['ADMIN'] }
      ],
      userRoles: { [ownerId]: ['role-admin'] },
      invites: [],
      boostLevel: 0
    };
    db.servers.push(newServer);
    // Only send to creator
    socket.emit('server_joined', newServer);
  });

  socket.on('update_server_settings', ({ serverId, userId, updates }) => {
     const server = db.servers.find(s => s.id === serverId);
     if (!server) return;

     if (hasPermission(server, userId, 'MANAGE_SERVER')) {
         if (updates.name) server.name = updates.name;
         if (updates.iconUrl) server.iconUrl = updates.iconUrl;
         
         // Broadcast update to all members of this server
         server.memberIds.forEach(mid => {
             const sId = [...socketUserMap.entries()].find(([_, uid]) => uid === mid)?.[0];
             if (sId) io.to(sId).emit('server_updated', server);
         });
     }
  });

  socket.on('create_role', ({ serverId, userId, role }) => {
      const server = db.servers.find(s => s.id === serverId);
      if (server && hasPermission(server, userId, 'MANAGE_SERVER')) {
          server.roles.push({ ...role, id: crypto.randomUUID() });
          // Broadcast
          server.memberIds.forEach(mid => {
             const sId = [...socketUserMap.entries()].find(([_, uid]) => uid === mid)?.[0];
             if (sId) io.to(sId).emit('server_updated', server);
         });
      }
  });

  socket.on('generate_invite', ({ serverId, userId }) => {
      const server = db.servers.find(s => s.id === serverId);
      if (server) {
          // Anyone can invite for now, or check perms
          const code = Math.random().toString(36).substring(2, 7);
          const invite = { code, serverId, creatorId: userId, uses: 0 };
          server.invites.push(invite);
          socket.emit('invite_generated', invite);
      }
  });

  socket.on('join_via_invite', ({ code, userId }) => {
      const server = db.servers.find(s => s.invites.some(inv => inv.code === code));
      if (server) {
          if (!server.memberIds.includes(userId)) {
              server.memberIds.push(userId);
              const invite = server.invites.find(i => i.code === code);
              if (invite) invite.uses++;
              
              socket.emit('server_joined', server);
          } else {
              socket.emit('error', 'You are already in this server.');
          }
      } else {
          socket.emit('error', 'Invalid Invite Code');
      }
  });

  // --- USER PROFILE ---

  socket.on('update_profile', ({ userId, updates }) => {
      const user = db.users.find(u => u.id === userId);
      if (user) {
          if (updates.username) user.username = updates.username;
          if (updates.avatarUrl) user.avatarUrl = updates.avatarUrl;
          if (updates.bannerUrl) user.bannerUrl = updates.bannerUrl;
          if (updates.bio) user.bio = updates.bio;

          // Broadcast to everyone
          const { password, ...safeUser } = user;
          // Determine status
          const isOnline = [...socketUserMap.values()].includes(userId);
          io.emit('user_updated', { ...safeUser, status: isOnline ? 'online' : 'offline' });
      }
  });

  // --- FRIENDS ---

  socket.on('send_friend_request', ({ fromUserId, toUserId }) => {
      if (fromUserId === toUserId) return;
      const existing = db.friendRequests.find(r => 
        (r.fromUserId === fromUserId && r.toUserId === toUserId) ||
        (r.fromUserId === toUserId && r.toUserId === fromUserId)
      );
      
      const alreadyFriends = db.users.find(u => u.id === fromUserId)?.friendIds.includes(toUserId);

      if (!existing && !alreadyFriends) {
          const request = { id: crypto.randomUUID(), fromUserId, toUserId, status: 'pending' };
          db.friendRequests.push(request);
          
          const recipientSocket = [...socketUserMap.entries()].find(([_, uid]) => uid === toUserId)?.[0];
          if (recipientSocket) io.to(recipientSocket).emit('new_friend_request', request);
      }
  });

  socket.on('accept_friend_request', ({ requestId, userId }) => {
      const req = db.friendRequests.find(r => r.id === requestId && r.toUserId === userId);
      if (req) {
          req.status = 'accepted';
          const u1 = db.users.find(u => u.id === req.fromUserId);
          const u2 = db.users.find(u => u.id === req.toUserId);
          
          if (u1 && u2) {
              if(!u1.friendIds.includes(u2.id)) u1.friendIds.push(u2.id);
              if(!u2.friendIds.includes(u1.id)) u2.friendIds.push(u1.id);
              
              // Notify both
              const s1 = [...socketUserMap.entries()].find(([_, uid]) => uid === u1.id)?.[0];
              const s2 = [...socketUserMap.entries()].find(([_, uid]) => uid === u2.id)?.[0];
              
              if (s1) io.to(s1).emit('friend_list_updated', u1.friendIds);
              if (s2) io.to(s2).emit('friend_list_updated', u2.friendIds);
          }
      }
  });

  // --- STANDARD MESSAGING ---

  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
    const channelMessages = db.messages
      .filter(m => m.channelId === channelId)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const hydratedMessages = channelMessages.map(msg => {
      const sender = db.users.find(u => u.id === msg.senderId);
      const { password, ...safeSender } = sender || { username: 'Unknown' };
      return { ...msg, sender: safeSender };
    });
    socket.emit('channel_history', { channelId, messages: hydratedMessages });
  });

  socket.on('send_message', (message) => {
    const storedMessage = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      channelId: message.channelId,
      timestamp: message.timestamp,
      attachments: message.attachments || []
    };
    db.messages.push(storedMessage);

    // DM Logic
    if (message.channelId.includes('_') && !message.channelId.includes('server-')) {
       const participants = message.channelId.split('_');
       const u1 = participants[0]; const u2 = participants[1];

       [u1, u2].forEach(uid => {
           if (!db.openDms.find(d => d.userId === uid && d.recipientId === (uid === u1 ? u2 : u1))) {
               db.openDms.push({ userId: uid, recipientId: (uid === u1 ? u2 : u1), channelId: message.channelId });
               const s = [...socketUserMap.entries()].find(([_, u]) => u === uid)?.[0];
               const recipient = db.users.find(u => u.id === (uid === u1 ? u2 : u1));
               if (s && recipient) io.to(s).emit('new_dm_opened', { 
                   id: message.channelId, name: recipient.username, type: 'DM', recipientId: recipient.id 
               });
           }
       });
    }

    const sender = db.users.find(u => u.id === message.senderId);
    const hydratedMsg = { ...storedMessage, sender: sender || { username: 'Unknown' } };
    io.to(message.channelId).emit('receive_message', hydratedMsg);
  });

  socket.on('create_channel', ({ serverId, channelName, type }) => {
    const server = db.servers.find(s => s.id === serverId);
    if (server) {
      server.channels.push({
        id: `c-${crypto.randomUUID()}`, name: channelName, type: type || 'TEXT', description: 'New channel'
      });
      // Update all members
      server.memberIds.forEach(mid => {
         const sId = [...socketUserMap.entries()].find(([_, uid]) => uid === mid)?.[0];
         if (sId) io.to(sId).emit('server_updated', server);
      });
    }
  });

  socket.on('typing', (data) => socket.to(data.channelId).emit('display_typing', data));

  socket.on('disconnect', () => {
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      socketUserMap.delete(socket.id);
      const isStillOnline = [...socketUserMap.values()].includes(userId);
      if (!isStillOnline) io.emit('user_status_change', { userId, status: 'offline' });
    }
  });
});

app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

httpServer.listen(PORT, () => console.log(`Server is running on port ${PORT}`));