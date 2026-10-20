# 08: Home + admin link recovery

**What to build:** Halaman depan menjadi pintu masuk yang jelas: buat Event dan kelola event tersimpan lengkap dengan fase, buka publik, buka admin, dan copy Admin Link. Lupakan Event meminta konfirmasi yang menjelaskan bahwa Admin Link adalah satu-satunya akses tersimpan. Event yang sudah dihapus ditandai tidak tersedia.

**Blocked by:** 02 (Wizard shell + Peserta step)

**Status:** ready-for-agent

- [ ] Buat Event tetap mengembalikan dan menyimpan Admin Link.
- [ ] Event Saya menampilkan nama, fase, dan aksi Buka, Kelola, Copy Admin Link, Lupakan.
- [ ] Kelola selalu membuka Admin Link tersimpan; copy memberi umpan balik yang terlihat.
- [ ] Lupakan meminta konfirmasi dan menjelaskan hilangnya satu-satunya Admin Link tersimpan.
- [ ] Event yang sudah dihapus ditandai tidak tersedia tanpa merusak seluruh daftar.
- [ ] `bun run typecheck`, `bun run lint`, dan `bun test` pass.
