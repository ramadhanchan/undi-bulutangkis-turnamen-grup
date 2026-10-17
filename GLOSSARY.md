# Badminton Doubles Tournament

Website untuk pengelolaan event bulutangkis ganda (2 pemain per tim) antar teman/komunitas. Mencakup registrasi peserta, random pairing, group stage (round-robin), knockout (single elimination), input skor, klasemen, dan bracket real-time via browser.

## Language

**Event**:
Satu turnamen bulutangkis ganda yang dikelola oleh satu organisator. Memiliki fase (registration → pairing → group stage → knockout → finished), URL publik, dan admin link rahasia.
_Avoid_: Tournament, Turnamen (sebagai nama entity — "turnamen" boleh dipakai sebagai kata umum)

**Participant**:
Orang yang mendaftarkan nama untuk ikut event. Hanya menyimpan nama, tanpa akun.
_Avoid_: Player, Pemain (terlalu spesifik ke posisi dalam tim)

**Team**:
Pasangan 2 participant yang bermain bersama dalam satu event. Dibentuk secara acak saat fase pairing.
_Avoid_: Pair, Pasangan (sebagai nama entity)

**Group**:
Kumpulan 4 team yang saling bertanding di group stage (round-robin).
_Avoid_: Pool, Grup (sebagai nama entity — "grup" boleh dipakai umum)

**Group Stage**:
Babak penyisihan di mana setiap team dalam satu grup bertemu semua team lain (round-robin, 3 match per team). Top 2 per grup lolos ke knockout.
_Avoid_: Babak Penyisihan (sebagai nama entity)

**Knockout**:
Babak gugur (single elimination) yang dimulai dari qualified teams (top 2 per grup). Match best of 3 set.
_Avoid_: Babak Gugur (sebagai nama entity)

**Match**:
Satu pertandingan antara 2 team, terdiri dari maksimal 3 set. Bisa berupa group stage match atau knockout match.
_Avoid_: Game, Pertandingan (sebagai nama entity)

**Set**:
Satu unit permainan dalam match. First to 21 poin, win by 2, cap 30 (standar BWF).
_Avoid_: Game (sebagai nama entity)

**Standings**:
Klasemen per grup yang menampilkan ranking, poin, point difference, dan sets won. Di-update real-time.
_Avoid_: Leaderboard, Klasemen (sebagai nama entity)

**Bracket**:
Pohon (tree) knockout yang menampilkan pairing, hasil, dan progresi menuju final.
_Avoid_: Draw, Bagan (sebagai nama entity)

**Admin Link**:
Tautan rahasia (UUID) yang diberikan saat event dibuat, memberikan akses edit (input skor, transisi fase, dll.) tanpa akun.
_Avoid_: Admin Token, Secret URL

**Walkover (W.O.)**:
Kemenangan otomatis 2-0 (21-0, 21-0) ketika lawan tidak hadir (no-show).
_Avoid_: Forfeit

**Bye**:
Tim yang langsung lolos ke round berikutnya tanpa bertanding, digunakan ketika jumlah tim di knockout bukan power of 2.
_Avoid_: -

**Seeding**:
Penentuan posisi tim di bracket knockout berdasarkan ranking grup, dengan cross-pairing agar juara grup tidak bertemu di round pertama.
_Avoid_: Draw

**Tiebreaker**:
Aturan pemecah seri ketika 2 tim punya poin sama di grup: 1) head-to-head, 2) point difference, 3) sets won, 4) random.
_Avoid_: -

**Phase**:
Tahap event: registration → pairing → group_stage → knockout → finished. Transisi manual oleh organisator.
_Avoid_: Stage, Status

**Round-Robin**:
Format di mana setiap team dalam grup bertemu semua team lain (3 match per team di grup 4 tim).
_Avoid_: -

**Re-shuffle**:
Acak ulang semua pairing sebelum group stage dimulai.
_Avoid_: Re-randomize, Re-draw

**Cross-Pairing**:
Penempatan bracket knockout sehingga juara grup dari grup berbeda bertemu (1A vs 2D, 1B vs 2C, dst.).
_Avoid_: -