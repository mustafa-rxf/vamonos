# Vamonos Chat 💬

Basit, anonim ve güvenli bir sohbet uygulaması.

## Özellikler

✅ **Rastgele İsimler** - Herkes random bir isim alır  
✅ **Ortak Sohbet** - Herkese açık genel chat  
✅ **Link Engelleme** - Link paylaşanlar IP ban yiyor  
✅ **Güzel Arayüz** - Modern ve responsive design  

## Kurulum

```bash
# Paketleri yükle
npm install

# Sunucuyu başlat
npm start

# Geliştirme modu (auto-reload)
npm run dev
```

Tarayıcıda açın: `http://localhost:3000`

## Teknoloji

- **Backend**: Node.js + Express + Socket.io
- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Real-time**: WebSocket (Socket.io)

## Kurallar

🚫 **Link paylaşımı = IP Ban**

Aşağıdaki URL formatları engellenir:
- `http://` veya `https://`
- `www.`
- `ftp://`

## Deploy

### Render.com üzerine deploy etmek için:

1. GitHub'a push et
2. Render.com'a git
3. "New +" → "Web Service" seç
4. GitHub repo'nu bağla
5. Start Command: `npm start`
6. Deploy et!

### Vercel üzerine deploy etmek için:

`vercel.json` dosyası eklenebilir ve Serverless Functions kullanılabilir.

## Geliştirme Notları

- `server.js`: Ana sunucu dosyası
- `public/index.html`: Chat arayüzü
- `public/client.js`: Socket.io client
- `public/styles.css`: Styling

---

**Created with ❤️**