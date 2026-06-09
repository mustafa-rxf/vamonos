const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ========== VERİ YAPILARI ==========
const bannedDevices = new Map();     // deviceId -> ban detayları
const bannedList = new Set();        // sadece deviceId'ler
const activeUsers = new Map();       // socketId -> user info

// ========== SOCKET.IO MIDDLEWARE (BAN KONTROLÜ) ==========
io.use((socket, next) => {
    const deviceId = socket.handshake.auth.deviceId;
    
    console.log(`🔍 Bağlantı kontrolü: ${deviceId}`);
    
    if (bannedDevices.has(deviceId) || bannedList.has(deviceId)) {
        console.log(`❌ Banlı cihaz engellendi: ${deviceId}`);
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
    
    // Çift ban kontrolü
    if (bannedDevices.has(deviceId) || bannedList.has(deviceId)) {
        socket.emit('banned', { message: 'Bu cihaz banlı!' });
        socket.disconnect();
        return;
    }
    
    // Kullanıcıyı aktif listeye ekle
    activeUsers.set(socket.id, {
        username: username,
        deviceId: deviceId,
        joinedAt: new Date().toISOString()
    });
    
    // Bağlantı bilgisini gönder
    socket.emit('connected', { 
        deviceId: deviceId,
        message: 'Sohbete hoş geldiniz!'
    });
    
    // Tüm kullanıcılara güncel liste gönder
    const userList = Array.from(activeUsers.values());
    io.emit('user_list', userList);
    io.emit('system_message', { text: `✨ ${username} sohbete katıldı!`, type: 'info' });
    
    // ===== MESAJ GÖNDERME EVENT'İ =====
    socket.on('chat_message', (data) => {
        const deviceId = socket.handshake.auth.deviceId;
        const username = socket.handshake.auth.username;
        
        console.log(`💬 Mesaj alındı: ${username}: ${data.message}`);
        
        // Boş mesaj kontrolü
        if (!data.message || data.message.trim() === '') {
            socket.emit('error', { message: 'Boş mesaj gönderemezsiniz!' });
            return;
        }
        
        // Link engelleme
        const linkPattern = /(https?:\/\/|www\.|ftp:\/\/)/i;
        if (linkPattern.test(data.message)) {
            bannedDevices.set(deviceId, { 
                reason: 'Link paylaşımı', 
                timestamp: Date.now() 
            });
            bannedList.add(deviceId);
            socket.emit('banned', { message: 'Link paylaştığınız için banlandınız!' });
            socket.disconnect();
            io.emit('system_message', { text: `⚠️ ${username} link paylaştığı için banlandı!`, type: 'alert' });
            return;
        }
        
        // Normal mesajı herkese gönder
        io.emit('chat_message', {
            username: username,
            message: data.message,
            timestamp: new Date().toISOString(),
            deviceId: deviceId
        });
    });
    
    // ===== DEVREDEN ÇIKMA =====
    socket.on('disconnect', () => {
        const user = activeUsers.get(socket.id);
        if (user) {
            console.log(`❌ Kullanıcı ayrıldı: ${user.username} (${user.deviceId})`);
            activeUsers.delete(socket.id);
            
            // Güncel kullanıcı listesini gönder
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

// Aktif kullanıcıları listele
app.get('/api/users', authenticateAdmin, (req, res) => {
    const users = Array.from(activeUsers.values());
    res.json(users);
});

// Banlı kullanıcıları listele
app.get('/api/banned', authenticateAdmin, (req, res) => {
    const banned = Array.from(bannedDevices.entries()).map(([deviceId, data]) => ({
        deviceId: deviceId,
        reason: data.reason,
        timestamp: data.timestamp
    }));
    res.json(banned);
});

// Kullanıcı banlama
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
    
    // Kullanıcının bağlantısını kes
    for (let [socketId, socket] of io.sockets.sockets) {
        if (socket.handshake.auth.deviceId === deviceId) {
            socket.emit('banned', { message: `Admin tarafından banlandınız: ${reason || 'Kural ihlali'}` });
            socket.disconnect();
        }
    }
    
    res.json({ success: true, message: 'Cihaz banlandı' });
});

// Ban kaldırma
app.post('/api/admin/unban', authenticateAdmin, (req, res) => {
    const { deviceId } = req.body;
    
    if (!deviceId) {
        return res.status(400).json({ error: 'Device ID gerekli' });
    }
    
    bannedDevices.delete(deviceId);
    bannedList.delete(deviceId);
    
    res.json({ success: true, message: 'Ban kaldırıldı' });
});

// Tüm banları temizle
app.post('/api/admin/clear-bans', authenticateAdmin, (req, res) => {
    bannedDevices.clear();
    bannedList.clear();
    res.json({ success: true, message: 'Tüm banlar temizlendi' });
});

// ========== SUNUCUYU BAŞLAT ==========
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`\n🚀 Server ${PORT} portunda çalışıyor`);
    console.log(`🔗 Chat: http://localhost:${PORT}`);
    console.log(`🔒 Admin: http://localhost:${PORT}/admin`);
    console.log(`🔐 Admin şifresi: ${ADMIN_PASSWORD}\n`);
});
