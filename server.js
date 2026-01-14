import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

// Serve static files from the React build directory (dist)
// We assume 'dist' is in the same directory as server.js
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

// Store users in memory
let connectedUsers = [];

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_server', (user) => {
    // Remove any existing entry for this socket ID
    connectedUsers = connectedUsers.filter(u => u.socketId !== socket.id);
    // Add new user
    connectedUsers.push({ ...user, socketId: socket.id });
    // Broadcast updated list
    io.emit('user_list_update', connectedUsers);
  });

  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
  });

  socket.on('send_message', (message) => {
    io.to(message.channelId).emit('receive_message', message);
  });

  socket.on('typing', (data) => {
    socket.to(data.channelId).emit('display_typing', data);
  });

  socket.on('disconnect', () => {
    connectedUsers = connectedUsers.filter(u => u.socketId !== socket.id);
    io.emit('user_list_update', connectedUsers);
    console.log(`User disconnected: ${socket.id}`);
  });
});

// All other GET requests not handled before will return the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      console.error("Error sending index.html:", err);
      res.status(500).send("Server Error: Could not serve index.html. Did the build finish successfully?");
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
