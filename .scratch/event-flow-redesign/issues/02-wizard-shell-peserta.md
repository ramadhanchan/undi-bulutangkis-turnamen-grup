# 02: Wizard shell + Peserta step

**What to build:** Halaman event publik dan halaman admin merender wizard 4 langkah yang sama (varian A): stepper horizontal, satu kartu langkah terpusat, satu aksi utama, copy Indonesia, dan update SSE. Langkah Peserta bekerja end-to-end untuk organisator: tambah tunggal, tempel massal, rename, hapus, dengan validasi langsung; publik read-only.

**Blocked by:** 01 (Snapshot event + flow model)

**Status:** ready-for-agent

- [ ] Halaman publik menampilkan wizard 4 langkah read-only; Admin Link menampilkan alur yang sama dengan kontrol edit.
- [ ] Stepper menampilkan Peserta, Undi Tim, Bagi Grup, dan Bagan dengan status selesai/aktif/terkunci; langkah depan tidak bisa dilompati.
- [ ] Organisator bisa menambah peserta, menempel daftar (trim, abaikan baris kosong, tolak duplikat case-insensitive), rename, dan hapus selama fase registration.
- [ ] Pesan validasi menjelaskan jumlah peserta harus genap, minimal 6, dan kasus 10 peserta dengan saran tambah 2 atau kurangi 2.
- [ ] Form registrasi publik dihapus; semua mutasi peserta memerlukan token admin yang valid.
- [ ] Alur menyegarkan data dari SSE setelah mutasi.
- [ ] Stepper mobile menampilkan keempat label tanpa terpotong.
- [ ] Test mencakup validasi peserta dan otorisasi API; typecheck/lint/test pass.
