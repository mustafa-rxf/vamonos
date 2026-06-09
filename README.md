# Vamonos Chat 💬

Basit, anonim ve güvenli bir sohbet uygulaması.

## 🆕 v2.0.0 - Major Update

### ✨ Yeni Özellikler

✅ **Device ID-Based Ban Sistemi** - Aynı ağdaki diğer kişiler etkilenmez, sadece spam yapan cihaz banlanır  
✅ **Gelişmiş Admin Paneli** - Şifre korumalı, gerçek zamanlı yönetim  
✅ **Responsive Tasarım** - Mobil, tablet ve PC için optimize  
✅ **Spammer Tracking** - Spam yapanın tüm Device ID'leri kaydedilir ve yayınlanır  
✅ **Chat Geçmişi** - Admin panelinde son 100 mesaj görüntülenebilir  
✅ **Real-time İstatistikler** - Aktif kullanıcı, banlı cihaz sayıları  

## 🔒 Admin Paneli

Admin paneline erişmek için:
```
http://localhost:3000/admin
```

**Varsayılan Şifre:** `admin123` (değiştirerek çıkartın!)

### Admin Özellikleri

- 👥 **Kullanıcı Yönetimi** - Aktif kullanıcıları görüntüle ve yönet
- 🚫 **Ban Yönetimi** - Cihazları ban/unban et, tüm banları temizle
- ⚠️ **Spammer Takibi** - Spam yapan kişilerin tüm Device ID'lerini gör
- 📝 **Chat Geçmişi** - Mesajları ve spam olaylarını görüntüle
- 📊 **Gerçek Zamanlı İstatistikler** - Canlı veriler güncellenir

## 🎯 Özellikler

✅ **Rastgele İsimler** - Herkes random bir isim alır  
✅ **Ortak Sohbet** - Herkese açık genel chat  
✅ **Link Engelleme** - Link paylaşanlar cihazları banlanır  
✅ **Güzel Arayüz** - Modern ve responsive design  
✅ **Device ID Sistem** - Her cihaz kendine özel ID'ye sahip  

## 🚀 Kurulum

```bash
# Paketleri yükle
npm install

# Sunucuyu başlat
npm start

# Geliştirme modu (auto-reload)
npm run dev
```

Tarayıcıda açın: `http://localhost:3000`

## 🛠️ Teknoloji

- **Backend**: Node.js + Express + Socket.io
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Real-time**: WebSocket (Socket.io)
- **Storage**: In-memory (production için database önerilen)

## 📋 Kurallar

🚫 **Link paylaşımı = Device Ban**

Aşağıdaki URL formatları engellenir:
- `http://` veya `https://`
- `www.`
- `ftp://`

⚠️ **Önemli:** Spam yapan kişinin tüm Device ID'leri chatta yayınlanır!

## 🔐 Güvenlik

- Device ID localStorage'da saklanır
- Admin paneli şifre korumalı
- Her cihaz kendine özel ID'ye sahip
- IP ban yerine cihaz bazlı ban sistemi

## 📱 Responsive Tasarım

- ✅ Mobil (< 480px)
- ✅ Tablet (480px - 768px)
- ✅ Masaüstü (> 768px)
- ✅ Landscape mode desteği

## 🌐 Deploy

### Render.com üzerine deploy etmek için:

1. GitHub'a push et
2. Render.com'a git
3. "New +" → "Web Service" seç
4. GitHub repo'nu bağla
5. Start Command: `npm start`
6. Environment Variable ekle:
   - `ADMIN_PASSWORD=senin_guçlü_şifren` (admin şifresini değiştir!)
7. Deploy et!

### Vercel üzerine deploy (Frontend):

`vercel.json` dosyası eklenebilir ve Serverless Functions kullanılabilir.

## 📝 Geliştirme Notları

- `server.js`: Ana sunucu dosyası + Admin API
- `public/index.html`: Chat arayüzü
- `public/client.js`: Socket.io client + Device ID sistemi
- `public/styles.css`: Responsive chat stileleri
- `public/admin.html`: Admin panel arayüzü
- `public/admin.js`: Admin panel işlevselliği
- `public/admin-styles.css`: Admin panel stileleri

## 🔄 Versiyon Geçmişi

### v2.0.0
- Device ID-based ban sistemi
- Gelişmiş admin paneli
- Responsive tasarım
- Spammer tracking
- Real-time istatistikler

### v1.0.0
- Temel chat işlevselliği
- Link engelleme
- IP ban sistemi

---

**Created with ❤️**
