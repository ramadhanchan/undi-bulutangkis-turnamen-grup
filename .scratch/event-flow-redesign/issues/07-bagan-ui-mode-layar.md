# 07: Bagan step UI + skor knockout + mode layar

**What to build:** Langkah Bagan menampilkan pohon Bracket lengkap sampai Final dengan slot TBD, penanda pemenang, dan input skor per Match; organisator bisa mencatat Walkover dan koreksi yang diizinkan domain. Mode layar menampilkan Bracket besar tanpa kontrol admin.

**Blocked by:** 05 (Bagi Grup step UI + skor grup), 06 (Bracket domain prefactor)

**Status:** ready-for-agent

- [ ] Langkah Bagan menampilkan semua ronde sampai Final, pemenang ditandai, label Bye, dan slot TBD.
- [ ] Desktop menampilkan pohon horizontal yang bisa di-scroll; mobile menumpuk Match per ronde.
- [ ] Form skor memberi label Team dan Set; Walkover memilih pemenang; koreksi hanya ditawarkan saat diizinkan.
- [ ] Banner juara muncul saat Final selesai dan Event tampil finished.
- [ ] Mode layar menyembunyikan kontrol admin, memperbesar Bracket, dan bisa ditutup.
- [ ] Tampilan publik read-only; update SSE mengisi slot tanpa refresh.
- [ ] `bun run typecheck`, `bun run lint`, dan `bun test` pass.
