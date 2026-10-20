# 06: Bracket domain prefactor

**What to build:** Memulai Knockout membuat kerangka Bracket lengkap sampai Final dengan position deterministik dan Bye. Pemenang mengisi slot ronde berikutnya, juara diturunkan dari Final, dan koreksi ditolak setelah Match ronde berikutnya yang bergantung padanya sudah diputuskan.

**Blocked by:** 04 (Group draw + odd round-robin domain)

**Status:** ready-for-agent

- [ ] Ukuran Bracket adalah pangkat 2 terkecil yang ≥ jumlah Team qualified; semua ronde sampai Final langsung dibuat.
- [ ] Setiap Match knockout punya position deterministik; pemenang position `i` mengisi position `floor(i / 2)` di ronde berikutnya.
- [ ] Bye direpresentasikan sebagai Team yang lolos tanpa Match yang dimainkan.
- [ ] Input skor mengisi slot ronde berikutnya; pemenang Final menetapkan champion dan memindahkan Event ke `finished`.
- [ ] Koreksi skor knockout hanya diizinkan selama Match ronde berikutnya yang bergantung padanya belum punya pemenang; selain itu ditolak.
- [ ] Test mencakup bentuk kerangka, Bye, pengisian slot, champion, transisi finished, dan aturan koreksi.
- [ ] `bun run typecheck`, `bun run lint`, dan `bun test` pass.
