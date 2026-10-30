# Paket aturan AI Coding Agent

Paket ini berisi aturan desain UI biru modern dan TypeScript untuk digunakan bersama Google Antigravity dan Codex.

## Struktur file

```text
project-root/
├── AGENTS.md                         # File utama yang sudah ada
├── AGENTS-ADDENDUM.md                # Bagian yang perlu ditambahkan ke AGENTS.md
├── .agents/
│   └── rules/
│       ├── design-quality.md         # Aturan kualitas UI; otomatis aktif di Antigravity
│       └── typescript.md             # Aturan TypeScript/TSX; aktif saat file cocok di Antigravity
└── docs/
    └── design-system.md              # Palet biru, tipografi, spacing, komponen, CSS tokens
```

## Cara memasang

1. Salin folder `.agents` dan `docs` ke root repository/proyek.
2. Jangan menimpa `AGENTS.md` yang sudah ada.
3. Buka `AGENTS-ADDENDUM.md`, lalu salin bagian instruksinya ke bagian bawah `AGENTS.md` yang sudah ada. Ini membuat Codex tahu bahwa ia wajib membuka tiga dokumen aturan tersebut.
4. Di Antigravity, file `.agents/rules/*.md` dikenali otomatis. `design-quality.md` memakai `always_on`; `typescript.md` memakai `glob` untuk file TypeScript/TSX.
5. Mulai sesi agent baru setelah menambahkan atau mengubah instruksi agar aturan dimuat pada awal sesi.

## Catatan

- `docs/design-system.md` adalah referensi visual utama, bukan rule trigger tersendiri. Aturan `design-quality.md` memerintahkan agent membacanya sebelum pekerjaan UI.
- Codex menggunakan `AGENTS.md` sebagai pintu masuk instruksi. Karena itu, jangan lupa menambahkan bagian dari `AGENTS-ADDENDUM.md`.
- Jika proyek sudah memiliki design tokens, font, komponen, atau standar TypeScript, agent harus menginspeksi dan mengintegrasikannya—bukan menimpa semuanya secara membabi buta.
