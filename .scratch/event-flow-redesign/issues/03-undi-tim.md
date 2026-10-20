# 03: Undi Tim step

**What to build:** Organisator menghasilkan Team acak, re-shuffle, menukar Participant antar Team, lalu mengunci undian. Setelah terkunci, server menolak perubahan Team. Wizard langkah Undi Tim menampilkan kartu Team dan aksinya.

**Blocked by:** 02 (Wizard shell + Peserta step)

**Status:** ready-for-agent

- [ ] Generate Team pertama kali memindahkan Event dari `registration` ke `pairing`.
- [ ] Re-shuffle mengganti seluruh Team; swap menukar dua Participant antar Team.
- [ ] Kunci Tim menyimpan `teams_locked`; permintaan re-shuffle/swap setelahnya ditolak server.
- [ ] UI langkah Undi Tim menampilkan semua Team, status pilihan saat swap, dan ringkasan konfirmasi sebelum lock.
- [ ] Publik melihat Team read-only.
- [ ] Test mencakup generate, re-shuffle, swap, lock, dan penolakan setelah lock.
- [ ] `bun run typecheck`, `bun run lint`, dan `bun test` pass.
