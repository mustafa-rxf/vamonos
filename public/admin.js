let isAuthenticated = false;
const adminPassword = prompt('Admin şifresi:');

if (!adminPassword) {
  window.location.href = '/';
}

fetch('/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password: adminPassword })
})
.then(res => res.json())
.then(data => {
  if (data.success) {
    isAuthenticated = true;
    initAdmin();
  } else {
    alert('Yanlış şifre!');
    window.location.href = '/';
  }
})
.catch(err => {
  alert('Hata: ' + err);
  window.location.href = '/';
});

function initAdmin() {
  loadStats();
  loadUsers();
  loadBannedDevices();
  loadSpammers();
  loadChatHistory();

  // Auto-refresh every 5 seconds
  setInterval(() => {
    loadStats();
    loadUsers();
    loadBannedDevices();
    loadSpammers();
  }, 5000);

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
      });
      document.getElementById('tab-' + tabName).style.display = 'block';
      document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
      });
      e.target.classList.add('active');
    });
  });
}

function loadStats() {
  fetch('/api/admin/stats')
    .then(res => res.json())
    .then(data => {
      document.getElementById('users-count').textContent = data.usersOnline;
      document.getElementById('banned-count').textContent = data.bannedDevices;
      document.getElementById('spammers-count').textContent = data.spammersTracked;
      document.getElementById('messages-count').textContent = data.totalMessages;
    });
}

function loadUsers() {
  fetch('/api/admin/users')
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('users-list');
      container.innerHTML = '';
      if (data.length === 0) {
        container.innerHTML = '<p class="empty-message">Şu anda aktif kullanıcı yok</p>';
        return;
      }
      data.forEach(user => {
        const div = document.createElement('div');
        div.className = 'user-item';
        div.innerHTML = `
          <div class="user-info">
            <strong>${user.name}</strong>
            <span class="device-id">Device: ${user.deviceId}</span>
            <span class="join-time">Katılma: ${new Date(user.joinedAt).toLocaleString('tr-TR')}</span>
          </div>
        `;
        container.appendChild(div);
      });
    });
}

function loadBannedDevices() {
  fetch('/api/admin/banned-devices')
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('banned-list');
      container.innerHTML = '';
      if (data.length === 0) {
        container.innerHTML = '<p class="empty-message">Banlanmış cihaz yok</p>';
        return;
      }
      data.forEach(item => {
        const div = document.createElement('div');
        div.className = 'banned-item';
        div.innerHTML = `
          <div class="banned-info">
            <strong>${item.deviceId}</strong>
            <span class="ban-reason">Sebep: ${item.reason}</span>
            <span class="ban-time">Banlanma: ${new Date(item.bannedAt).toLocaleString('tr-TR')}</span>
          </div>
          <button class="unban-btn" onclick="unbanDevice('${item.deviceId}')">Ban Kaldır</button>
        `;
        container.appendChild(div);
      });
    });
}

function loadSpammers() {
  fetch('/api/admin/spammers')
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('spammers-list');
      container.innerHTML = '';
      if (data.length === 0) {
        container.innerHTML = '<p class="empty-message">Hiç spammer kaydı yok</p>';
        return;
      }
      data.forEach(spammer => {
        const div = document.createElement('div');
        div.className = 'spammer-item';
        let recordsHtml = spammer.records.map(r => 
          `<li>${r.message}... (${new Date(r.timestamp).toLocaleString('tr-TR')})</li>`
        ).join('');
        div.innerHTML = `
          <div class="spammer-info">
            <strong>${spammer.deviceId}</strong>
            <span class="spam-count">Spam sayısı: ${spammer.spamCount}</span>
            <ul class="spam-records">${recordsHtml}</ul>
          </div>
        `;
        container.appendChild(div);
      });
    });
}

function loadChatHistory() {
  fetch('/api/admin/chat-history')
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById('chat-history');
      container.innerHTML = '';
      if (data.length === 0) {
        container.innerHTML = '<p class="empty-message">Chat geçmişi boş</p>';
        return;
      }
      data.forEach(msg => {
        const div = document.createElement('div');
        div.className = `history-message ${msg.type}`;
        let content = '';
        if (msg.type === 'chat') {
          content = `<strong>${msg.name}</strong>: ${msg.message}`;
        } else if (msg.type === 'system') {
          content = msg.message;
        } else if (msg.type === 'spam') {
          content = msg.message;
        }
        div.innerHTML = `
          ${content}
          <span class="msg-time">${new Date(msg.timestamp).toLocaleString('tr-TR')}</span>
        `;
        container.appendChild(div);
      });
      container.scrollTop = container.scrollHeight;
    });
}

function unbanDevice(deviceId) {
  if (confirm(`${deviceId} banını kaldırmak istediğinize emin misiniz?`)) {
    fetch('/api/admin/unban-device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert('Ban kaldırıldı!');
        loadBannedDevices();
        loadStats();
      } else {
        alert('Hata: ' + data.message);
      }
    });
  }
}

function clearAllBans() {
  if (confirm('Tüm banları kaldırmak istediğinize emin misiniz?')) {
    fetch('/api/admin/clear-bans', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Tüm banlar kaldırıldı!');
          loadBannedDevices();
          loadStats();
        } else {
          alert('Hata: ' + data.message);
        }
      });
  }
}

function logout() {
  if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
    window.location.href = '/';
  }
}