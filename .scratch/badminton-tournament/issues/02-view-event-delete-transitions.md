# 02: View event (public) + delete + phase transitions

**What to build:** Public event page showing event info, participant list, teams, match schedule, standings, and bracket. Event deletion by admin (with confirmation). Manual phase transitions (registration → pairing → group_stage → knockout → finished) triggered by admin. SSE broadcast on state changes and deletions. A completed slice is demoable: view an event publicly, delete it as admin, transition between phases.

**Blocked by:** #01

**Status:** ready-for-agent

- [ ] Public event page renders event name, phase, and all sections (participants, teams, matches, standings, bracket) — empty states handled
- [ ] Admin can delete an event with confirmation prompt
- [ ] Admin can transition event phase (registration → pairing → group_stage → knockout → finished)
- [ ] Phase transition to knockout auto-generates knockout bracket from final group standings
- [ ] SSE broadcast fires on deletion and phase transition
- [ ] Unit/integration tests for view, delete, and transition logic