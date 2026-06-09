// Device ID oluştur veya al
let deviceId = localStorage.getItem('deviceId');
if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substr(2, 16) + '_' + Date.now();
    localStorage.setItem('deviceId', deviceId);
}

// Rastgele kullanıcı adı oluştur
const adjectives = ['Hızlı', 'Uzun', 'Kısa', 'Neşeli', 'Sakin', 'Cesur', 'Zeki'];
const nouns = ['Kedi', 'Köpek', 'Kuş', 'Balık', 'Aslan', 'Kaplan', 'Fil'];
const randomName = adjectives[Math.floor(Math.random() * adjectives.length)] + 
                   nouns[Math.floor(Math.random() * nouns.length)] + 
                   Math.floor(Math.random() * 100);

let currentUsername = localStorage.getItem('username') || randomName;
localStorage.setItem('username', currentUsername);

// Socket bağlantısı (device ID ile)
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
    statusSpan.textContent = '🟢 Bağlı';
    statusSpan.style.color = 'green';
    addSystemMessage('Sohbete hoş geldiniz!');
});

socket.on('connected', (data) => {
    console.log('Cihaz ID:', data.deviceId);
    addSystemMessage(`Cihazınız: ${data.deviceId.substring(0, 10)}...`);
});

// Ban mesajı
socket.on('banned', (data) => {
    alert('❌ ' + data.message);
    document.body.innerHTML = `
        <div style="text-align:center; padding:50px; font-family:Arial;">
            <h1>🚫 BANLANDINIZ</h1>
            <p>${data.message}</p>
            <p>Bu cihaz sohbetten uzaklaştırıldı.</p>
            <button onclick="location.reload()">Tekrar Dene</button>
        </div>
    `;
    socket.disconnect();
});

// Spam uyarısı
socket.on('spam_warning', (data) => {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'system-message warning';
    warningDiv.textContent = data.message;
    messagesDiv.appendChild(warningDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // 3 saniye sonra kaybol
    setTimeout(() => warningDiv.remove(), 3000);
});

// Normal mesaj
socket.on('chat_message', (data) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.innerHTML = `
        <strong>${data.username}:</strong> 
        <span>${escapeHtml(data.message)}</span>
        <small>${new Date(data.timestamp).toLocaleTimeString()}</small>
    `;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Sistem mesajı
socket.on('system_message', (data) => {
    addSystemMessage(data.text);
});

// Kullanıcı listesi güncelleme
socket.on('user_list', (users) => {
    userCountSpan.textContent = users.length;
});

// Mesaj gönderme
function sendMessage() {
    const message = messageInput.value.trim();
    if (message === '') return;
    
    socket.emit('chat_message', { message: message });
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

// HTML escape (XSS koruması)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listenerlar
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Sayfa kapanırken localStorage temizlenmesin (ban kalıcı olsun)
window.addEventListener('beforeunload', () => {
    // Device ID'yi koru, silme
});
