# Aetheria

Aetheria adalah bot WhatsApp modular berbasis [Katsumi](https://github.com/nat9h/Katsumi), Baileys, dan sistem plugin file-based. Fokus awalnya adalah gameplay petualangan: buat karakter, leveling, jelajah, kerja, daily reward, inventory, toko, heal, dan leaderboard.

## Arah Project

- Nama publik tetap pendek: **Aetheria**
- Fitur gameplay dipisah di modul sendiri agar mudah diperluas
- Core Baileys, auth, serializer, dan plugin loader tetap dekat dengan base Katsumi
- Plugin non-core bisa aktif/nonaktif lewat `.env`, bukan dihapus permanen
- Data karakter RPG disimpan di Supabase agar aman untuk dashboard, restore, dan pemindahan device

## Fitur Gameplay

- Class awal: `warrior`, `rogue`, `mage`, `ranger`
- Stat karakter: HP, energy, XP, level, gold, ATK, DEF, AGI
- Jelajah PvE dengan monster scaling per zona
- Job/farming: mine, forage, fish
- Craft item dan gear dari material
- Jual material/consumable untuk gold
- Map zona dan monster
- Daily reward 24 jam
- Toko consumable dan gear
- Inventory dan leaderboard
- Supporter dan Aether Pass pra-season
- Guild Petualang/Pedagang sebagai syarat jelajah dan kerja
- Squad sebagai fondasi dungeon, raid, dan fitur party berikutnya

## Quick Start

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```env
BOT_NAME=Aetheria
BOT_DESCRIPTION=WhatsApp adventure bot
BOT_PREFIXES=!,.,/
BOT_NUMBER=6281234567890
QR=false
AUTH_STORE=local
USE_MONGO=false
BOT_PLUGIN_FOLDERS=info,rpg,owner
SUPABASE_URL=https://wodvyzmlgmnkculpmbuk.supabase.co
SUPABASE_ANON_KEY=sb_publishable_zzWf2cvS6umdCDir0abm6Q_wtqoPXY9
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AETHERIA_PUBLIC_URL=http://localhost:3020
AETHERIA_SUPPORTER_PRICE=Rp10.000/bulan
AETHERIA_PASS_PRICE=Rp25.000/30 hari
AETHERIA_PAYMENT_TEXT=Hubungi owner untuk aktivasi manual.
```

Jalankan:

```bash
npm run dev
```

Saat pertama login, bot akan menampilkan pairing code. Buka WhatsApp lalu masuk ke **Linked Devices** dan masukkan kode itu.

Kalau ingin pakai QR:

```env
QR=true
```

## Command Utama

| Command                  | Fungsi                         |
| ------------------------ | ------------------------------ |
| `.mulai warrior`         | Buat karakter baru             |
| `.login`                 | Hubungkan akun Google          |
| `.akun`                  | Cek akun yang terhubung        |
| `.premium`               | Cek Supporter dan Aether Pass  |
| `.logout confirm`        | Lepas Google dari WhatsApp     |
| `.unlink confirm`        | Alias logout                   |
| `.restore`               | Mulai restore cloud save       |
| `.restore apply`         | Terapkan cloud save            |
| `/`                      | Info bot Aetheria              |
| `/dashboard`             | Dashboard web karakter         |
| `.profil`                | Lihat status karakter          |
| `.guild`                 | Cek Guild Petualang/Pedagang   |
| `.guild petualang`       | Daftar untuk fitur jelajah     |
| `.guild pedagang`        | Daftar untuk fitur kerja       |
| `.squad`                 | Cek squad dungeon/raid         |
| `.squad buat <nama>`     | Buat squad baru                |
| `.squad join <kode>`     | Join squad                     |
| `.jelajah`               | Adventure dan lawan monster    |
| `.race`                  | Lihat race dan jalur evolusi   |
| `.evolve <race>`         | Evolusi race jika syarat cukup |
| `.skill`                 | Lihat skill yang diserap       |
| `.skill equip <skill>`   | Pasang skill aktif             |
| `.skill awaken <unique>` | Bangkitkan unique skill        |
| `.kerja mine`            | Farming gold, XP, material     |
| `.craft`                 | Lihat list crafting            |
| `.craft list`            | Alias daftar crafting          |
| `.craft potion`          | Buat item dari material        |
| `.jual ore 3`            | Jual item/material             |
| `.jual semua`            | Jual semua item sellable       |
| `.map`                   | Lihat zona dan monster         |
| `.map <zona/nomor>`      | Ganti map aktif                |
| `.daily`                 | Ambil reward harian            |
| `.inv`                   | Lihat item dan gear            |
| `.shop`                  | Lihat toko                     |
| `.beli potion 2`         | Beli item                      |
| `.heal`                  | Pakai potion                   |
| `.heal ether`            | Pakai ether                    |
| `.leaderboard`           | Ranking player                 |
| `.help petualangan`      | Lihat kategori gameplay        |

## Plugin Focus

Default `.env.example` memakai:

```env
BOT_PLUGIN_FOLDERS=info,rpg,owner
```

Artinya hanya folder plugin `info`, `rpg`, dan `owner` yang dimuat. Folder internal `rpg` berisi gameplay Aetheria. Source plugin bawaan Katsumi tetap ada, tapi tidak aktif secara default agar permukaan bot tetap clean.

Untuk memuat semua plugin Katsumi:

```env
BOT_PLUGIN_FOLDERS=all
```

Untuk memilih folder tertentu:

```env
BOT_PLUGIN_FOLDERS=info,rpg,owner,group
```

## Struktur Penting

```text
src/config/brand.js         Nama dan deskripsi publik bot
src/config/supabase.js      Konfigurasi Supabase
src/lib/supabase/           Account linking Google
src/lib/rpg.js              Gameplay engine dan data helper Supabase
src/plugins/rpg/            Command gameplay
src/plugins/info/help.js    Menu bantuan Aetheria
src/lib/plugins.js          Loader plugin dengan BOT_PLUGIN_FOLDERS
supabase/schema.sql         Schema account linking
```

## Supabase Google Login

Fitur `.login` memakai Supabase Auth Google sebagai account linking. WhatsApp tetap jadi tempat bermain, Google dipakai untuk mengamankan akun dan fondasi dashboard.

Langkah setup:

1. Buat project Supabase.
2. Jalankan SQL di `supabase/schema.sql` lewat SQL Editor Supabase.
3. Aktifkan Google provider di Supabase Auth.
4. Di Google Cloud OAuth client, tambahkan authorized redirect URI dari halaman Google provider Supabase.
5. Di Supabase Auth URL configuration, tambahkan redirect URL:

```text
http://localhost:3020/link/callback
```

Untuk production, ganti dengan domain publik:

```text
https://domain-kamu.com/link/callback
```

Project ini juga sudah punya source Vercel untuk halaman login:

```text
api/link.js
api/link-complete.js
api/health.js
vercel.json
```

Panduan deploy ada di `VERCEL_SETUP.md`. Jika login memakai Vercel, bot lokal/VPS cukup diarahkan ke domain Vercel:

```env
AETHERIA_PUBLIC_URL=https://aetheria-theta.vercel.app
AETHERIA_LINK_SERVER_ENABLED=false
```

Dashboard web tersedia di:

```text
https://aetheria-theta.vercel.app
https://aetheria-theta.vercel.app/dashboard
```

Root domain menampilkan info bot. Dashboard user ada di `/dashboard` dan membaca data RPG utama dari Supabase. Jika dashboard belum menampilkan karakter lama setelah migrasi, ketik `.profil` atau `.akun` di WhatsApp untuk memicu import otomatis dari local legacy ke Supabase.

## Guest, Logout, dan Restore

User bisa main tanpa Google sebagai guest. Guest tetap disimpan di Supabase memakai WhatsApp JID. Google dipakai untuk mengikat cloud save, dashboard, dan restore.

```text
.login
```

Mengikat progress WhatsApp saat ini ke Google.

```text
.logout
.logout confirm
```

Melepas nomor WhatsApp dari akun Google. Cloud save tetap tersimpan di Google, tetapi nomor WhatsApp ini tidak lagi memegang karakter aktif. Ketik `.mulai` untuk guest baru, atau `.restore` untuk memakai cloud save lain.

```text
.restore
.restore apply
```

Memulihkan cloud save dari Google ke WhatsApp ini. Gunakan ini kalau pindah nomor/device atau ingin memainkan akun Google lain.

Env minimal:

```env
SUPABASE_URL=https://wodvyzmlgmnkculpmbuk.supabase.co
SUPABASE_ANON_KEY=sb_publishable_zzWf2cvS6umdCDir0abm6Q_wtqoPXY9
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AETHERIA_PUBLIC_URL=http://localhost:3020
AETHERIA_LINK_SERVER_PORT=3020
```

Flow:

```text
.login
-> bot kirim link
-> user login Google
-> Supabase session diverifikasi server
-> auth user terhubung ke WhatsApp JID
```

Catatan keamanan:

- `SUPABASE_SERVICE_ROLE_KEY` hanya untuk server bot. Jangan taruh di frontend.
- `account_link_tokens` tidak punya policy publik; aksesnya lewat server bot.
- Link `.login` sekali pakai dan punya TTL.

## Script

```bash
npm run dev       # development watch mode
npm start         # production
npm run lint      # lint
npm run prettier  # format
```

## Storage

Mode paling ringan adalah local JSON:

```env
AUTH_STORE=local
USE_MONGO=false
DATABASE_LOCAL_PATH=./sessions/database.json
```

Kalau `USE_MONGO=true`, data user dan payload gameplay akan disimpan lewat MongoDB model.

## Base

Project ini memakai Katsumi sebagai base:

- Repo: https://github.com/nat9h/Katsumi
- Core: Baileys socket, serializer, plugin manager, auth store
- License base: MIT
