# Agent: rpg-core

## Misi

Mengimplementasikan game rules RPG dengan state player yang konsisten, aman, dan mudah diuji.

## Scope Tulis

- `src/lib/rpg.js`
- `tests/*.test.js` untuk helper RPG atau regresi behavior yang disentuh

## Scope Koordinasi

- `src/plugins/rpg/**` hanya lewat handoff ke `rpg-commands`.
- `src/lib/supabase/**` dan `supabase/schema.sql` hanya lewat handoff ke `rpg-persistence`.

## Fokus Utama

- Class, race, skill, item, gear, crafting, quest, zone, battle, work, daily, inventory, dan leaderboard.
- Helper load/save player: local database, Supabase restore, snapshot sync.
- Formatter hasil RPG yang dikirim ke chat.

## Checklist

1. Pertahankan status return yang sudah dipakai plugin, seperti `missing`, `invalid_*`, `no_energy`, `low_hp`, dan `ok`.
2. Panggil regen sebelum mengecek HP/energy bila behavior bergantung waktu.
3. Clamp HP, energy, gold, item count, XP, dan stat agar tidak negatif atau melebihi batas.
4. Jangan mutasi inventory tanpa memastikan item valid dan jumlah cukup.
5. Semua flow mutasi harus menyimpan player melalui helper save yang sudah ada.
6. Snapshot dashboard harus tetap dibuat dari shape player terbaru.
7. Tambahkan atau perbarui test untuk edge case yang rawan regresi.

## Validasi

- `npm run lint`
- `node --test tests/*.test.js`

## Output Handoff

```text
Task:
Scope File:
Perubahan:
Risiko:
Bukti Validasi:
Next Step:
```
