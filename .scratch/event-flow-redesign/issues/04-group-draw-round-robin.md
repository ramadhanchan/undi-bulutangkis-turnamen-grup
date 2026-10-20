# 04: Group draw + odd round-robin domain

**What to build:** Group Draw membuat pratinjau dan konfirmasi pembagian acak yang seimbang ke Group berukuran 3–4 (target 4), dan Group Stage menjadwalkan round-robin yang benar bahkan untuk Group berisi 3 Team. Jumlah Team yang tidak valid ditolak dengan pesan yang bisa ditindaklanjuti.

**Blocked by:** 03 (Undi Tim step)

**Status:** ready-for-agent

- [ ] Pembagian Group memaksimalkan Group berisi 4 dan tidak pernah membuat Group kurang dari 3 atau lebih dari 4.
- [ ] Jumlah Team 3, 4, dan semua ≥6 kecuali 5 diterima; 1, 2, dan 5 ditolak dengan arahan tambah/kurangi Team.
- [ ] Group berisi 3 Team menghasilkan 3 Match round-robin dengan satu Team libur per ronde dan tanpa record Match melawan BYE.
- [ ] Group berisi 4 Team menghasilkan 6 Match.
- [ ] Pratinjau bersifat stateless; konfirmasi memvalidasi pembagian persis, menyimpan group number dan Match, lalu bertransisi ke `group_stage`.
- [ ] Test mencakup setiap jumlah Team valid/tidak valid dan output round-robin ganjil.
- [ ] `bun run typecheck`, `bun run lint`, dan `bun test` pass.
