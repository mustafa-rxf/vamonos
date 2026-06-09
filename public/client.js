console.log('🟢 Client.js yükleniyor...');

// Device ID oluştur veya al
let deviceId = localStorage.getItem('deviceId');
if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
    localStorage.setItem('deviceId', deviceId);
}
console.log('🆔 Device ID:', deviceId);

// Rastgele kullanıcı adı oluştur
const adjectives = ['Hızlı', 'Cesur', 'Kısa', 'Neşeli', 'Sakin', 'Cesur', 'Zeki', 'Mutlu', 'Akıllı'];
const nouns = ['Kedi', 'Köpek', 'Kuş', 'Balık', 'Aslan', 'Kaplan', 'Fil', 'Kurt', 'Tavşan'];
const randomName = adjectives[Math.floor(Math.random() * adjectives.length)] + 
                   nouns[Math.floor(Math.random() * nouns.length)] + 
                   Math.floor(Math.random() * 100);

let currentUsername = localStorage.getItem('username') || randomName;
localStorage.setItem('username', currentUsername);
console.log('👤 Kullanıcı adı:', currentUsername);

// Socket bağlantısı
const socket = io({
    auth: {
        deviceId: deviceId,
        username: currentUsername
    }
});

// DOM elementleri
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const userCountSpan = document.getElementById('userCount');
const statusSpan = document.getElementById('status');

// Bağlantı durumu
socket.on('connect', () => {
    console.log('✅ Socket bağlandı!');
    if (statusSpan) {
        statusSpan.textContent = '🟢 Bağlı';
        statusSpan.style.color = 'green';
    }
});

socket.on('connected', (data) => {
    console.log('📡 Bağlantı onayı:', data);
    addSystemMessage(data.message || 'Sohbete hoş geldiniz!');
    addSystemMessage(`🆔 Cihaz ID: ${data.deviceId.substring(0, 15)}...`);
});

// Bağlantı hatası
socket.on('connect_error', (error) => {
    console.error('❌ Bağlantı hatası:', error);
    if (statusSpan) {
        statusSpan.textContent = '🔴 Bağlantı hatası';
        statusSpan.style.color = 'red';
    }
});

// Ban mesajı
socket.on('banned', (data) => {
    console.log('🚫 Banlandı:', data);
    alert('❌ ' + data.message);
    document.body.innerHTML = `
        <div style="text-align:center; padding:50px; font-family:Arial;">
            <h1>🚫 BANLANDINIZ</h1>
            <p>${data.message}</p>
            <p style="color:red;">Bu cihaz sohbetten uzaklaştırıldı.</p>
            <button onclick="location.reload()">Tekrar Dene</button>
        </div>
    `;
    socket.disconnect();
});

// Hata mesajı
socket.on('error', (data) => {
    console.log('⚠️ Hata:', data);
    addSystemMessage('⚠️ ' + data.message);
});

// Normal mesaj
socket.on('chat_message', (data) => {
    console.log('💬 Mesaj geldi:', data);
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.innerHTML = `
        <strong>${escapeHtml(data.username)}:</strong> 
        <span>${escapeHtml(data.message)}</span>
        <small>${new Date(data.timestamp).toLocaleTimeString()}</small>
    `;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Sistem mesajı
socket.on('system_message', (data) => {
    console.log('📢 Sistem:', data);
    addSystemMessage(data.text);
});

// Kullanıcı listesi güncelleme
socket.on('user_list', (users) => {
    console.log('👥 Kullanıcı listesi:', users.length, 'aktif kullanıcı');
    if (userCountSpan) {
        userCountSpan.textContent = users.length;
    }
    
    // Kullanıcı listesini göster (opsiyonel)
    if (document.getElementById('userList')) {
        const userListDiv = document.getElementById('userList');
        userListDiv.innerHTML = users.map(u => `<div>${escapeHtml(u.username)}</div>`).join('');
    }
});

// Mesaj gönderme fonksiyonu
function sendMessage() {
    const message = messageInput.value.trim();
    console.log('📤 Mesaj gönderiliyor:', message);
    
    if (message === '') {
        console.log('⚠️ Boş mesaj gönderilemez');
        return;
    }
    
    socket.emit('chat_message', { message: message });
    console.log('✅ Mesaj gönderildi');
    messageInput.value = '';
    messageInput.focus();
}

// Sistem mesajı ekleme
function addSystemMessage(text) {
    const sysDiv = document.createElement('div');
    sysDiv.className = 'system-message';
    sysDiv.textContent = '📢 ' + text;
    messagesDiv.appendChild(sysDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// HTML escape
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listenerlar
if (sendButton) {
    sendButton.addEventListener('click', sendMessage);
    console.log('✅ Send button listener eklendi');
} else {
    console.error('❌ Send button bulunamadı!');
}

if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('⏎ Enter tuşuna basıldı');
            sendMessage();
        }
    });
    console.log('✅ Message input listener eklendi');
} else {
    console.error('❌ Message input bulunamadı!');
}

// Sayfa yüklendiğinde
console.log('🟢 Client.js hazır, Socket.IO versiyonu:', io.version);
