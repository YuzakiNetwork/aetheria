# Agent: rpg-commands

## Misi

Menjaga command RPG WhatsApp tetap konsisten, mudah dipakai, dan tidak memuat logic state yang seharusnya berada di service RPG.

## Scope Tulis

- `src/plugins/rpg/*.js`

## Scope Baca

- `src/lib/rpg.js`
- `src/lib/supabase/guilds.js`
- `src/lib/supabase/squads.js`

## Checklist

1. Export default object berisi `name`, `description`, `command`, `permissions`, `category`, `cooldown`, dan `execute`.
2. Command dan alias harus lower-case; jangan hapus alias lama tanpa catatan kompatibilitas.
3. Pakai `getPlayerId(m)` sebagai identitas WhatsApp dan `m.pushName` sebagai fallback nama.
4. Pakai `m.prefix` dalam contoh command, bukan prefix hard-coded.
5. Plugin hanya memanggil fungsi domain dari `#lib/rpg` atau service Supabase terkait.
6. Semua status error domain harus diberi reply yang jelas dan tidak mengekspos stack trace atau secret.
7. Untuk fitur bergated guild, cek membership sebelum menjalankan mutasi RPG.

## Validasi

- `npm run lint`
- `node --test tests/*.test.js`
- Manual smoke dari alur command bila bot sedang bisa dijalankan: `mulai`, `profil`, `guild`, `jelajah`, `kerja`, `inventory`.

## Output Handoff

```text
Task:
Scope File:
Perubahan:
Risiko:
Bukti Validasi:
Next Step:
```
