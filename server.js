import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());

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

// Store users in memory
let connectedUsers = [];

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join_server', (user) => {
    connectedUsers = connectedUsers.filter(u => u.socketId !== socket.id);
    connectedUsers.push({ ...user, socketId: socket.id });
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
  const indexPath = path.join(distPath, 'index.html');
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("404 Not Found: The React application build (dist/index.html) was not found. Please ensure the build command 'npm run build' ran successfully.");
  }
});

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Serving static files from: ${distPath}`);
});
