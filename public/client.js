const socket = io();
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const usernameSpan = document.getElementById('username');

let currentUsername = '';

// Clear previous messages on each new connection
messagesDiv.innerHTML = '<div class="system-message">Welcome to Vamonos! You are anonymous. Links will result in IP ban.</div>';

// Receive user info
socket.on('userInfo', (data) => {
  currentUsername = data.username;
  usernameSpan.textContent = data.username;
});

// Receive messages
socket.on('message', (data) => {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${data.username === currentUsername ? 'sent' : 'received'}`;
  
  const contentEl = document.createElement('div');
  contentEl.className = 'message-content';
  contentEl.textContent = data.message;
  
  const infoEl = document.createElement('div');
  infoEl.className = 'message-info';
  infoEl.textContent = `${data.username} • ${data.timestamp}`;
  
  messageEl.appendChild(contentEl);
  messageEl.appendChild(infoEl);
  
  messagesDiv.appendChild(messageEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// User joined
socket.on('userJoined', (data) => {
  const systemEl = document.createElement('div');
  systemEl.className = 'system-message';
  systemEl.textContent = data.message;
  messagesDiv.appendChild(systemEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// User left
socket.on('userLeft', (data) => {
  const systemEl = document.createElement('div');
  systemEl.className = 'system-message';
  systemEl.textContent = data.message;
  messagesDiv.appendChild(systemEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Link detected - user banned
socket.on('linkDetected', (data) => {
  const systemEl = document.createElement('div');
  systemEl.className = 'system-message warning';
  systemEl.textContent = '🚫 ' + data.message;
  messagesDiv.appendChild(systemEl);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// User banned
socket.on('banned', (data) => {
  const systemEl = document.createElement('div');
  systemEl.className = 'system-message warning';
  systemEl.textContent = '⛔ ' + data.message;
  messagesDiv.appendChild(systemEl);
  messageInput.disabled = true;
  sendBtn.disabled = true;
  setTimeout(() => {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }, 100);
});

// Send message
function sendMessage() {
  const message = messageInput.value.trim();
  if (message === '') return;
  
  socket.emit('message', message);
  messageInput.value = '';
  messageInput.focus();
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});