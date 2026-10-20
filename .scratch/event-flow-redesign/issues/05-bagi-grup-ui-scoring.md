# 05: Bagi Grup step UI + skor grup

**What to build:** Langkah Bagi Grup menampilkan Group, Standings, dan Match. Organisator bisa input skor, mencatat Walkover dengan pemenang pilihan, dan mengoreksi skor sampai Knockout dimulai. Mulai Knockout diblokir sampai semua Match grup punya pemenang.

**Blocked by:** 04 (Group draw + odd round-robin domain)

**Status:** ready-for-agent

- [ ] Langkah Bagi Grup menampilkan setiap Group beserta Standings dan daftar Match; Team yang qualified ditandai.
- [ ] Form skor memberi label Team dan Set dengan jelas; skor tidak valid menampilkan pesan domain tanpa mengubah input menjadi 0 secara diam-diam.
- [ ] Walkover mengizinkan organisator memilih salah satu Team sebagai pemenang dan menyimpan 21–0, 21–0 dari sudut pandang pemenang.
- [ ] Skor Match grup bisa dikoreksi selama Event masih di `group_stage`.
- [ ] Mulai Knockout menampilkan daftar Match yang belum selesai dan tetap nonaktif sampai semua Match grup punya pemenang.
- [ ] Publik melihat Group, Match, Standings, dan Team qualified secara read-only.
- [ ] Test mencakup scoring, walkover winner, koreksi, dan gate mulai Knockout.
- [ ] `bun run typecheck`, `bun run lint`, dan `bun test` pass.
