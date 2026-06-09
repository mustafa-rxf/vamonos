const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Data storage
const users = new Map();
const bannedDevices = new Map();
const spammerTracking = new Map();
const messageHistory = new Map(); // Device ID -> Array of message timestamps
const throttledDevices = new Map(); // Device ID -> throttle end time
const chatHistory = [];
const MAX_CHAT_HISTORY = 100;

// Spam prevention settings
const SPAM_WINDOW = 10 * 60 * 1000; // 10 minutes in milliseconds
const MAX_MESSAGES_PER_WINDOW = 30; // Max messages in 10 minutes
const THROTTLE_DURATION = 10 * 60 * 1000; // 10 minutes throttle time

// Helper functions
function generateRandomName() {
  const adjectives = ['Mutlu', 'Hızlı', 'Güzel', 'Akıllı', 'Cüretkar', 'Neşeli', 'Sessiz', 'Gürültülü'];
  const nouns = ['Panda', 'Aslan', 'Kuş', 'Balık', 'Ejderha', 'Kaplan', 'Köpek', 'Kedi'];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);
  return `${adjective}${noun}${number}`;
}

function hasLink(message) {
  const linkPatterns = [
    /http:\/\//i,
    /https:\/\//i,
    /www\./i,
    /ftp:\/\//i
  ];
  return linkPatterns.some(pattern => pattern.test(message));
}

// Check if device is throttled (spam prevention)
function isDeviceThrottled(deviceId) {
  if (!throttledDevices.has(deviceId)) {
    return false;
  }
  
  const throttleEndTime = throttledDevices.get(deviceId);
  const now = Date.now();
  
  if (now > throttleEndTime) {
    // Throttle period has ended
    throttledDevices.delete(deviceId);
    messageHistory.delete(deviceId);
    return false;
  }
  
  return true;
}

// Check message frequency (spam detection)
function checkSpamFrequency(deviceId) {
  const now = Date.now();
  
  // Initialize message history for this device if not exists
  if (!messageHistory.has(deviceId)) {
    messageHistory.set(deviceId, []);
  }
  
  const messages = messageHistory.get(deviceId);
  
  // Remove messages older than SPAM_WINDOW
  while (messages.length > 0 && now - messages[0] > SPAM_WINDOW) {
    messages.shift();
  }
  
  // Check if device exceeded limit
  if (messages.length >= MAX_MESSAGES_PER_WINDOW) {
    return false; // Spam detected
  }
  
  // Add current message timestamp
  messages.push(now);
  return true; // Message is allowed
}

// Socket.io connection
io.on('connection', (socket) => {
  let userDeviceId = null;
  let userName = null;

  socket.on('join', (data) => {
    userDeviceId = data.deviceId;
    
    // Check if device is banned
    if (bannedDevices.has(userDeviceId)) {
      socket.emit('banned', { message: 'Bu cihaz banlandı!' });
      socket.disconnect();
      return;
    }
    
    userName = generateRandomName();
    users.set(socket.id, {
      name: userName,
      deviceId: userDeviceId,
      joinedAt: new Date()
    });
    
    const joinMessage = {
      type: 'system',
      message: `${userName} sohbete katıldı`,
      timestamp: new Date().toISOString(),
      usersOnline: users.size
    };
    
    chatHistory.push(joinMessage);
    if (chatHistory.length > MAX_CHAT_HISTORY) {
      chatHistory.shift();
    }
    
    io.emit('user_joined', joinMessage);
    io.emit('stats', getStats());
  });

  socket.on('message', (data) => {
    if (!userDeviceId || !userName) return;
    
    const message = data.message.trim();
    
    // Check if device is throttled (spam prevention)
    if (isDeviceThrottled(userDeviceId)) {
      socket.emit('throttled', { 
        message: 'Çok hızlı mesaj gönderiyorsunuz. Lütfen 10 dakika bekleyiniz.' 
      });
      return;
    }
    
    // Check spam frequency
    if (!checkSpamFrequency(userDeviceId)) {
      // Activate throttle
      throttledDevices.set(userDeviceId, Date.now() + THROTTLE_DURATION);
      
      const throttleMessage = {
        type: 'system',
        message: `⏱️ ${userName} spam nedeniyle 10 dakika susturuldu!`,
        timestamp: new Date().toISOString(),
        usersOnline: users.size
      };
      
      chatHistory.push(throttleMessage);
      if (chatHistory.length > MAX_CHAT_HISTORY) {
        chatHistory.shift();
      }
      
      io.emit('throttle_warning', throttleMessage);
      socket.emit('throttled', { 
        message: 'Çok hızlı mesaj gönderiyorsunuz. Cihazınız 10 dakika susturuldu.' 
      });
      return;
    }
    
    if (hasLink(message)) {
      // Track spammer
      if (!spammerTracking.has(userDeviceId)) {
        spammerTracking.set(userDeviceId, []);
      }
      spammerTracking.get(userDeviceId).push({
        timestamp: new Date().toISOString(),
        message: message.substring(0, 50)
      });
      
      // Ban the device
      bannedDevices.set(userDeviceId, {
        reason: 'Link paylaşımı',
        bannedAt: new Date().toISOString(),
        reason_details: 'İllegal link paylaşımı tespit edildi'
      });
      
      const spamMessage = {
        type: 'spam',
        message: `⚠️ ${userName} (Device: ${userDeviceId}) link paylaştığı için banlandı!`,
        timestamp: new Date().toISOString(),
        usersOnline: users.size
      };
      
      chatHistory.push(spamMessage);
      if (chatHistory.length > MAX_CHAT_HISTORY) {
        chatHistory.shift();
      }
      
      io.emit('user_banned', spamMessage);
      socket.emit('banned', { message: 'Link paylaşımı yasaktır! Cihazınız banlandı.' });
      socket.disconnect();
      io.emit('stats', getStats());
      return;
    }
    
    const chatMessage = {
      type: 'chat',
      name: userName,
      deviceId: userDeviceId,
      message: message,
      timestamp: new Date().toISOString(),
      usersOnline: users.size
    };
    
    chatHistory.push(chatMessage);
    if (chatHistory.length > MAX_CHAT_HISTORY) {
      chatHistory.shift();
    }
    
    io.emit('message', chatMessage);
  });

  socket.on('disconnect', () => {
    if (users.has(socket.id)) {
      const user = users.get(socket.id);
      users.delete(socket.id);
      
      const leaveMessage = {
        type: 'system',
        message: `${user.name} sohbeti terk etti`,
        timestamp: new Date().toISOString(),
        usersOnline: users.size
      };
      
      chatHistory.push(leaveMessage);
      if (chatHistory.length > MAX_CHAT_HISTORY) {
        chatHistory.shift();
      }
      
      io.emit('user_left', leaveMessage);
      io.emit('stats', getStats());
    }
  });
});

// Helper function for stats
function getStats() {
  return {
    usersOnline: users.size,
    bannedDevices: bannedDevices.size,
    spammersTracked: spammerTracking.size,
    throttledDevices: throttledDevices.size
  };
}

// Admin page route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Admin API routes
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Yanlış şifre' });
  }
});

app.get('/api/admin/stats', (req, res) => {
  res.json({
    usersOnline: users.size,
    bannedDevices: bannedDevices.size,
    spammersTracked: spammerTracking.size,
    throttledDevices: throttledDevices.size,
    totalMessages: chatHistory.length
  });
});

app.get('/api/admin/users', (req, res) => {
  const userList = Array.from(users.values()).map(user => ({
    name: user.name,
    deviceId: user.deviceId,
    joinedAt: user.joinedAt
  }));
  res.json(userList);
});

app.get('/api/admin/banned-devices', (req, res) => {
  const banned = Array.from(bannedDevices.entries()).map(([deviceId, data]) => ({
    deviceId,
    reason: data.reason,
    bannedAt: data.bannedAt
  }));
  res.json(banned);
});

app.get('/api/admin/throttled-devices', (req, res) => {
  const throttled = Array.from(throttledDevices.entries()).map(([deviceId, endTime]) => ({
    deviceId,
    throttledAt: new Date(Date.now() - (THROTTLE_DURATION - (endTime - Date.now()))).toISOString(),
    endsAt: new Date(endTime).toISOString(),
    remainingTime: Math.max(0, endTime - Date.now())
  }));
  res.json(throttled);
});

app.post('/api/admin/unban-device', (req, res) => {
  const { deviceId } = req.body;
  if (bannedDevices.has(deviceId)) {
    bannedDevices.delete(deviceId);
    io.emit('stats', getStats());
    res.json({ success: true, message: 'Cihaz banı kaldırıldı' });
  } else {
    res.status(404).json({ success: false, message: 'Cihaz bulunamadı' });
  }
});

app.post('/api/admin/unthrottle-device', (req, res) => {
  const { deviceId } = req.body;
  if (throttledDevices.has(deviceId)) {
    throttledDevices.delete(deviceId);
    messageHistory.delete(deviceId);
    io.emit('stats', getStats());
    res.json({ success: true, message: 'Cihaz susturması kaldırıldı' });
  } else {
    res.status(404).json({ success: false, message: 'Cihaz bulunamadı' });
  }
});

app.post('/api/admin/clear-bans', (req, res) => {
  bannedDevices.clear();
  io.emit('stats', getStats());
  res.json({ success: true, message: 'Tüm banlar kaldırıldı' });
});

app.get('/api/admin/spammers', (req, res) => {
  const spammers = Array.from(spammerTracking.entries()).map(([deviceId, records]) => ({
    deviceId,
    spamCount: records.length,
    records
  }));
  res.json(spammers);
});

app.get('/api/admin/chat-history', (req, res) => {
  res.json(chatHistory);
});

server.listen(PORT, () => {
  console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`);
  console.log(`Admin paneli: http://localhost:${PORT}/admin`);
});
