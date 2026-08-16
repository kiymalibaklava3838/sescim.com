# Akdağ Elektronik – Web Sitesi

Next.js 14 + Supabase + Tailwind CSS ile geliştirilmiş profesyonel kurumsal website.

## Özellikler
- 🎨 Pantone 485 C kırmızı + Process Black tema
- 🔍 Gerçek zamanlı ürün arama (Supabase)
- 📦 Admin paneli (ürün ekleme, fotoğraf yükleme, silme)
- 🏆 AKUSTEK ana bayi landing bölümü
- 📱 Tam responsive tasarım
- ⚡ Smooth sayfa geçişleri ve animasyonlar

## Kurulum

### 1. Bağımlılıkları yükle
```bash
npm install
```

### 2. Supabase projesi oluştur
1. [supabase.com](https://supabase.com) adresine git, yeni proje oluştur
2. **Project URL** ve **anon key**'i kopyala

### 3. Ortam değişkenlerini ayarla
```bash
cp .env.local.example .env.local
```
`.env.local` dosyasını düzenleyip Supabase bilgilerini gir.

### 4. Veritabanını oluştur
Supabase Dashboard → SQL Editor'a git, `supabase-schema.sql` içeriğini yapıştır ve çalıştır.

### 5. Storage bucket oluştur
Supabase Dashboard → Storage → New Bucket:
- Name: `urun-fotograflari`
- Public: ✅ Açık

### 6. Admin kullanıcısı oluştur
Supabase Dashboard → Authentication → Users → Add User
- E-posta ve şifre belirle

### 7. Geliştirme sunucusu
```bash
npm run dev
```

## Vercel'e Deploy

1. GitHub'a push et
2. [vercel.com](https://vercel.com) → Import Project
3. Environment Variables'a Supabase bilgilerini ekle
4. Deploy!

## Sayfa Yapısı
```
/              → Ana sayfa (hero, kategoriler, AKUSTEK bölümü)
/urunler       → Ürün listesi + arama + kategori filtresi
/urunler/[id]  → Ürün detay sayfası
/iletisim      → İletişim bilgileri + form + harita
/admin         → Admin paneli (giriş gerekli)
/admin/giris   → Admin login sayfası
```

## Teknolojiler
- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Deployment:** Vercel
