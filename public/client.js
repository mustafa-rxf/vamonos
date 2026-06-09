console.log('🟢 Client.js yükleniyor...');

// RENDER İÇİN: Doğru socket URL'sini bul
const socketUrl = window.location.origin;
console.log('🌐 Socket URL:', socketUrl);

// Device ID
let deviceId = localStorage.getItem('deviceId');
if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
    localStorage.setItem('deviceId', deviceId);
}
console.log('🆔 Device ID:', deviceId);

// Kullanıcı adı
const adjectives = ['Hızlı', 'Uzun', 'Kısa', 'Neşeli', 'Sakin', 'Cesur', 'Zeki', 'Mutlu', 'Akıllı'];
const nouns = ['Kedi', 'Köpek', 'Kuş', 'Balık', 'Aslan', 'Kaplan', 'Fil', 'Kurt', 'Tavşan'];
const randomName = adjectives[Math.floor(Math.random() * adjectives.length)] + 
                   nouns[Math.floor(Math.random() * nouns.length)] + 
                   Math.floor(Math.random() * 100);

let currentUsername = localStorage.getItem('username') || randomName;
localStorage.setItem('username', currentUsername);
console.log('👤 Kullanıcı adı:', currentUsername);

// RENDER İÇİN: Socket.IO bağlantısı (tüm transportlar denenecek)
const socket = io(socketUrl, {
    auth: {
        deviceId: deviceId,
        username: currentUsername
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
});

// DOM elementleri
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const userCountSpan = document.getElementById('userCount');
const statusSpan = document.getElementById('status');

// Bağlantı durumu
socket.on('connect', () => {
    console.log('✅ Socket bağlandı! Socket ID:', socket.id);
    if (statusSpan) {
        statusSpan.textContent = '🟢 Bağlı';
        statusSpan.style.color = 'green';
    }
    addSystemMessage('✅ Sohbete bağlandınız!');
});

socket.on('disconnect', () => {
    console.log('❌ Socket bağlantısı kesildi');
    if (statusSpan) {
        statusSpan.textContent = '🔴 Bağlantı kesildi';
        statusSpan.style.color = 'red';
    }
});

socket.on('connect_error', (error) => {
    console.error('❌ Bağlantı hatası:', error);
    if (statusSpan) {
        statusSpan.textContent = '🔴 Bağlanıyor...';
        statusSpan.style.color = 'orange';
    }
});

socket.on('connected', (data) => {
    console.log('📡 Bağlantı onayı:', data);
    addSystemMessage(data.message || 'Sohbete hoş geldiniz!');
});

socket.on('banned', (data) => {
    console.log('🚫 Banlandı:', data);
    alert('❌ ' + data.message);
    document.body.innerHTML = `
        <div style="text-align:center; padding:50px; font-family:Arial;">
            <h1>🚫 BANLANDINIZ</h1>
            <p>${data.message}</p>
            <hr>
            <p style="color:red;">Bu cihaz sohbetten uzaklaştırıldı.</p>
            <button onclick="location.reload()">Tekrar Dene</button>
        </div>
    `;
});

socket.on('error', (data) => {
    console.log('⚠️ Hata:', data);
    addSystemMessage('⚠️ ' + data.message);
});

socket.on('chat_message', (data) => {
    console.log('💬 Mesaj geldi:', data.username, ':', data.message);
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

socket.on('system_message', (data) => {
    console.log('📢 Sistem:', data.text);
    addSystemMessage(data.text);
});

socket.on('user_list', (users) => {
    console.log('👥 Aktif kullanıcılar:', users.length);
    if (userCountSpan) {
        userCountSpan.textContent = users.length;
    }
});

// Mesaj gönderme
function sendMessage() {
    const message = messageInput.value.trim();
    console.log('📤 Mesaj gönderiliyor:', message);
    
    if (message === '') {
        console.log('⚠️ Boş mesaj');
        return;
    }
    
    if (!socket.connected) {
        console.log('❌ Socket bağlı değil!');
        addSystemMessage('❌ Bağlantı yok, mesaj gönderilemiyor!');
        return;
    }
    
    socket.emit('chat_message', { message: message });
    console.log('✅ Mesaj emit edildi');
    messageInput.value = '';
    messageInput.focus();
}

function addSystemMessage(text) {
    const sysDiv = document.createElement('div');
    sysDiv.className = 'system-message';
    sysDiv.textContent = '📢 ' + text;
    messagesDiv.appendChild(sysDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listenerlar
if (sendButton) {
    sendButton.addEventListener('click', sendMessage);
    console.log('✅ Send button hazır');
} else {
    console.error('❌ Send button bulunamadı! ID: sendButton');
}

if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    console.log('✅ Input hazır');
} else {
    console.error('❌ Message input bulunamadı! ID: messageInput');
}

// Sayfa yüklendiğinde
window.addEventListener('load', () => {
    console.log('📄 Sayfa yüklendi');
    console.log('🔌 Socket durumu:', socket.connected ? 'Bağlı' : 'Bağlı değil');
});

console.log('🟢 Client.js hazır');
