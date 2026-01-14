import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow connections from Vite dev server
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;

// Store users and basic history in memory (reset on restart)
let connectedUsers = [];

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_server', (user) => {
    connectedUsers.push({ ...user, socketId: socket.id });
    io.emit('user_list_update', connectedUsers);
  });

  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
    console.log(`User ${socket.id} joined channel: ${channelId}`);
  });

  socket.on('send_message', (message) => {
    // Broadcast message to everyone in the channel
    io.to(message.channelId).emit('receive_message', message);
  });

  socket.on('typing', (data) => {
    socket.to(data.channelId).emit('display_typing', data);
  });

  socket.on('disconnect', () => {
    connectedUsers = connectedUsers.filter(u => u.socketId !== socket.id);
    io.emit('user_list_update', connectedUsers);
    console.log('User disconnected');
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
