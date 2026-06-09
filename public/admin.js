let adminToken = sessionStorage.getItem('adminToken');

// Admin girişi
function login() {
    const password = document.getElementById('adminPassword').value;
    
    fetch('/api/users', {
        headers: {
            'Authorization': 'Bearer ' + password
        }
    })
    .then(res => {
        if (res.ok) {
            adminToken = password;
            sessionStorage.setItem('adminToken', adminToken);
            document.getElementById('loginPanel').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            loadData();
            startAutoRefresh();
        } else {
            alert('❌ Geçersiz şifre!');
        }
    });
}

// Verileri yükle
function loadData() {
    loadActiveUsers();
    loadBannedUsers();
}

// Aktif kullanıcıları listele (device ID ile)
function loadActiveUsers() {
    fetch('/api/users', {
        headers: {
            'Authorization': 'Bearer ' + adminToken
        }
    })
    .then(res => res.json())
    .then(users => {
        const userList = document.getElementById('userList');
        if (users.length === 0) {
            userList.innerHTML = '<div class="info">Aktif kullanıcı yok</div>';
            return;
        }
        
        userList.innerHTML = '';
        users.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item';
            userDiv.innerHTML = `
                <div class="user-info">
                    <strong>👤 ${escapeHtml(user.username)}</strong><br>
                    <small>🆔 Device: ${user.deviceId.substring(0, 20)}...</small>
                    <small>🕐 Katılım: ${new Date(user.joinedAt).toLocaleTimeString()}</small>
                </div>
                <button onclick="banUser('${user.deviceId}', '${escapeHtml(user.username)}')" class="ban-btn">
                    🚫 Banla
                </button>
            `;
            userList.appendChild(userDiv);
        });
    })
    .catch(err => console.error('Kullanıcı listesi hatası:', err));
}

// Banlı kullanıcıları listele
function loadBannedUsers() {
    fetch('/api/banned', {
        headers: {
            'Authorization': 'Bearer ' + adminToken
        }
    })
    .then(res => res.json())
    .then(banned => {
        const bannedList = document.getElementById('bannedList');
        if (banned.length === 0) {
            bannedList.innerHTML = '<div class="info">Banlı kullanıcı yok</div>';
            return;
        }
        
        bannedList.innerHTML = '';
        banned.forEach(ban => {
            const banDiv = document.createElement('div');
            banDiv.className = 'ban-item';
            banDiv.innerHTML = `
                <div class="ban-info">
                    <strong>🆔 ${ban.deviceId.substring(0, 30)}...</strong><br>
                    <small>📝 Sebep: ${ban.reason}</small><br>
                    <small>📅 Tarih: ${new Date(ban.timestamp).toLocaleString()}</small>
                </div>
                <button onclick="unbanUser('${ban.deviceId}')" class="unban-btn">
                    ✅ Banı Kaldır
                </button>
            `;
            bannedList.appendChild(banDiv);
        });
    });
}

// Kullanıcı banla
function banUser(deviceId, username) {
    if (confirm(`${username} kullanıcısını (${deviceId.substring(0, 20)}...) banlamak istediğinize emin misiniz?`)) {
        fetch('/api/admin/ban', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + adminToken
            },
            body: JSON.stringify({ deviceId, reason: `Admin ${username} kullanıcısını banladı` })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('✅ Kullanıcı banlandı!');
                loadData(); // Listeleri yenile
            } else {
                alert('❌ Banlama başarısız: ' + (data.error || 'Bilinmeyen hata'));
            }
        })
        .catch(err => {
            alert('❌ Hata: ' + err.message);
        });
    }
}

// Ban kaldır
function unbanUser(deviceId) {
    if (confirm('Banı kaldırmak istediğinize emin misiniz?')) {
        fetch('/api/admin/unban', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + adminToken
            },
            body: JSON.stringify({ deviceId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('✅ Ban kaldırıldı!');
                loadData();
            } else {
                alert('❌ Başarısız: ' + (data.error || 'Bilinmeyen hata'));
            }
        });
    }
}

// Tüm banları temizle
function clearAllBans() {
    if (confirm('⚠️ TÜM BANLARI temizlemek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
        fetch('/api/admin/clear-bans', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + adminToken
            }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('✅ Tüm banlar temizlendi!');
                loadData();
            }
        });
    }
}

// Otomatik yenileme (her 5 saniye)
let refreshInterval;
function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        if (document.getElementById('adminPanel').style.display === 'block') {
            loadActiveUsers();
            loadBannedUsers();
        }
    }, 5000);
}

// HTML escape
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Çıkış yap
function logout() {
    sessionStorage.removeItem('adminToken');
    location.reload();
}

// Sayfa yüklendiğinde token kontrolü
window.addEventListener('DOMContentLoaded', () => {
    if (adminToken) {
        fetch('/api/users', {
            headers: { 'Authorization': 'Bearer ' + adminToken }
        })
        .then(res => {
            if (res.ok) {
                document.getElementById('loginPanel').style.display = 'none';
                document.getElementById('adminPanel').style.display = 'block';
                loadData();
                startAutoRefresh();
            } else {
                sessionStorage.removeItem('adminToken');
            }
        });
    }
});
