# 01: Snapshot event + flow model

**What to build:** Event snapshot menyediakan semua data yang dibutuhkan alur, dan modul alur murni menentukan langkah aktif, status tiap langkah, aksi yang diizinkan, serta pesan validasi. Termasuk perubahan skema yang dibutuhkan ticket berikutnya: `teams_locked` pada Event dan `position` pada Match knockout. Tidak ada perubahan UI.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Snapshot event mengembalikan phase, participants, teams + group, match grup, match knockout dengan round + position, Standings, Bracket, champion, dan `teams_locked`.
- [ ] Modul alur menurunkan langkah aktif dan status selesai/aktif/terkunci untuk Peserta, Undi Tim, Bagi Grup, dan Bagan dari snapshot.
- [ ] Modul alur melaporkan validasi roster: jumlah ganjil, kurang dari 6, dan 10 peserta ditolak dengan pesan yang bisa ditindaklanjuti.
- [ ] Skema baru aman untuk database lokal yang sudah ada: `teams_locked` default false, `position` nullable untuk match grup, dan posisi knockout unik per event + round.
- [ ] `bun run typecheck`, `bun run lint`, dan `bun test` pass.
