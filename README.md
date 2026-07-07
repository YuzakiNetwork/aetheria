# Aetheria

> Modular WhatsApp bot — Aetheria is a WhatsApp RPG bot that turns your
> group chats into a play-by-message adventure. It tracks character
> stats, runs daily quests, lets you fight monsters from the right reply
> menu, and persists progress to Supabase so you can hop between devices.

> Bot WhatsApp modular — Aetheria adalah bot WhatsApp RPG yang mengubah
> chat grup Anda jadi petualangan main-oleh-pesan. Ia melacak stat
> karakter, menjalankan quest harian, melawan monster lewat menu reply,
> dan menyimpan progress ke Supabase agar Anda bisa pindah device.

[English](#english) · [Bahasa Indonesia](#bahasa-indonesia)

## English

Aetheria is a modular WhatsApp bot built on
[Baileys v7 (WhiskeySockets)](https://github.com/WhiskeySockets/Baileys/releases/tag/v7.0.0-rc13)
and a plugin file-based system inherited from Katsumi. The headline
feature is RPG gameplay: create a character, level up, explore zones,
work, claim daily rewards, manage your inventory, and climb the
leaderboard.

### Project direction

- Public short name: **Aetheria**
- Gameplay features are split into their own modules for easy extension
- Core socket, auth, serializer, and plugin loader stay close to the
  Katsumi base
- The serializer exposes `m.replyButtons`, `m.replyInteractive`,
  `m.replyList`, and `m.replyPoll` helpers. On Baileys v7 the official
  build does **not** expand `nativeFlow` / `buttons` / `sections`
  shortcuts inside `sendMessage`, so interactive helpers currently
  fall back to plain-text replies. The proto builders live in
  `src/lib/interactiveMessage.js` for future re-introduction.

## Bahasa Indonesia

Aetheria adalah bot WhatsApp modular berbasis
[Baileys v7 (WhiskeySockets)](https://github.com/WhiskeySockets/Baileys/releases/tag/v7.0.0-rc13)
dan sistem plugin file-based yang diwarisi dari Katsumi. Fokus utamanya
adalah gameplay RPG: buat karakter, leveling, jelajah, kerja, daily
reward, inventory, dan leaderboard.

## Arah Project

- Nama publik tetap pendek: **Aetheria**
- Fitur gameplay dipisah di modul sendiri agar mudah diperluas
- Core Baileys, auth, serializer, dan plugin loader tetap dekat dengan base Katsumi
- Serializer menyediakan helper `m.replyButtons`, `m.replyInteractive`, `m.replyList`, `m.replyPoll`, dan `m.replyTable` untuk mempercantik command dengan fitur interaktif @itsliaaa/baileys
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
- Misi pemula, harian, mingguan, dan guild
- Achievement dan title kosmetik
- World Boss mini per grup
- Pet/companion dengan bonus stat kecil
- Bestiary monster per zona
- Dungeon mini berbasis squad
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
AETHERIA_REMINDER_ENABLED=true
AETHERIA_REMINDER_TIMEZONE=Asia/Jakarta
AETHERIA_REMINDER_PREFIX=.
AETHERIA_SUPPORTER_PRICE=Rp10.000/bulan
AETHERIA_PASS_PRICE=Rp25.000/30 hari
AETHERIA_PAYMENT_TEXT=Hubungi owner untuk aktivasi manual.
AETHERIA_DISCORD_ENABLED=auto
DISCORD_BOT_TOKEN=
DISCORD_APPLICATION_ID=
DISCORD_GUILD_ID=
DISCORD_REGISTER_COMMANDS=true
```

Jalankan:

```bash
npm run dev
```

Saat pertama login, bot akan menampilkan pairing code. Buka WhatsApp lalu masuk ke **Linked Devices** dan masukkan kode itu.

## Discord Adapter

Aetheria bisa jalan di Discord sebagai adapter tambahan. WhatsApp tetap menjadi
platform utama, sementara Discord punya slash command komunitas dan RPG awal:

```text
/ping
/status
/update
/help
/invite
/invite-aetheria
/support
/play
/stop
/nowplaying
/rpg
/start
/profile
/daily
/quest
/guild
/adventure
/work
/heal
/leaderboard
```

Env Discord:

```env
AETHERIA_DISCORD_ENABLED=auto
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_APPLICATION_ID=your-discord-application-id
DISCORD_GUILD_ID=optional-test-guild-id
DISCORD_REGISTER_COMMANDS=true
```

`AETHERIA_DISCORD_ENABLED=auto` membuat adapter Discord aktif hanya jika
`DISCORD_BOT_TOKEN` tersedia. `DISCORD_GUILD_ID` tidak wajib. Isi hanya saat
testing agar slash command muncul cepat di server tertentu. Kosongkan
`DISCORD_GUILD_ID` jika command ingin diregister global.

Di Discord Developer Portal, aktifkan bot dan invite dengan scope:

```text
bot applications.commands
```

Permission awal yang dibutuhkan adalah kirim pesan slash command, embed, dan
voice Connect/Speak untuk fitur `/play`. Message Content Intent belum diperlukan
karena adapter memakai slash command, bukan prefix chat.

Invite URL bisa dibuat dari application id:

```text
https://discord.com/oauth2/authorize?client_id=YOUR_APPLICATION_ID&scope=bot%20applications.commands&permissions=3524352
```

Fitur voice:

```text
/play query:lofi hip hop radio
/play query:https://youtu.be/VIDEO_ID
/play query:lofi hip hop channel:#General
/play query:https://contoh-radio.example/live title:Radio Aether
/nowplaying
/stop
```

`/play` menerima judul lagu, YouTube URL, atau direct audio/radio stream URL
`http://`/`https://`, lalu menyalurkannya ke voice channel Discord tempat
pemanggil berada. Judul lagu dan YouTube URL di-resolve memakai `yt-dlp`, tanpa
menyimpan file musik permanen ke disk. Jalankan command voice dari text channel
server atau chat voice channel server. Jika posisi voice kamu tidak terbaca,
isi option `channel` saat menjalankan `/play`.

Field Discord Developer Portal untuk Aetheria:

```text
Interactions Endpoint URL: kosongkan dulu
Linked Roles Verification URL: https://aetheria-theta.vercel.app/discord/linked-roles
Terms of Service URL: https://aetheria-theta.vercel.app/terms
Privacy Policy URL: https://aetheria-theta.vercel.app/privacy
```

`Interactions Endpoint URL` dikosongkan karena adapter Discord Aetheria menerima
slash command lewat Gateway `discord.js`. Jika endpoint HTTP diisi, model
interactions berubah ke outgoing webhook dan perlu handler signature Discord
terpisah.

Kalau ingin pakai QR:

```env
QR=true
```

## Aetheria Pixel RPG App

Prototype aplikasi pixel RPG ada di `app/`. Aplikasi ini berjalan sebagai PWA/browser game berbasis Phaser: ada map kota kecil, movement keyboard/mobile, NPC, quest board, blacksmith, healer, monster encounter, combat ringan, inventory, log, dan local save.

Jalankan dev server app:

```bash
npm run app:dev
```

Build app:

```bash
npm run app:build
```

## Command Utama

| Command                  | Fungsi                         |
| ------------------------ | ------------------------------ |
| `.mulai warrior`         | Buat karakter baru             |
| `.guide`                 | Arahan bermain berikutnya      |
| `.progress`              | Checklist perkembangan RPG     |
| `.reminder`              | Atur reminder otomatis grup    |
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
| `.dungeon`               | Jalankan dungeon mini squad    |
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
| `.upgrade`               | Lihat status tempa gear        |
| `.upgrade weapon`        | Tempa slot gear untuk stat     |
| `.jual ore 3`            | Jual item/material             |
| `.jual semua`            | Jual semua item sellable       |
| `.map`                   | Lihat zona dan monster         |
| `.map <zona/nomor>`      | Ganti map aktif                |
| `.bestiary`              | Lihat monster zona aktif       |
| `.bestiary <zona>`       | Lihat monster zona tertentu    |
| `.bestiary tabel`        | Lihat stat monster via table   |
| `.voterpg`               | Poll voting arah fitur RPG     |
| `.daily`                 | Ambil reward harian            |
| `.misi`                  | Lihat semua misi aktif         |
| `.misi pemula`           | Lihat questline pemain baru    |
| `.misi guild`            | Lihat misi guild aktif         |
| `.misi claim`            | Klaim misi yang selesai        |
| `.achievement`           | Lihat achievement dan progress |
| `.title`                 | Lihat title yang dimiliki      |
| `.title pakai <title>`   | Pakai title dari achievement   |
| `.title reset`           | Kembali ke race title          |
| `.boss`                  | Lihat World Boss grup          |
| `.serangboss`            | Serang World Boss grup         |
| `.raid`                  | Alias serang World Boss        |
| `.pet`                   | Lihat companion dan koleksi    |
| `.pet summon`            | Summon companion               |
| `.pet pakai <pet>`       | Pakai companion aktif          |
| `.pet lepas`             | Lepas companion aktif          |
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

Reminder grup RPG aktif sebagai scheduler, tetapi tidak mengirim pesan sampai
admin grup menjalankan `.reminder on`. Untuk mematikan scheduler secara global:

```env
AETHERIA_REMINDER_ENABLED=false
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

Jika muncul `EADDRINUSE: address already in use :::3020`, port login lokal
sedang dipakai proses lain. Pilih salah satu:

```env
# Pakai port lokal lain
AETHERIA_PUBLIC_URL=http://localhost:3021
AETHERIA_LINK_SERVER_PORT=3021
```

atau, jika halaman login sudah memakai Vercel/domain publik:

```env
AETHERIA_LINK_SERVER_ENABLED=false
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

- Repo: https://github.com/YuzakiNetwork/aetheria
- Core: Baileys socket, serializer, plugin manager, auth store
- License base: MIT
