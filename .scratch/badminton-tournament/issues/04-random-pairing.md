# 04: Random pairing

**What to build:** Randomly pair participants into teams of 2. Re-shuffle (re-randomize all pairings) before group stage. Manual swap of players between teams before group stage. Lock pairings once group stage begins (no edits after). Display pairing results in real-time. SSE broadcast on pairing changes. A completed slice is demoable: pair 8 participants into 4 teams, reshuffle, swap two players, and see results live.

**Blocked by:** #03

**Status:** ready-for-agent

- [ ] Random pairing generates teams of 2 from registered participants
- [ ] Re-shuffle button re-randomizes all pairings (admin only, before group stage)
- [ ] Manual swap allows admin to move a player between teams (before group stage)
- [ ] Pairings are locked (no edit) once event phase is group_stage or later
- [ ] Pairing results display on public event page in real-time
- [ ] SSE broadcast fires on pairing changes
- [ ] Unit tests for pairing generator (random shuffle into pairs)