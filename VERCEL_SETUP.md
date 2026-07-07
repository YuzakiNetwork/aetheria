# Aetheria Vercel Login Server

Vercel hanya dipakai untuk halaman login Google dan callback Supabase. Bot WhatsApp tetap dijalankan di laptop atau VPS karena koneksi Baileys harus hidup terus.

## Struktur

```text
api/home.js             Halaman info bot /
api/link.js              Halaman /link dan /link/callback
api/link-complete.js     API penyelesaian link Google -> WhatsApp
api/dashboard.js         Dashboard web
api/dashboard-me.js      API data dashboard
api/health.js            Health check
vercel.json              Rewrite route publik ke API Vercel
.env.vercel.example      Env yang perlu dipasang di Vercel
```

## Deploy

1. Push repo ini ke GitHub.
2. Import repo ke Vercel.
3. Tambahkan Environment Variables di Vercel:

```env
SUPABASE_URL=https://wodvyzmlgmnkculpmbuk.supabase.co
SUPABASE_ANON_KEY=sb_publishable_zzWf2cvS6umdCDir0abm6Q_wtqoPXY9
SUPABASE_SERVICE_ROLE_KEY=isi_service_role_key
AETHERIA_PUBLIC_URL=https://aetheria-theta.vercel.app
AETHERIA_LINK_TOKEN_TTL_MINUTES=15
```

4. Deploy.
5. Buka health check:

```text
https://aetheria-theta.vercel.app/health
```

`supabaseConfigured` harus bernilai `true`.

## Supabase Redirect URL

Di Supabase Dashboard:

```text
Authentication -> URL Configuration -> Redirect URLs
```

Tambahkan:

```text
https://aetheria-theta.vercel.app/dashboard
https://aetheria-theta.vercel.app/link/callback
```

Di Google provider Supabase, pastikan provider Google sudah aktif.

## Env Bot

Di `.env` bot lokal/VPS, ganti public URL ke domain Vercel:

```env
AETHERIA_PUBLIC_URL=https://aetheria-theta.vercel.app
AETHERIA_LINK_SERVER_ENABLED=false
```

Dengan begitu command `.login` dari WhatsApp akan mengirim link Vercel, bukan `localhost`.

## Halaman Web

Root domain berisi info bot:

```text
https://aetheria-theta.vercel.app
```

Dashboard user tersedia di:

```text
https://aetheria-theta.vercel.app/dashboard
```

Pastikan Supabase `Site URL` mengarah ke:

```text
https://aetheria-theta.vercel.app
```

Dashboard membaca data RPG dari tabel Supabase `rpg_players`. Gunakan `.profil` atau `.akun` di WhatsApp jika karakter lama belum muncul setelah migrasi.
