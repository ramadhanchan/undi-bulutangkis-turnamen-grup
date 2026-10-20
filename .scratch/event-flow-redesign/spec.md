Status: ready-for-agent

# Spec: Event Flow Redesign — Alur Event 4 Langkah

## Problem Statement

Organisator kehilangan gambaran "saya sekarang di langkah mana". Halaman event publik menampilkan lima section sekaligus (Peserta, Tim, Match, Standings, Bracket) dengan banyak empty state, sementara semua aksi edit tersembunyi di halaman admin yang terpisah. Transisi fase berupa satu tombol generik (`Transition to group_stage`) tanpa penjelasan apa yang akan dibuat. Hubungan antara undian tim → pembagian grup → bagan knockout tidak terbaca sebagai satu urutan. Bagan knockout sendiri bukan bagan, melainkan daftar match, dan match knockout muncul dua kali di halaman publik. Aturan jumlah peserta juga baru terlihat saat transisi gagal.

Akibatnya organisator tidak tahu langkah berikutnya, peserta/penonton tidak bisa mengikuti progres, dan kesalahan input baru ketahuan di akhir.

## Solution

Satu alur linear empat langkah di halaman event:

1. **Peserta** — organisator menambah, mengubah, menghapus, atau menempel daftar peserta.
2. **Undi Tim** — acak pasangan, re-shuffle, tukar pemain, lalu kunci tim.
3. **Bagi Grup** — undi grup acak berukuran 3–4 tim (target 4), re-shuffle, kunci, lalu mainkan match grup dan lihat klasemen.
4. **Bagan** — bagan penuh sampai Final dengan slot TBD, input skor knockout, juara, dan mode layar.

Admin Link membuka alur yang sama dengan kontrol edit; URL publik hanya-baca. Setiap langkah punya satu aksi utama yang juga memindahkan fase, dengan ringkasan + konfirmasi sebelum dieksekusi. Peserta hanya diinput organisator. Copy UI berbahasa Indonesia.

## User Stories

### Alur dan Navigasi

1. As an organizer, I want to see the four steps immediately after creating an event, so that I know what to do next.
2. As an organizer, I want each step to show its status (selesai / aktif / terkunci), so that I always know where I am.
3. As an organizer, I want completed steps to stay viewable, so that I can check past decisions.
4. As an organizer, I want future steps to be locked until their prerequisites are met, so that I cannot skip a required step.
5. As an organizer, I want every primary action to show a summary before it runs, so that I understand what will be created or locked.
6. As an organizer, I want actions and phase transitions to happen in one click per step, so that I do not have to hunt for a generic transition button.
7. As an organizer, I want the same flow when I open the Admin Link, so that I do not learn two different interfaces.
8. As a viewer, I want the same flow read-only, so that I can follow the event without accidentally changing it.
9. As an organizer, I want to copy the public and Admin links, so that sharing is easy.
10. As an organizer, I want a confirmation before regenerating the Admin Link, so that I understand old links stop working.
11. As an organizer, I want to delete an event only after an explicit confirmation, so that I do not lose data by accident.

### Peserta

12. As an organizer, I want to add participants one by one, so that I can fix a single entry.
13. As an organizer, I want to paste a list of names (one per line), so that entering a full roster is fast.
14. As an organizer, I want pasted names to be trimmed and empty lines ignored, so that formatting does not break the input.
15. As an organizer, I want duplicate names rejected with a per-line message, so that the roster stays unambiguous.
16. As an organizer, I want to rename or remove a participant before teams are drawn, so that I can correct mistakes.
17. As an organizer, I want live validation of the roster (even count, minimum 6, 10 not allowed), so that I discover problems before drawing teams.
18. As an organizer, I want a clear explanation of why 10 participants is invalid, so that I know to add two or remove two.
19. As a viewer, I want to see the participant list and count, so that I know who is playing.
20. As a participant, I do not want a public registration form, so that the organizer controls the roster.

### Undi Tim

21. As an organizer, I want to generate random teams of two, so that pairing is automatic.
22. As an organizer, I want to re-shuffle all teams before locking, so that I can redo an unlucky draw.
23. As an organizer, I want to swap two players between teams before locking, so that I can fine-tune pairings.
24. As an organizer, I want team editing to be unavailable after the group stage starts, so that the tournament structure stays consistent.
25. As an organizer, I want a confirmation when locking teams, so that I know re-shuffle and swap will no longer be available.
26. As a viewer, I want to see the teams and who plays with whom, so that I know my teammate.

### Bagi Grup

27. As an organizer, I want to draw groups randomly, so that the draw is fair.
28. As an organizer, I want groups of 3–4 teams with 4 as the target, so that small rosters still work.
29. As an organizer, I want to re-shuffle the group draw before locking, so that I can redo it if needed.
30. As an organizer, I want a clear error when the team count cannot be split into groups of 3–4, so that I can fix the roster.
31. As an organizer, I want the group draw and its match schedule to appear after I confirm, so that I can start play immediately.
32. As an organizer, I want a 3-team group to play a complete round-robin without a fake "BYE" match, so that standings stay clean.
33. As a viewer, I want to see each group's teams, matches, and standings, so that I can follow my group.
34. As a viewer, I want the top two teams per group to be marked as qualified, so that I understand who advances.

### Knockout dan Bagan

35. As an organizer, I want to start the knockout only when every group match has a winner, so that the bracket is based on complete standings.
36. As an organizer, I want a list of unfinished group matches when I try to start early, so that I know what is missing.
37. As an organizer, I want the full bracket to the Final to exist from the start with TBD slots, so that I can see the path ahead.
38. As an organizer, I want byes to be shown as a team advancing without a match, so that the bracket stays honest.
39. As an organizer, I want a preview bracket from the current group standings before the knockout starts, so that I can see the likely path.
40. As an organizer, I want to enter and correct knockout scores, so that results are accurate.
41. As an organizer, I want the event to show a champion and become finished when the Final is decided, so that the tournament closes cleanly.
42. As a viewer, I want winners highlighted and TBD slots filled automatically, so that I can follow progression.
43. As a viewer on a phone, I want the bracket stacked by round, so that it is readable on a narrow screen.
44. As a viewer on a projector, I want a large, uncluttered bracket view, so that the room can follow the tournament.
45. As a viewer, I want live updates without refreshing, so that I see results as they are entered.

### Skor

46. As an organizer, I want each set input to be labeled by team and set number, so that I cannot confuse the columns.
47. As an organizer, I want a walkover to let me choose which team advances, so that either side's no-show can be recorded.
48. As an organizer, I want validation errors explained in plain language, so that I know what to fix.
49. As an organizer, I want to correct a group match until the knockout starts, so that standings can be fixed.
50. As an organizer, I want to correct a knockout match only while the dependent next-round match has not been decided, so that the bracket cannot become inconsistent.

### Halaman Depan

51. As an organizer, I want a list of my events with their current phase, so that I can resume one.
52. As an organizer, I want a "Kelola" action that always opens the Admin Link from local storage, so that I do not lose access.
53. As an organizer, I want a "Lupakan" action that explains it will remove my only stored Admin Link, so that I do not delete it by accident.
54. As an organizer, I want a deleted event to be marked as unavailable instead of breaking the list, so that stale entries are understandable.

## Implementation Decisions

### Model Alur

- Satu modul alur murni (tanpa DB/HTTP) menurunkan dari snapshot event: langkah aktif, status tiap langkah, aksi yang diizinkan, dan pesan validasi. UI merender dari modul ini; tidak ada logika langkah yang tersebar di komponen.
- Pemetaan langkah ke fase:
  - **Peserta** ↔ `registration`.
  - **Undi Tim** ↔ `pairing` selama tim belum dikunci.
  - **Bagi Grup** ↔ `pairing` setelah tim dikunci, sampai `group_stage` dikonfirmasi.
  - **Bagan** ↔ `knockout` dan `finished`.
- Langkah aktif diturunkan dari fase, flag `teams_locked`, dan keberadaan data (mis. tim sudah ada tetapi `teams_locked` masih false berarti berada di Undi Tim; setelah terkunci berarti Bagi Grup). Langkah setelahnya terkunci.
- Aksi utama tiap langkah memindahkan fase atau menetapkan penguncian langkah secara implisit. Tidak ada tombol transisi generik di UI. Server tetap memvalidasi transisi dan menolak lompatan fase.
- Setiap aksi yang mengubah struktur menampilkan ringkasan sebelum dieksekusi, mis. "8 tim → 2 grup (4 + 4), 12 match grup".

### Peserta

- Input peserta hanya lewat Admin Link; setiap mutasi memerlukan token admin. Form registrasi publik dihapus.
- Input mendukung tambah satu per satu dan tempel massal (satu nama per baris). Nama di-trim; baris kosong diabaikan.
- Duplikat dicek case-insensitive dan trimmed, baik terhadap input massal maupun peserta yang sudah ada. Duplikat ditolak dengan pesan per baris; pengguna bisa menambahkan pembeda nama.
- Rename dan hapus tersedia selama fase `registration` dan belum ada tim.
- Validasi roster ditampilkan langsung di langkah Peserta:
  - jumlah peserta harus genap;
  - minimal 6 peserta (3 tim);
  - 10 peserta ditolak karena menjadi 5 tim yang tidak bisa dibagi menjadi grup 3–4;
  - pesan 10 peserta menyarankan menambah 2 (jadi 12) atau mengurangi 2 (jadi 8).
- Validasi yang sama ditegakkan di server saat membuat tim; UI tidak boleh menjadi satu-satunya penjaga.

### Undi Tim

- Generate tim, re-shuffle, dan swap memakai perilaku domain yang ada; re-shuffle membuat tim baru dan menghapus tim lama.
- Generate tim pertama kali memindahkan fase `registration` → `pairing`.
- Swap memilih satu pemain dari tim A dan satu dari tim B; UI menampilkan hasil setelah server mengonfirmasi.
- Edit tim (re-shuffle/swap) dinonaktifkan setelah organisator masuk ke langkah Bagi Grup dan setelah fase `group_stage`.
- Kunci Tim adalah aksi server yang menetapkan `teams_locked` pada event dan membuka langkah Bagi Grup. Setelah terkunci, re-shuffle dan swap ditolak server. Fase tetap `pairing` sampai grup dikonfirmasi.

### Bagi Grup dan Fase Grup

- Group Draw adalah undian acak: tim di-shuffle, lalu dibagi menjadi grup seimbang.
- Aturan pembagian: ukuran grup 3 atau 4, memaksimalkan jumlah grup berisi 4. Jumlah tim yang valid adalah 3, 4, dan semua jumlah ≥ 6 kecuali 5. Jumlah tim 1, 2, dan 5 ditolak dengan pesan yang bisa ditindaklanjuti.
- Undian grup memiliki dua tahap: **preview** (menghasilkan pembagian acak tanpa menyimpan) dan **confirm** (menyimpan pembagian + membuat match grup + transisi ke `group_stage`). Re-shuffle mengulang preview.
- Confirm memvalidasi bahwa setiap tim muncul tepat sekali, ukuran tiap grup 3–4, dan jumlah grup 4 dimaksimalkan. Pembagian yang tidak valid ditolak.
- Round-robin harus mendukung jumlah tim ganjil. Grup berisi 3 tim memainkan 3 match (satu tim libur per ronde); tidak ada record match melawan BYE.
- Fase grup menampilkan grup, match, dan Standings dalam langkah yang sama. Tiebreaker yang ada tidak berubah.
- Top 2 per grup lolos. Grup 3 tim tetap meloloskan 2 tim.
- Tombol mulai Knockout hanya aktif jika semua match grup sudah punya pemenang (termasuk Walkover). Jika belum, tampilkan daftar match yang belum selesai.
- Sebelum Knockout dimulai, tampilkan preview Bagan dari Standings saat ini dengan slot TBD. Preview ini tidak disimpan.

### Knockout, Bye, dan Bagan

- Saat Knockout dimulai, sistem membuat **seluruh kerangka bagan** untuk semua ronde sampai Final, bukan membuat ronde secara lazy. Slot tim yang belum diketahui bernilai TBD.
- Ukuran bagan adalah pangkat 2 terkecil yang ≥ jumlah tim qualified. Jumlah ronde = log2(ukuran bagan).
- Setiap match knockout punya `position` (slot) yang deterministik. Ronde 1 memiliki `ukuran bagan / 2` slot; pemenang slot `i` mengisi slot `floor(i / 2)` di ronde berikutnya (team1 jika `i` genap, team2 jika ganjil).
- Bye direpresentasikan sebagai slot ronde 1 berisi satu tim dengan pemenang sudah ditetapkan; tidak ada match yang perlu dimainkan. Tim dengan bye langsung mengisi slot ronde berikutnya.
- Seeding dan Cross-Pairing yang ada dipertahankan. Bye diberikan ke seed teratas.
- Ronde diberi label sampai Final. Nama ronde mengikuti jumlah tim yang tersisa (mis. Semifinal, Final), dengan fallback "Ronde N".
- Juara ditentukan saat Final punya pemenang. Fase otomatis menjadi `finished`; banner juara tampil di langkah Bagan.
- Bagan adalah komponen visual pohon, bukan daftar match. Desktop: kolom per ronde dengan konektor dan scroll horizontal. Mobile: stacked per ronde. Setiap node menampilkan nama tim, skor per set, pemenang, badge W.O., atau TBD.
- Match knockout tidak lagi ditampilkan ganda di daftar match umum. Daftar match grup hanya berisi match grup.
- Mode layar menyembunyikan kontrol admin, memperbesar teks, dan bisa dibuka langsung lewat URL flag agar bisa dipakai di proyektor.

### Skor

- Form skor menampilkan dua kolom tim dengan nama tim sebagai label, serta input Set 1, Set 2, Set 3 per tim.
- Walkover meminta organisator memilih tim yang menang. Skor disimpan sebagai 21–0, 21–0 dari sudut pandang pemenang.
- Validasi domain (best of 3, 21 poin, win by 2, cap 30) tetap menjadi sumber kebenaran. UI menampilkan pesan error dan tidak mengubah input menjadi 0 secara diam-diam.
- Koreksi match grup diizinkan selama fase belum menjadi `knockout`.
- Koreksi match knockout diizinkan selama match ronde berikutnya yang bergantung padanya belum punya pemenang. Setelah itu, koreksi ditolak oleh server.
- Perubahan skor memicu perhitungan ulang Standings dan pengisian slot bagan berikutnya.

### Admin Link, Halaman Depan, dan Keamanan

- URL Admin Link yang ada dipertahankan. Halaman admin merender komponen alur yang sama dengan publik, dengan `canEdit = true`.
- URL publik read-only. Semua mutasi memerlukan token admin yang valid, termasuk tambah/ubah/hapus peserta, undian, konfirmasi grup, mulai knockout, skor, regenerate token, dan hapus event.
- Halaman depan menampilkan form buat event dan daftar event tersimpan dari local storage, lengkap dengan fase dan aksi: Buka, Kelola, Copy Admin Link, Lupakan.
- "Lupakan" meminta konfirmasi dan menjelaskan bahwa Admin Link satu-satunya yang tersimpan akan hilang.
- Regenerate Admin Link meminta konfirmasi, menjelaskan link lama tidak berlaku, memperbarui local storage, dan menampilkan link baru untuk di-copy.
- Event yang sudah dihapus ditandai tidak tersedia di daftar; tidak membuat seluruh daftar gagal.
- Tidak ada akun, cookie sesi, atau sistem login.

### API dan Data

- Endpoint transisi generik dihapus dari UI dan diganti aksi eksplisit per langkah: buat tim, kunci tim, undian grup (preview/confirm), dan mulai knockout. Fase `finished` ditetapkan otomatis saat Final selesai.
- Mutasi peserta mendukung tambah tunggal, tambah massal, rename, dan hapus.
- Snapshot event mengembalikan data yang dibutuhkan alur: fase, peserta, tim + grup, match grup, match knockout dengan `round` dan `position`, Standings, preview/isi Bagan, dan juara.
- Bagan read model dihitung dari match knockout dan boleh dihasilkan di server agar UI tidak menduplikasi logika pohon.
- Skema `events` ditambah flag `teams_locked` (default false), diset saat Kunci Tim. Skema `matches` ditambah kolom `position` (integer, nullable untuk match grup). Untuk match knockout, kombinasi event + ronde + position unik.
- Semua mutasi menyiarkan event SSE yang sudah ada. Admin juga menyegarkan data setelah aksinya; tidak perlu channel baru.
- Tidak ada perubahan pada aturan skor, poin, atau tiebreaker.

### UI dan Copy

- Seluruh copy UI berbahasa Indonesia: **Peserta**, **Undi Tim**, **Bagi Grup**, **Bagan**, **Klasemen**. Istilah domain di kode dan dokumen tetap bahasa Inggris.
- Label fase yang tampil: Daftar, Undi Tim, Fase Grup, Knockout, Selesai.
- Desain memakai design token yang sudah ada; tidak ada warna mentah. Primitive UI yang ada dipakai ulang.
- Komponen baru yang dibutuhkan: stepper, dialog konfirmasi, toast/copy feedback, bracket tree, score form, participant bulk input, presentation mode.
- Mobile-first. Stepper ringkas di layar sempit; bagan stacked per ronde. Desktop memakai layout lebar dengan bagan horizontal.
- Form dan aksi dapat dioperasikan dengan keyboard, punya label, dan status fokus yang jelas.
- Tidak memakai framework i18n; bahasa Indonesia adalah satu-satunya bahasa UI.

## Testing Decisions

### What makes a good test

- Test perilaku eksternal: input → output yang dialami pengguna/sistem, bukan nama fungsi internal atau urutan pemanggilan.
- Untuk aturan domain, gunakan input/output murni. Untuk modul yang menyentuh DB, gunakan SQLite in-memory seperti test yang sudah ada.
- Uji invarian untuk hasil acak (jumlah tim, setiap peserta tepat sekali, ukuran grup 3–4) daripada menegaskan hasil shuffle tertentu.
- Uji jalur gagal: roster tidak valid, jumlah tim 5, mulai knockout terlalu awal, koreksi skor setelah bagan bergantung, dan mutasi tanpa token admin.

### Seams

- **Seam utama (sudah ada):** modul domain dengan `bun test` + SQLite in-memory — peserta, pairing, jadwal/grup, standings, bracket, scoring.
- **Seam baru (murni):** modul alur yang menurunkan langkah, status, aksi yang diizinkan, dan pesan validasi dari snapshot event. Tidak menyentuh DB maupun UI.
- **Seam integrasi (diusulkan):** snapshot event lewat handler API dengan DB in-memory, satu skenario vertikal per ticket (buat event → peserta → undian → grup → knockout → final). Ini menutup kontrak API dan otorisasi token.
- Tidak menambah framework UI/E2E pada spec ini. Perilaku visual diverifikasi manual dengan checklist mobile, desktop, read-only, dan mode layar.

### Modules to test

- Validasi peserta: genap, minimal 6, 10 ditolak, duplikat case-insensitive, bulk input.
- Pairing: jumlah tim, semua peserta terpakai, re-shuffle, swap, lock setelah fase grup.
- Pembagian grup: semua jumlah tim valid, penolakan 5 tim, ukuran 3–4, prioritas 4, setiap tim tepat sekali.
- Round-robin: grup 3 tim menghasilkan 3 match tanpa BYE; grup 4 tim menghasilkan 6 match.
- Bracket: kerangka penuh semua ronde, posisi deterministik, bye, pengisian slot, juara, larangan koreksi setelah ronde bergantung.
- Modul alur: langkah aktif dan status untuk setiap kombinasi fase + data; aksi yang diizinkan; pesan validasi.
- API: token admin wajib untuk semua mutasi; transisi implisit; validasi awal knockout; error yang bisa ditindaklanjuti.

### Prior art

- Test domain yang sudah ada memakai `bun test`, SQLite in-memory, dan `resetDb()` per test. Pola ini dipakai ulang untuk aturan grup dan bracket yang berubah.

## Out of Scope

- Registrasi peserta publik (dihapus; diganti input organisator).
- Drag-and-drop manual untuk memindahkan tim antar grup.
- Akun, login, atau sesi pengguna.
- Multi-bahasa / framework i18n.
- Double elimination atau format turnamen lain.
- Penjadwalan lapangan dan slot waktu.
- Pembayaran/biaya pendaftaran.
- Notifikasi, chat, atau email.
- Export/print bagan.
- Statistik lintas event.
- Pemulihan Admin Link setelah local storage dibersihkan tanpa link yang masih valid.
- Perubahan aturan skor (21 poin, win by 2, cap 30), poin klasemen, atau tiebreaker.
- Framework test UI/E2E.

## Further Notes

- **Prototype decision:** Varian **A — Wizard terfokus** dipilih. Acuan visual: stepper horizontal, satu kartu langkah terpusat, satu aksi utama di bawah kartu, bagan di dalam kartu, mode layar overlay, dan stepper mobile 4 kolom tanpa connector. Implementasi nyata ditulis ulang dari spec; route prototype beserta varian B/C dan switcher sudah dihapus setelah wizard produksi selesai.
- Spec ini menggantikan keputusan spec sebelumnya yang bertentangan: registrasi publik, grup wajib 4 tim, transisi fase manual, halaman admin terpisah, dan copy UI bahasa Inggris.
- Ticket 01–07 pada effort sebelumnya sudah selesai; ini effort baru.
- Kandidat ADR: (1) peserta hanya diinput organisator, (2) kerangka bagan penuh dengan kolom `position`, (3) transisi fase implisit per langkah. Tawarkan ADR hanya jika keputusan ini terbukti sulit dibalik dan mengejutkan tanpa konteks.
