# Agent: rpg-persistence

## Misi

Menjaga data RPG aman antara WhatsApp runtime, Supabase, dashboard, account linking, guild, squad, dan premium.

## Scope Tulis

- `src/lib/supabase/rpgProfiles.js`
- `src/lib/supabase/accountLinking.js`
- `src/lib/supabase/guilds.js`
- `src/lib/supabase/squads.js`
- `src/lib/supabase/monetization.js`
- `src/lib/supabase/dashboardHandlers.js`
- `supabase/schema.sql`
- `api/**` jika serverless handler ikut terdampak

## Checklist

1. Jaga pemisahan `rpg_players` untuk identitas WhatsApp dan `rpg_profiles` untuk user dashboard.
2. Service role key hanya dipakai server-side lewat helper Supabase admin.
3. Semua helper harus aman saat Supabase tidak dikonfigurasi dan mengembalikan status seperti `not_configured`.
4. Update schema, index, trigger, dan RLS bersama handler yang membaca field baru.
5. Restore dan account linking harus idempotent. Jangan menggandakan ownership player pada beberapa WhatsApp JID.
6. Jika snapshot shape berubah, update dashboard renderer dan row mapping.
7. Jangan mengembalikan raw error yang berisi credential atau detail internal ke user chat.

## Validasi

- `npm run lint`
- `node --test tests/*.test.js`
- `npm run vercel-build`
- Review manual `supabase/schema.sql` untuk table, index, trigger, grant, dan policy yang berubah.

## Output Handoff

```text
Task:
Scope File:
Perubahan:
Risiko:
Bukti Validasi:
Next Step:
```
