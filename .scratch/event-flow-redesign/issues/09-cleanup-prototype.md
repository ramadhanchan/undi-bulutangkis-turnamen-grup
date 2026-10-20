# 09: Cleanup prototype

**What to build:** Setelah wizard nyata berjalan, hapus route prototype throwaway beserta varian yang kalah dan switcher, sehingga main branch hanya berisi alur produksi.

**Blocked by:** 07 (Bagan step UI + skor knockout + mode layar)

**Status:** ready-for-agent

- [ ] Route `/event/prototype` tidak ada lagi.
- [ ] Varian B/C dan switcher prototype dihapus.
- [ ] Keputusan prototype (varian A) tetap tercatat di spec.
- [ ] `bun run typecheck`, `bun run lint`, dan `bun test` pass.
