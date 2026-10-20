# Design System — Badminton Doubles Tournament

Design system untuk aplikasi pengelola event bulutangkis ganda, diturunkan dari
[PRD/spec `.scratch/badminton-tournament/spec.md`](../../.scratch/badminton-tournament/spec.md).

---

## 1. Prinsip

| Prinsip | Artinya |
|---------|---------|
| **Token dulu** | Tidak ada hex, rgb, atau px hardcoded di komponen. Semua nilai visual datang dari token. |
| **Semantic over primitive** | Komponen memakai `--semantic-*` atau `--component-*`, tidak pernah `--primitive-*` langsung. |
| **Satu sumber kebenaran** | `src/design/tokens.json` adalah source of truth. CSS di-generate, tidak diedit manual. |
| **Domain-aware** | Ada token khusus domain (phase, champion, walkover, qualified) — bukan hanya warna umum. |

---

## 2. Arsitektur Token

Tiga layer, mengikuti `references/token-architecture.md` skill design-system:

```
┌──────────────────────────────────────────────┐
│  Component    --component-button-primary-bg   │  Per-komponen, override-able
├──────────────────────────────────────────────┤
│  Semantic     --semantic-color-primary        │  Meaning: "aksen utama"
├──────────────────────────────────────────────┤
│  Primitive   --primitive-color-teal-600      │  Raw value, tanpa makna
└──────────────────────────────────────────────┘
```

Referensi antar layer pakai `{layer.path}` di JSON, di-resolve jadi `var(--runtime-name)`
supaya rantai nilainya tetap hidup di CSS (override dark mode tetap jalan).

### Naming convention

```
--{layer}-{category}-{item}-{variant}-{state}

--primitive-color-teal-600          # layer-category-item
--semantic-color-primary-hover      # layer-category-item-state
--component-button-primary-hover-background
--component-card-padding-compact
```

### Lokasi file

| File | Isi |
|------|-----|
| `src/design/tokens.json` | Source of truth (primitive + semantic + component + dark) |
| `src/design/tokens.css` | **Generated.** Jangan diedit manual. |
| `src/app/globals.css` | Base layer, `@theme inline` bridge ke Tailwind, class komponen |
| `src/components/ui.tsx` | Primitif UI (Badge, PhaseBadge, Section, dll) |

### Workflow

```bash
bun run tokens:build   # regenerate src/design/tokens.css dari tokens.json
bun run design:check   # validasi: token stale, var() unresolved, class missing, hex hardcoded
```

`design:check` dipakai sebagai guard — jalankan sebelum commit.

---

## 3. Warna

### Primitive palette

6 ramp warna, dipilih supaya muted dan warm (bukan neon/gradient AI-generic):

| Ramp | Peran | 50 | 500 | 600 | 700 | 900 |
|------|-------|----|-----|-----|-----|-----|
| **teal** | Primary — CTA utama, aksen brand | `#F0F6F5` | `#3A766F` | `#2A5E58` | `#234C47` | `#1B3330` |
| **stone** | Netral — surface, border, teks | `#FAFAF9` | `#78716C` | `#57534E` | `#44403C` | `#1C1917` |
| **green** | Success — menang, lolos, valid | `#F1F8F2` | `#3D844E` | `#2E6A3C` | `#275431` | `#1B3723` |
| **amber** | Warning — walkover, champion | `#FDF8ED` | `#C9861F` | `#A96A16` | `#8A5315` | `#5C3617` |
| **red** | Danger — hapus event, error | `#FEF2F2` | `#E34545` | `#CE2B2B` | `#AA2222` | `#721D1D` |
| **sky** | Info — registration, info | `#F0F6FB` | `#3579A5` | `#27608A` | `#224E70` | `#1C344A` |
| **violet** | Pairing (reserved) | `#F6F4FB` | `#765FB4` | `#614C9B` | `#4F3F7E` | `#352C52` |

> Violet dipakai khusus untuk phase `pairing` — lihat section Phase di bawah.

### Semantic layer

| Token | Nilai | Dipakai untuk |
|-------|-------|---------------|
| `--semantic-color-background` | stone-50 | Background halaman |
| `--semantic-color-surface` | white | Card, input, tabel |
| `--semantic-color-surface-muted` | stone-100 | Background subtle (badge, alert, code block) |
| `--semantic-color-foreground` | stone-900 | Teks utama |
| `--semantic-color-muted-foreground` | stone-500 | Teks sekunder, label |
| `--semantic-color-border` | stone-200 | Border card, tabel |
| `--semantic-color-border-strong` | stone-300 | Border input, button outline |
| `--semantic-color-primary` | teal-600 | Aksi utama |
| `--semantic-color-success` | green-600 | Menang, lolos, lolos ke knockout |
| `--semantic-color-warning` | amber-600 | Walkover, champion |
| `--semantic-color-danger` | red-600 | Hapus event, error |
| `--semantic-color-info` | sky-600 | Info umum |
| `--semantic-color-ring` | teal-500 | Focus ring |

Token `-subtle` (mis. `success-subtle`) memakai `color-mix()` 12% terhadap surface,
jadi otomatis nyambung ke dark mode tanpa perlu nilai terpisah per theme.

### Phase tokens (domain-specific)

Setiap phase punya warna sendiri supaya peserta bisa tahu status tanpa baca teks:

| Phase | Token | Warna |
|-------|-------|-------|
| `registration` | `--semantic-color-phase-registration` | sky-700 |
| `pairing` | `--semantic-color-phase-pairing` | violet-700 |
| `group_stage` | `--semantic-color-phase-group-stage` | teal-700 |
| `knockout` | `--semantic-color-phase-knockout` | amber-700 |
| `finished` | `--semantic-color-phase-finished` | stone-600 |

### Champion

| Token | Nilai |
|-------|-------|
| `--semantic-color-champion` | amber-700 |
| `--semantic-color-champion-subtle` | color-mix 14% |
| `--semantic-color-champion-foreground` | amber-700 |

---

## 4. Spacing

Skala 4px base, di `primitive.space`. Sub-layer (`0-5`, `1-5`, `2-5`, `3-5`) untuk
penyesuaian halus.

| Token | Nilai | Dipakai untuk |
|-------|-------|---------------|
| `--semantic-space-page-x` | 1rem | Padding horizontal halaman |
| `--semantic-space-page-y` | 1.5rem | Padding vertical halaman |
| `--semantic-space-section` | 2rem | Jarak antar section besar |
| `--semantic-space-section-sm` | 1.5rem | Jarak antar section |
| `--semantic-space-component` | 0.75rem | Padding dalam component |
| `--semantic-space-component-sm` | 0.5rem | Jarak antar elemen kecil |
| `--semantic-space-component-lg` | 1rem | Padding card besar |
| `--semantic-space-gap` | 0.5rem | Gap default flex/grid |

Tailwind mapping: `px-page-x`, `py-page-y`, `mb-section-sm`, `p-component`,
`gap-component-sm`, `space-y-component-lg`, dan seterusnya.

---

## 5. Tipografi

Font: **Geist Sans** (UI) + **Geist Mono** (token admin, angka skor, code block).
Diotas oleh `next/font` di `src/app/layout.tsx` via `--font-geist-sans` / `--font-geist-mono`.

| Semantic token | Ukuran | Pemakaian |
|----------------|--------|-----------|
| `--semantic-font-size-display` | 1.5rem | Judul halaman |
| `--semantic-font-size-heading` | 1.125rem | Judul section |
| `--semantic-font-size-heading-sm` | 1rem | Sub-judul |
| `--semantic-font-size-body` | 1rem | Body |
| `--semantic-font-size-body-sm` | 0.875rem | Body padat, tabel |
| `--semantic-font-size-label` | 0.875rem | Label form |
| `--semantic-font-size-caption` | 0.75rem | Caption, badge, helper text |
| `--semantic-font-size-score` | 1.125rem | Skor match |

Weight: `regular` 400, `medium` 500, `semibold` 600, `bold` 700.

Tailwind mapping: `text-display`, `text-heading`, `text-body-sm`, `text-caption`, `text-score`.

---

## 6. Shape & Elevation

| Token | Nilai | Pemakaian |
|-------|-------|-----------|
| `--semantic-radius-control` | 0.375rem | Button, input, badge padat |
| `--semantic-radius-card` | 0.5rem | Card, alert |
| `--semantic-radius-badge` | 9999px | Badge, phase badge (pill) |
| `--semantic-shadow-card` | 0 1px 2px rgb(0 0 0 / 0.05) | Card |
| `--semantic-shadow-card-hover` | 0 1px 3px rgb(0 0 0 / 0.08) | Card hover |
| `--semantic-shadow-overlay` | 0 20px 25px rgb(0 0 0 / 0.1) | Overlay |

Tailwind mapping: `rounded-control`, `rounded-card`, `shadow-card`.

---

## 7. Komponen

Semua class komponen ada di `src/app/globals.css` (`@layer components`).

### Button

| Variant | Class | Pemakaian |
|---------|-------|-----------|
| Primary | `.btn .btn-primary` | Aksi utama: Create Event, Register, Save Score |
| Secondary | `.btn .btn-secondary` | Aksi sekunder: View Event |
| Outline | `.btn .btn-outline` | Aksi tersier |
| Ghost | `.btn .btn-ghost` | Aksi subtle |
| Danger | `.btn .btn-danger` | Hapus Event |
| Success | `.btn .btn-success` | Transition ke phase berikutnya |
| Warning | `.btn .btn-warning` | Walkover |

| Size | Class | Height | Font |
|------|-------|--------|------|
| sm | `.btn-sm` | 2rem | 0.75rem |
| default | — | 2.5rem | 0.875rem |
| lg | `.btn-lg` | 3rem | 1rem |

**States:** `default → hover → active`, `focus-visible` (ring 2px + offset 2px),
`disabled` (opacity 0.5, pointer-events none).

### Input

Class `.input` — tinggi 2.5rem, border stone-300, radius control.
State: `default`, `hover`, `focus` (border primary + ring 25%), `error`
(`[aria-invalid="true"]` → border danger), `disabled`.

### Card

Class `.card` — surface, border, radius card, shadow card, padding 1rem.
Gunakan `!p-component` untuk versi padat (match row).

### Badge

Class `.badge` — pill, caption size, medium weight.
Tone lewat mapping di `src/components/ui.tsx`: `neutral`, `success`, `warning`,
`danger`, `info`, `primary`.

### Alert

Class `.alert` — surface-muted, border, radius card, padding component.
Untuk pesan error, pakai `.alert .bg-danger-subtle .text-danger-subtle-foreground`.

### Table

Class `.table` — header muted, row border, hover surface-muted.
Kolom angka pakai `.num` (right-aligned + tabular-nums).
Baris yang lolos ke knockout: `<tr data-qualified="true">` → background success-subtle.

---

## 8. Primitif React (`src/components/ui.tsx`)

| Export | Fungsi |
|--------|--------|
| `PhaseBadge` | Badge dengan warna per phase |
| `Badge` | Badge dengan tone semantik |
| `ChampionBanner` | Banner juara (amber subtle) |
| `EmptyState` | Teks "belum ada data" |
| `Section` | Section dengan judul + count |
| `ErrorMessage` | Pesan error (role="alert") |
| `phaseLabel` | `group_stage` → `Fase Grup` |

> **Penting:** class Tailwind yang dibangun dinamis (`bg-phase-${x}`) **tidak** bisa
> di-detect scanner Tailwind. Karena itu `PHASE_CLASSES` ditulis sebagai map statis
> di `src/components/ui.tsx`. Kalau tambah phase baru, tambahkan juga ke map itu.

---

## 9. Dark Mode

Toggle otomatis via `prefers-color-scheme: dark`. Override ada di layer semantic
(`src/design/tokens.json` → `dark.semantic`), di-generate ke:

```css
@media (prefers-color-scheme: dark) { :root:not(.light) { ... } }
.dark { ... }
```

Untuk force light mode, tambahkan class `light` ke `<html>`.
Primitif (teal-600 dst.) **tidak** berubah — hanya alias semantic yang di-remap ke
shade lebih terang supaya kontras tetap aman di atas surface gelap.

---

## 10. Motion

| Token | Nilai |
|-------|-------|
| `--semantic-duration-fast` | 150ms |
| `--semantic-duration-normal` | 200ms |
| `--semantic-duration-slow` | 300ms |

Easing: `ease-in-out` untuk warna, `ease-out` untuk transform.
Transisi dipakai di button dan input (color + border-color).

---

## 11. Aksesibilitas

- Fokus selalu terlihat: ring 2px `var(--semantic-color-ring)` + offset 2px.
- Rasio kontras minimum 4.5:1 untuk teks normal, 3:1 untuk UI component.
- Status tidak pernah mengandalkan warna saja — champion pakai label teks,
  tim lolos pakai teks "Lolos", walkover punya badge "W.O.".
- Error message pakai `role="alert"`.
- Tombol disabled pakai atribut `disabled` (bukan cuma `aria-disabled`).

---

## 12. Adding a token

1. Tambah di `src/design/tokens.json` pada layer yang tepat.
2. Kalau semantic, tambahkan juga override dark-nya di `dark.semantic`.
3. Kalau mau dipakai sebagai utility Tailwind, tambahkan ke `TAILWIND_THEME`
   di `scripts/build-tokens.mjs`.
4. `bun run tokens:build`
5. `bun run design:check`

Jangan pernah edit `src/design/tokens.css` langsung — file itu di-generate.
