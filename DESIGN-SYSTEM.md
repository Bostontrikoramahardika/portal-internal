# BTM Design System — Navy Corporate

> **Versi:** 1.0 | **Warna Utama:** `#003d79` | **Font:** Plus Jakarta Sans (Local)
> **Style:** Rounded · Elegant · Professional · PAMA-Inspired

---

## 🎨 WARNA

| Token | HEX | Penggunaan |
|-------|-----|------------|
| `navy` | `#003d79` | Header, tombol utama, aksen |
| `navyDark` | `#002a57` | Hover header, tombol hover |
| `navyLight` | `#0056b3` | Link, aksen terang |
| `navy50` | `#e8f0f8` | Background icon, badge |
| `bg` | `#f4f7fa` | Background halaman |
| `card` | `#ffffff` | Background card |
| `text` | `#1a2332` | Teks utama |
| `textSub` | `#5a6a7e` | Teks sekunder |
| `textMuted` | `#8896a7` | Teks samar, placeholder |
| `border` | `#e2e8f0` | Border card, divider |
| `success` | `#0d7a3e` | Status berhasil, hadir |
| `warning` | `#b45309` | Status pending, warning |
| `danger` | `#b91c1c` | Status error, tolak, BS |

---

## 📐 SPACING & PADDING

| Konteks | Class | Keterangan |
|---------|-------|------------|
| Wrapper halaman | `p-2 sm:p-3 lg:p-4` | Mobile tight, desktop longgar |
| Card internal | `p-3 sm:p-4` | Konten dalam card |
| Antar section | `space-y-3` | Gap vertikal |
| Antar elemen | `gap-2 sm:gap-3` | Gap horizontal/vertikal |

**ATURAN:**
- ❌ JANGAN pakai `p-8`, `p-10`, `p-12` (terlalu besar di HP)
- ✅ Maksimal wrapper = `p-4` (hanya di `lg:`)
- ✅ Default mobile = `p-2`

---

## 🧩 KOMPONEN

### `<AppLayout>` — Wrapper Utama (WAJIB)
```tsx
<AppLayout title="Judul" badge="HR" backUrl="/dashboard">
  {/* konten */}
</AppLayout>
```
Otomatis include: Header navy + Back button + Footer + Padding

### `<PageHeader>` — Header
```tsx
<PageHeader title="Absensi" badge="HR" backUrl="/dashboard" />
```

### `<Card>` — Kartu
```tsx
<Card padding="md" hover> Konten </Card>
```
Props: `padding` (sm/md/lg), `hover` (boolean), `onClick`

### `<Button>` — Tombol
```tsx
<Button variant="primary" size="md">Simpan</Button>
```
Variants: `primary` (navy), `secondary`, `danger`, `ghost`
Sizes: `sm`, `md`, `lg`

### `<Badge>` — Label Status
```tsx
<Badge variant="pending">Pending</Badge>
```
Variants: `pending`, `done`, `urgent`, `info`, `navy`

### `<Icon>` — Icon Wrapper
```tsx
<Icon size={40} bg="#e8f0f8" color="#003d79">
  <svg>...</svg>
</Icon>
```

### `<AppFooter>` — Footer
Otomatis tampil di `<AppLayout>`. Tidak perlu dipanggil manual.
Teks: *BTM Mobile APP V1.7.0* · *Powered By rck_Production*

---

## 📱 BOTTOM NAVIGATION (HP)

| Menu | Icon | Keterangan |
|------|------|------------|
| Absensi | Clock | Menu utama |
| Pengajuan | Document | Form pengajuan |
| **Scan** | Camera | **Center button** (floating) |
| Saya | User | Profile |
| More | Dots | Leader, HR, Safety, Admin, Plant, Site, HO |

---

## ✅ DO & ❌ DON'T

| ✅ DO | ❌ DON'T |
|-------|----------|
| Pakai `<AppLayout>` di setiap halaman | Buat header/footer manual |
| Pakai warna dari `design-system.ts` | Hardcode warna random |
| Pakai SVG line icon | Pakai emoji sebagai icon |
| Padding `p-2` / `p-3` di mobile | Padding `p-8` / `p-12` |
| Font weight 700-800 untuk heading | Font weight 400 untuk heading |
| Border radius 14-20px | Border radius 4px (terlalu kotak) |
| Shadow halus `rgba(0,61,121,0.06)` | Shadow tebal hitam |

---

## 🚀 CARA BIKIN HALAMAN BARU

1. Copy `app/lib/page-template.tsx`
2. Paste ke `app/dashboard/nama-fitur/page.tsx`
3. Ganti judul, badge, backUrl
4. Isi konten pakai `<Card>`, `<Button>`, `<Badge>`
5. Selesai! Otomatis konsisten dengan semua halaman lain.
