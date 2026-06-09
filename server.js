const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ========== VERİ YAPILARI ==========
const bannedDevices = new Map();     // deviceId -> ban detayları
const bannedList = new Set();        // sadece deviceId'ler
const spamTracker = new Map();       // deviceId -> spam istatistikleri
const activeUsers = new Map();       // socketId -> user info

// ========== SPAM AYARLARI ==========
const SPAM_LIMITS = {
    MESSAGE_LIMIT: 5,        // 5 mesaj
    TIME_WINDOW: 10,          // 10 saniye
    AUTO_BAN_AFTER: 3         // 3 uyarı sonra ban
};

// ========== SPAM KONTROL FONKSİYONU ==========
function checkSpam(deviceId, username) {
    const now = Date.now() / 1000;
    
    if (!spamTracker.has(deviceId)) {
        spamTracker.set(deviceId, {
            messages: [],
            warnings: 0,
            lastWarnTime: 0
        });
    }
    
    const userSpam = spamTracker.get(deviceId);
    
    // 10 saniyeden eski mesajları temizle
    userSpam.messages = userSpam.messages.filter(time => (now - time) < SPAM_LIMITS.TIME_WINDOW);
    
    // Yeni mesaj zamanını ekle
    userSpam.messages.push(now);
    
    // Spam kontrolü
    if (userSpam.messages.length > SPAM_LIMITS.MESSAGE_LIMIT) {
        userSpam.warnings++;
        
        if (userSpam.warnings >= SPAM_LIMITS.AUTO_BAN_AFTER) {
            // OTOMATİK BAN
            bannedDevices.set(deviceId, { 
                reason: 'Aşırı spam (otomatik ban)',
                timestamp: now,
                warnings: userSpam.warnings
            });
            bannedList.add(deviceId);
            
            // Tüm bağlantıları kes
            for (let [socketId, socket] of io.sockets.sockets) {
                if (socket.handshake.auth.deviceId === deviceId) {
                    socket.emit('banned', { message: 'Spam nedeniyle otomatik banlandınız!' });
                    socket.disconnect();
                }
            }
            
            // Admin'e bildir
            io.emit('system_message', { 
                text: `⚠️ Sistem: ${username || deviceId} spam nedeniyle otomatik banlandı!`, 
                type: 'alert' 
            });
            
            return { isSpam: true, autoBanned: true };
        } else {
            // UYARI GÖNDER
            const remainingWarnings = SPAM_LIMITS.AUTO_BAN_AFTER - userSpam.warnings;
            
            // Uyarıyı sadece bu cihaza gönder
            for (let [socketId, socket] of io.sockets.sockets) {
                if (socket.handshake.auth.deviceId === deviceId) {
                    socket.emit('spam_warning', { 
                        warning: userSpam.warnings,
                        message: `⚠️ Spam yapmayın! ${remainingWarnings} uyarı sonra banlanacaksınız.`
                    });
                }
            }
            
            return { isSpam: true, autoBanned: false, warnings: userSpam.warnings };
        }
    }
    
    return { isSpam: false };
}

// ========== BAN MIDDLEWARE (SOCKET.IO) ==========
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
        joinedAt: Date.now()
    });
    
    console.log(`✅ Kullanıcı bağlandı: ${username} (${deviceId})`);
    
    // Bağlantı bilgisini client'a gönder
    socket.emit('connected', { deviceId: deviceId });
    
    // Kullanıcı listesini güncelle
    io.emit('user_list', Array.from(activeUsers.values()));
    
    // ===== MESAJ GÖNDERME EVENT'İ (SPAM KONTROLLÜ) =====
    socket.on('chat_message', (data) => {
        const deviceId = socket.handshake.auth.deviceId;
        const username = socket.handshake.auth.username;
        
        // Spam kontrolü
        const spamCheck = checkSpam(deviceId, username);
        if (spamCheck.isSpam) {
            return; // Spam ise mesaj gönderme
        }
        
        // Link engelleme
        const linkPattern = /(https?:\/\/|www\.|ftp:\/\/)/i;
        if (linkPattern.test(data.message)) {
            // Link paylaşımı = anında ban
            bannedDevices.set(deviceId, { reason: 'Link paylaşımı', timestamp: Date.now() });
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
        activeUsers.delete(socket.id);
        io.emit('user_list', Array.from(activeUsers.values()));
        console.log(`❌ Kullanıcı ayrıldı: ${username} (${deviceId})`);
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

// Aktif kullanıcıları listele (device ID ile)
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

// Kullanıcı banlama (admin panelinden)
app.post('/api/admin/ban', authenticateAdmin, (req, res) => {
    const { deviceId, reason } = req.body;
    
    if (!deviceId) {
        return res.status(400).json({ error: 'Device ID gerekli' });
    }
    
    // Banla
    bannedDevices.set(deviceId, { 
        reason: reason || 'Admin tarafından banlandı', 
        timestamp: Date.now(),
        bannedBy: 'admin'
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
    console.log(`🚀 Server ${PORT} portunda çalışıyor`);
    console.log(`🔒 Admin şifresi: ${ADMIN_PASSWORD === 'admin123' ? '⚠️ VARSAYILAN (admin123) - DEĞİŞTİR!' : '✅ Güvenli'}`);
});
