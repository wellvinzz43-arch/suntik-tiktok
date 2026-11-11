# SUNTIK TIKTOK

Dashboard pemesanan kampanye promosi TikTok yang sah. Tidak menyediakan pembelian engagement palsu.

## Menjalankan
1. Install Node.js 18+.
2. Ekstrak ZIP, lalu jalankan `npm install`.
3. Salin `.env.example` menjadi `.env`.
4. Isi `ADMIN_TOKEN` dengan string acak minimal 24 karakter.
5. (Opsional) Isi `PROVIDER_API_URL` dan `PROVIDER_API_KEY` hanya dari provider promosi resmi yang Anda punya izin gunakan.
6. Jalankan `npm start`, lalu buka `http://localhost:3000`.

## Integrasi API
Backend mengirim POST JSON ke `PROVIDER_API_URL` dengan header `Authorization: Bearer <key>`.
Payload: `reference_id`, `video_url`, `objective`, `budget_idr`, `contact`.
Sesuaikan payload dengan dokumentasi provider resmi. Jangan letakkan API key di HTML/browser.

## Catatan produksi
- Data pesanan pada starter ini disimpan di memori; akan hilang saat server restart. Ganti dengan database sebelum produksi.
- Pasang HTTPS, rate limiting, logging, validasi webhook provider, dan kebijakan privasi.
- Jangan gunakan untuk spam, bot engagement, atau manipulasi metrik TikTok.
