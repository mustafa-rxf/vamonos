const socket = io();
let deviceId = localStorage.getItem('deviceId');

if (!deviceId) {
  deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
  localStorage.setItem('deviceId', deviceId);
}

const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const usersOnlineEl = document.getElementById('users-online');

socket.on('connect', () => {
  socket.emit('join', { deviceId });
});

socket.on('banned', (data) => {
  alert(data.message);
  location.reload();
});

socket.on('message', (data) => {
  addMessageToChat(data);
});

socket.on('user_joined', (data) => {
  addSystemMessage(data.message);
  updateUsersOnline(data.usersOnline);
});

socket.on('user_left', (data) => {
  addSystemMessage(data.message);
  updateUsersOnline(data.usersOnline);
});

socket.on('user_banned', (data) => {
  addBanMessage(data.message);
  updateUsersOnline(data.usersOnline);
});

socket.on('stats', (stats) => {
  updateStats(stats);
});

function addMessageToChat(data) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message user-message';
  messageEl.innerHTML = `
    <strong>${data.name}</strong>: ${escapeHtml(data.message)}
    <span class="message-time">${new Date(data.timestamp).toLocaleTimeString('tr-TR')}</span>
  `;
  chatContainer.appendChild(messageEl);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addSystemMessage(message) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message system-message';
  messageEl.textContent = message;
  chatContainer.appendChild(messageEl);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addBanMessage(message) {
  const messageEl = document.createElement('div');
  messageEl.className = 'message ban-message';
  messageEl.textContent = message;
  chatContainer.appendChild(messageEl);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function updateUsersOnline(count) {
  usersOnlineEl.textContent = count;
}

function updateStats(stats) {
  // Stats can be displayed if needed
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

sendBtn.addEventListener('click', () => {
  const message = messageInput.value.trim();
  if (message) {
    socket.emit('message', { message });
    messageInput.value = '';
  }
});

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendBtn.click();
  }
});

// Mobile keyboard handling
messageInput.addEventListener('focus', () => {
  document.body.classList.add('keyboard-open');
});

messageInput.addEventListener('blur', () => {
  document.body.classList.remove('keyboard-open');
});