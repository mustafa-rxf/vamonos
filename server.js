const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('public'));

// Random name generator
const adjectives = ['Happy', 'Cool', 'Smart', 'Quick', 'Bright', 'Swift', 'Clever', 'Bold', 'Wild', 'Calm'];
const nouns = ['Tiger', 'Eagle', 'Phoenix', 'Dragon', 'Panda', 'Dolphin', 'Wolf', 'Bear', 'Lion', 'Fox'];

function generateRandomName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
}

// Link detection regex
const linkRegex = /(https?:\/\/|www\.|ftp:\/\/)/i;

// Track IPs that shared links
const bannedIPs = new Set();

// Socket.io events
io.on('connection', (socket) => {
  const username = generateRandomName();
  const clientIP = socket.handshake.address;
  
  console.log(`User connected: ${username} (${clientIP})`);

  // Check if IP is banned
  if (bannedIPs.has(clientIP)) {
    socket.emit('banned', { message: 'Your IP has been banned for sharing links.' });
    socket.disconnect();
    return;
  }

  // Notify everyone that user joined
  socket.broadcast.emit('userJoined', {
    username,
    message: `${username} joined the chat`
  });

  // Send username to the connected user
  socket.emit('userInfo', { username });

  // Handle incoming messages
  socket.on('message', (data) => {
    const message = data.trim();

    // Check for links
    if (linkRegex.test(message)) {
      bannedIPs.add(clientIP);
      io.emit('linkDetected', {
        username,
        message: `${username} tried to share a link and was banned.`,
        banned: true
      });
      socket.emit('banned', { message: 'Links are not allowed. Your IP has been banned.' });
      socket.disconnect();
      console.log(`IP banned for sharing link: ${clientIP}`);
      return;
    }

    // Broadcast message to all users
    io.emit('message', {
      username,
      message,
      timestamp: new Date().toLocaleTimeString()
    });

    console.log(`${username}: ${message}`);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${username}`);
    socket.broadcast.emit('userLeft', {
      username,
      message: `${username} left the chat`
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Chat server running on http://localhost:${PORT}`);
});