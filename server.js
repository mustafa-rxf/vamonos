const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// RENDER İÇİN ÖNEMLİ: CORS ve WebSocket ayarları
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    // Render için önemli ayarlar
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ========== VERİ YAPILARI ==========
const bannedDevices = new Map();
const bannedList = new Set();
const activeUsers = new Map();

// ========== SOCKET.IO MIDDLEWARE ==========
io.use((socket, next) => {
    const deviceId = socket.handshake.auth.deviceId;
    
    if (bannedDevices.has(deviceId) || bannedList.has(deviceId)) {
        const error = new Error("Bu cihaz banlanmış!");
        error.data = { reason: "banned" };
        return next(error);
    }
    next();
});

// ========== SOCKET.IO CONNECTION ==========
io.on('connection', (socket) => {
    const deviceId = socket.handshake.auth.deviceId;
    const username = socket.handshake.auth.username || 'İsimsiz';
    
    console.log(`✅ Kullanıcı bağlandı: ${username} (${deviceId})`);
    
    if (bannedDevices.has(deviceId) || bannedList.has(deviceId)) {
        socket.emit('banned', { message: 'Bu cihaz banlı!' });
        socket.disconnect();
        return;
    }
    
    activeUsers.set(socket.id, {
        username: username,
        deviceId: deviceId,
        joinedAt: new Date().toISOString()
    });
    
    socket.emit('connected', { 
        deviceId: deviceId,
        message: 'Sohbete hoş geldiniz!'
    });
    
    const userList = Array.from(activeUsers.values());
    io.emit('user_list', userList);
    io.emit('system_message', { text: `✨ ${username} sohbete katıldı!`, type: 'info' });
    
    // ===== MESAJ GÖNDERME =====
    socket.on('chat_message', (data) => {
        const deviceId = socket.handshake.auth.deviceId;
        const username = socket.handshake.auth.username;
        
        if (!data.message || data.message.trim() === '') {
            socket.emit('error', { message: 'Boş mesaj gönderemezsiniz!' });
            return;
        }
        
        // Link engelleme
        const linkPattern = /(https?:\/\/|www\.|ftp:\/\/)/i;
        if (linkPattern.test(data.message)) {
            bannedDevices.set(deviceId, { reason: 'Link paylaşımı', timestamp: Date.now() });
            bannedList.add(deviceId);
            socket.emit('banned', { message: 'Link paylaştığınız için banlandınız!' });
            socket.disconnect();
            io.emit('system_message', { text: `⚠️ ${username} link paylaştığı için banlandı!`, type: 'alert' });
            return;
        }
        
        io.emit('chat_message', {
            username: username,
            message: data.message,
            timestamp: new Date().toISOString(),
            deviceId: deviceId
        });
    });
    
    socket.on('disconnect', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
            activeUsers.delete(socket.id);
            const userList = Array.from(activeUsers.values());
            io.emit('user_list', userList);
            io.emit('system_message', { text: `👋 ${user.username} sohbetten ayrıldı.`, type: 'info' });
        }
    });
});

// ========== ADMIN AUTH ==========
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

function authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Yetkisiz' });
    }
    const token = authHeader.split(' ')[1];
    if (token !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Geçersiz şifre' });
    }
    next();
}

// ========== API ROUTES ==========
app.get('/api/users', authenticateAdmin, (req, res) => {
    const users = Array.from(activeUsers.values());
    res.json(users);
});

app.get('/api/banned', authenticateAdmin, (req, res) => {
    const banned = Array.from(bannedDevices.entries()).map(([deviceId, data]) => ({
        deviceId: deviceId,
        reason: data.reason,
        timestamp: data.timestamp
    }));
    res.json(banned);
});

app.post('/api/admin/ban', authenticateAdmin, (req, res) => {
    const { deviceId, reason } = req.body;
    
    if (!deviceId) {
        return res.status(400).json({ error: 'Device ID gerekli' });
    }
    
    bannedDevices.set(deviceId, { 
        reason: reason || 'Admin tarafından banlandı', 
        timestamp: Date.now()
    });
    bannedList.add(deviceId);
    
    for (let [socketId, socket] of io.sockets.sockets) {
        if (socket.handshake.auth.deviceId === deviceId) {
            socket.emit('banned', { message: `Admin tarafından banlandınız: ${reason || 'Kural ihlali'}` });
            socket.disconnect();
        }
    }
    
    res.json({ success: true, message: 'Cihaz banlandı' });
});

app.post('/api/admin/unban', authenticateAdmin, (req, res) => {
    const { deviceId } = req.body;
    
    if (!deviceId) {
        return res.status(400).json({ error: 'Device ID gerekli' });
    }
    
    bannedDevices.delete(deviceId);
    bannedList.delete(deviceId);
    
    res.json({ success: true, message: 'Ban kaldırıldı' });
});

app.post('/api/admin/clear-bans', authenticateAdmin, (req, res) => {
    bannedDevices.clear();
    bannedList.clear();
    res.json({ success: true, message: 'Tüm banlar temizlendi' });
});

// Ana sayfa
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ========== SUNUCUYU BAŞLAT ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server ${PORT} portunda çalışıyor`);
    console.log(`🔗 Chat: https://your-app.onrender.com`);
    console.log(`🔒 Admin: https://your-app.onrender.com/admin`);
});
