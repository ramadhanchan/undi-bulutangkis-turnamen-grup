# 05: Group stage + scoring + standings

**What to build:** Generate round-robin schedule (4 teams per group, 3 matches per team). Input match scores (best of 3 sets, BWF: 21 points, win by 2, cap 30). Score correction after match completion. Walkover recording (2-0 win, 21-0 21-0). Calculate group standings with tiebreaker chain (head-to-head → point difference → sets won → random). Determine top 2 per group for knockout qualification. SSE broadcast on score and standings updates. A completed slice is demoable: play through a group's matches, enter/correct scores, record a walkover, and see standings update live with correct tiebreaker resolution.

**Blocked by:** #04

**Status:** ready-for-agent

- [ ] Round-robin schedule generated: 4 teams per group, 6 matches per group, 3 per team
- [ ] Score input form: best of 3 sets, 21 points, win by 2, cap 30 (BWF standard)
- [ ] Score correction allowed after match completion (admin, with confirmation)
- [ ] Walkover recorded as 2-0 win (21-0, 21-0) for opponent
- [ ] Standings calculated: points (win=2, loss=0), point difference, sets won
- [ ] Tiebreaker applied in order: head-to-head → point difference → sets won → random
- [ ] Top 2 per group marked as qualified for knockout
- [ ] Standings display on public event page, updating in real-time via SSE
- [ ] Unit tests for schedule generator, score validator, standings calculator, tiebreaker logic
- [ ] Integration tests for score submission, correction, and walkover