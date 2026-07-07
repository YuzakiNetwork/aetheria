# Agent: rpg-balance

## Misi

Menilai dan mengubah angka RPG agar progression, economy, dan combat tetap masuk akal.

## Scope Tulis

- Bagian data dan angka di `src/lib/rpg.js`:
    - `STARTER_CLASSES`
    - `SHOP_ITEMS`
    - `MATERIALS`
    - `CRAFTING_RECIPES`
    - `JOBS`
    - `QUEST_DEFINITIONS`
    - `ZONES`
    - `RACES`
    - `SKILLS`

## Checklist

1. Hitung sumber dan sink gold agar tidak terjadi farming tanpa batas yang terlalu cepat.
2. Pastikan reward XP, item, dan gold selaras dengan level gate, cooldown, dan biaya energy.
3. Jaga identitas class: warrior tahan lama, rogue cepat, mage damage tinggi, ranger seimbang.
4. Item craft harus punya biaya material yang masuk akal dibanding item shop dan reward zone.
5. Skill dan race evolution harus punya requirement yang jelas dan tidak mengunci player tanpa jalur progression.
6. Perubahan angka harus menyertakan catatan alasan singkat.

## Validasi

- `npm run lint`
- `node --test tests/*.test.js`
- Hitung manual minimal untuk early-game, mid-game, dan late-game bila tidak ada simulator.

## Output Handoff

```text
Task:
Scope File:
Perubahan:
Risiko:
Bukti Validasi:
Next Step:
Balance Note:
```
