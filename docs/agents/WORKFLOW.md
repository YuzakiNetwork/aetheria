# Workflow Agent - Aetheria RPG

## Tujuan

Workflow ini dipakai untuk mengembangkan fitur RPG WhatsApp bot Aetheria secara terarah, kecil, dan mudah divalidasi. Agent utama bertindak sebagai `rpg-lead`, lalu memilih sub-agent seperlunya berdasarkan scope task.

## Agent Utama: rpg-lead

Misi:

- Memahami permintaan user dan memetakan dampaknya ke file konkret.
- Memilih sub-agent minimal yang dibutuhkan.
- Menjaga perubahan tetap sesuai pola repo: Node.js 20 ESM, Baileys plugin, import alias `#lib`, `#config`, `#core`, `#utils`, dan `#plugins`.
- Menggabungkan handoff sub-agent menjadi patch final yang bisa diuji.

## Sub-Agent

- `rpg-architect`: desain perubahan dan acceptance criteria.
- `rpg-core`: game rules, state player, battle, quest, item, skill, race, dan format output RPG.
- `rpg-commands`: wrapper command WhatsApp di `src/plugins/rpg/**`.
- `rpg-persistence`: sinkronisasi Supabase, account linking, guild, squad, dashboard, dan schema.
- `rpg-balance`: angka ekonomi, reward, cooldown, progression, dan itemization.
- `rpg-qa`: validasi regresi, test, lint, dan skenario manual.
- `rpg-marketing`: strategi update, teks pengumuman, teaser, reminder, dan CTA pemain.

## Routing Task

- Fitur RPG baru: `rpg-architect` -> `rpg-balance` -> `rpg-core` -> `rpg-commands` -> `rpg-qa`.
- Perubahan command/chat UX: `rpg-commands` -> `rpg-qa`.
- Perubahan reward, cooldown, item, skill, race, monster, atau quest: `rpg-balance` -> `rpg-core` -> `rpg-qa`.
- Perubahan account linking, restore, dashboard, guild, squad, premium, atau schema: `rpg-persistence` -> `rpg-qa`.
- Update yang terlihat oleh pemain: agent teknis terkait -> `rpg-qa` -> `rpg-marketing`.
- Campaign, announcement, atau changelog update: langsung ke `rpg-marketing`.
- Bug sempit dengan file jelas: langsung ke owner file, lalu `rpg-qa`.

## Format Handoff Wajib

```text
Task:
Scope File:
Perubahan:
Risiko:
Bukti Validasi:
Next Step:
```

## Definition of Done

- Command yang berubah tetap memakai `getPlayerId(m)`, `m.pushName`, dan `m.prefix` secara dinamis.
- Mutasi player lewat helper RPG yang menyimpan state dan memicu sync snapshot bila diperlukan.
- Perubahan cloud cocok dengan `supabase/schema.sql`, RLS, dan mode `not_configured`.
- Output chat tetap ringkas, jelas, dan memakai format yang konsisten dengan plugin RPG lain.
- Update user-facing yang sudah siap rilis punya teks pengumuman dan CTA command yang valid.
- Test atau alasan test-gap dicatat di handoff.

## Validasi Default

- `npm run lint`
- `node --test tests/*.test.js`
- `npm run vercel-build` jika menyentuh `api/**`, dashboard, Supabase handler, atau schema.

## Guardrails

- Jangan ubah `auth_info_baileys/`, `sessions/`, `.env`, `.env.vercel`, atau credential.
- Jangan bypass local database fallback saat Supabase tidak dikonfigurasi.
- Jangan mengubah schema tanpa memperbarui handler yang membaca atau menulis field terkait.
- Jangan membuat command RPG baru yang memutasi state langsung dari plugin. Logic state harus tinggal di `src/lib/rpg.js` atau service terkait.
- Jangan menghapus alias command lama tanpa alasan kompatibilitas yang eksplisit.
