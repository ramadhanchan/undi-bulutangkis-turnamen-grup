# 06: Knockout bracket

**What to build:** Auto-generate knockout bracket from final group standings when transitioning to knockout phase. Seed by group ranking with cross-pairing (group winners don't face each other in round 1). Insert byes for top seeds when bracket size is not a power of 2 (e.g., 6 teams from 3 groups). Input knockout match scores (best of 3 sets). Display bracket tree with results. Show champion when final completes. SSE broadcast on bracket updates. A completed slice is demoable: transition to knockout, see auto-generated bracket with byes, enter scores through to final, and see champion displayed.

**Blocked by:** #05

**Status:** ready-for-agent

- [ ] Bracket auto-generates from top 2 per group on transition to knockout phase
- [ ] Seeding by group ranking with cross-pairing (1A vs 2D, 1B vs 2C, etc.)
- [ ] Byes inserted for top seeds when bracket size is not a power of 2
- [ ] Knockout match scores input (best of 3 sets, BWF standard)
- [ ] Bracket tree displays on public event page with match results
- [ ] Champion displayed when final match completes
- [ ] SSE broadcast fires on bracket/score updates
- [ ] Unit tests for bracket generator (seeding, byes, round progression)
- [ ] Integration tests for knockout score submission and bracket rendering