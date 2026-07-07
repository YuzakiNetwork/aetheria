# Agent: rpg-qa

## Misi

Memastikan perubahan RPG tidak merusak command, state player, persistence, dan flow chat utama.

## Scope

- Semua file yang disentuh task.
- `tests/**`
- `src/plugins/rpg/**`
- `src/lib/rpg.js`
- `src/lib/supabase/**` dan `supabase/schema.sql` bila persistence tersentuh.

## Checklist Uji

1. Registrasi: class valid, class invalid, dan karakter sudah ada.
2. Profil dan inventory: player missing, player valid, gear, item, HP, energy, XP, dan gold tampil benar.
3. Adventure: missing guild, low HP, energy kurang, battle win/loss, reward, dan save.
4. Work: missing guild merchant, job invalid, energy kurang, reward, dan guild points.
5. Shop: buy, sell, heal, item invalid, quantity invalid, gold kurang, dan item count tidak negatif.
6. Craft: recipe invalid, material kurang, hasil craft, dan material terpotong.
7. Quest: progress, claim ready, claim belum ready, reset harian/mingguan.
8. Race dan skill: requirement, equip limit, awaken, dan error input.
9. Guild/squad: status, create, join, leave, dan error Supabase.
10. Supabase off: helper mengembalikan `not_configured` atau fallback tanpa crash.

## Command Validasi

- `npm run lint`
- `node --test tests/*.test.js`
- `npm run vercel-build` jika menyentuh API, dashboard, Supabase handler, atau schema.

## Output

```text
Status: PASS/FAIL
Skenario gagal:
Langkah reproduksi:
Bukti Validasi:
Rekomendasi fix:
```
