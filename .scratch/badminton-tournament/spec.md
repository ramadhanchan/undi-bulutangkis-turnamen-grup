Status: ready-for-agent

# Spec: Aplikasi Turnamen Bulutangkis Ganda (Badminton Doubles Tournament)

## Problem Statement

Panitia event bulutangkis ganda (2 pemain per tim) antar teman/komunitas saat ini mengundi tim secara manual dengan kertas, menyusun jadwal, klasemen, dan bracket secara manual. Proses ini lambat, rawan kesalahan, dan peserta tidak bisa melihat hasil undian, jadwal, klasemen, maupun bracket secara real-time dari browser. Dibutuhkan website yang mengotomatisasi random pairing, penyusunan turnamen (group stage + knockout), input skor, klasemen, dan bracket dengan update real-time.

## Solution

Website multi-event berbasis Next.js + Bun + SQLite + SSE. Organisator membuat event, mendapat admin link rahasia. Peserta mendaftarkan nama. Sistem melakukan random pairing 2 pemain per tim (kelipatan 4 peserta). Organisator bisa re-shuffle atau manual swap sebelum group stage dimulai. Setelah group stage dimulai, sistem menyusun round-robin (4 tim/grup, 3 match/tim), klasemen dengan tiebreaker, lalu knockout single elimination (top 2 per grup) dengan byes jika bracket bukan power of 2. Semua update (skor, klasemen, bracket) disiarkan real-time via SSE ke browser peserta/penonton tanpa perlu refresh.

## User Stories

### Event Management

1. As an organizer, I want to create a new tournament event with a name, so that I can manage a specific badminton gathering.
2. As an organizer, I want to receive a unique admin link when I create an event, so that I can access and edit the event without creating an account.
3. As an organizer, I want to view all events I manage via their admin links, so that I can switch between events.
4. As an organizer, I want to delete an event with confirmation, so that I can clean up test or obsolete events.
5. As an organizer, I want to regenerate the admin link if it is lost or compromised, so that I can recover access.
6. As an organizer, I want to transition the event between phases manually (registration → pairing → group stage → knockout → finished), so that I control the pace of the tournament.
7. As an organizer, I want the knockout bracket to auto-generate from final group standings when I start the knockout phase, so that I don't have to seed manually.

### Registration

8. As a participant, I want to register by entering only my name, so that joining is frictionless.
9. As a participant, I want to see a list of registered participants, so that I know who else has joined.
10. As an organizer, I want to see the participant count, so that I know when we have enough for pairing (multiple of 4).
11. As an organizer, I want the system to reject pairing if participant count is not a multiple of 4, so that groups are always complete.
12. As a participant, I want to view the event page via a shareable URL, so that I can follow the tournament on my phone/browser.

### Random Pairing

13. As an organizer, I want the system to randomly pair participants into teams of 2, so that no manual drawing is needed.
14. As an organizer, I want to re-shuffle (re-randomize) all pairings before group stage starts, so that I can get a fairer distribution if the first draw feels off.
15. As an organizer, I want to manually swap players between teams before group stage starts, so that I can fine-tune pairings.
16. As an organizer, I want pairings to be locked once group stage begins, so that the tournament structure stays consistent.
17. As a participant, I want to see the pairing results in real-time, so that I know my teammate immediately.

### Group Stage

18. As an organizer, I want the system to generate a round-robin schedule (4 teams per group, 3 matches per team), so that every team plays every other team in their group.
19. As an organizer, I want to input match scores (best of 3 sets, 21 points, win by 2, cap 30), so that results are recorded.
20. As an organizer, I want to correct a previously entered score, so that input errors can be fixed.
21. As an organizer, I want to record a walkover (W.O.) as a 2-0 win (21-0, 21-0), so that no-shows are handled fairly.
22. As a participant, I want to see the live standings (ranking, points, point difference, sets won) per group, so that I know qualification status.
23. As a participant, I want standings to apply tiebreakers (head-to-head → point diff → sets won → random) when teams are tied on points, so that ranking is deterministic.
24. As a participant, I want to see which 2 teams per group qualify for knockout, so that I can track progression.

### Knockout Stage

25. As an organizer, I want the system to auto-generate the knockout bracket from final group standings with byes for top seeds when bracket size is not a power of 2, so that seeding is fair and automatic.
26. As an organizer, I want seeding based on group ranking with cross-pairing (group winners don't face each other in round 1), so that the bracket is balanced.
27. As an organizer, I want to input knockout match scores (best of 3 sets), so that results are recorded.
28. As a participant, I want to see the knockout bracket (tree) with match results, so that I can follow progression to the final.
29. As a participant, I want to see the champion when the final match is completed, so that the tournament conclusion is clear.

### Real-time

30. As a participant, I want pairing results to appear in real-time without refreshing, so that I see my team instantly.
31. As a participant, I want score updates to appear in real-time without refreshing, so that I follow matches live.
32. As a participant, I want standings to update in real-time as scores are entered, so that I track qualification live.
33. As a participant, I want the knockout bracket to update in real-time, so that I see progression as it happens.
34. As a viewer, I want to open the event URL on any browser and see all data without an account, so that access is frictionless.

### Out of Scope (for this spec)

35. As an organizer, I want to manage multiple events from a single dashboard login — out of scope; admin link per event is sufficient.

## Implementation Decisions

### Modules

- **Event module**: Create, read, update (phase transition), delete event. Generates admin link (UUID). Stores event state (registration/pairing/group/knockout/finished).
- **Participant module**: Register participant (name only). List participants per event. Validate count is multiple of 4 before pairing.
- **Pairing module**: Random shuffle participants into teams of 2. Re-shuffle (regenerate all). Manual swap players between teams. Lock after group stage starts.
- **Schedule module**: Generate round-robin matches per group (4 teams → 6 matches per group, 3 per team). Match ordering by round.
- **Scoring module**: Validate score (sets, points, win-by-2, cap 30). Record score. Correct score. Record walkover (2-0). Determine match winner.
- **Standings module**: Calculate group standings (points: win=2, loss=0 or win=3/loss=0 depending on set-based; TBD). Apply tiebreaker chain (head-to-head → point diff → sets won → random). Determine top 2 per group.
- **Bracket module**: Generate knockout bracket from qualified teams. Seed by group ranking with cross-pairing. Insert byes for non-power-of-2 bracket sizes. Advance winners through rounds.
- **Real-time module**: SSE endpoint per event. Broadcast on: participant registration, pairing changes, score updates, state transitions, bracket updates.

### Key Interfaces

- Event state machine: `registration → pairing → group_stage → knockout → finished`. Transitions are manual (organizer-triggered) except knockout bracket auto-generates on transition to knockout.
- Admin authentication: UUID admin link in URL path (e.g., `/event/[id]/admin/[token]`). All mutating endpoints require valid admin token for that event.
- Public (read) endpoints: no auth. SSE endpoint: no auth (read-only stream).
- Database: SQLite (single file). Tables: events, participants, teams, matches, (no users table).
- SSE: one channel per event ID. Clients connect to `/api/events/[id]/stream`.

### Technical Clarifications

- Pairing is purely random per event (no cross-event history).
- Score format: best of 3 sets. Each set: first to 21, win by 2, cap at 30.
- Walkover: opponent wins 2-0 (21-0, 21-0).
- Standings points: win = 2 points, loss = 0 points (simple). Tiebreaker: head-to-head result → point difference (points scored minus points conceded across all group matches) → sets won → random draw.
- Knockout seeding: group winners (1st) seeded 1-4, runners-up (2nd) seeded 5-8. Cross-pairing: 1A vs 2D, 1B vs 2C, 1C vs 2B, 1D vs 2A (or equivalent). Byes: if 6 teams (3 groups), top 2 seeds get bye to semifinal.
- Match scheduling: ordered by round, no time slots or court assignments.
- Real-time via SSE (not WebSocket). SSE is simpler for one-way server→client broadcast and works with Bun/Next.js.
- No deployment target; runs via `bun run dev` locally.

### Schema (conceptual)

- `events`: id, name, admin_token, state, created_at, updated_at
- `participants`: id, event_id, name, created_at
- `teams`: id, event_id, player1_id, player2_id, group_number (nullable until group stage)
- `matches`: id, event_id, team1_id, team2_id, phase (group/knockout), group_number, round, set1_t1, set1_t2, set2_t1, set2_t2, set3_t1, set3_t2, winner_team_id, is_walkover, played_at

## Testing Decisions

### What makes a good test

- Test external behavior, not implementation details. A good test describes what the user/system experiences (e.g., "given 4 participants, pairing produces 2 teams of 2" or "given group matches, standings rank correctly with tiebreaker").
- Do not test internal function names or call sequences. Test inputs → outputs.
- Domain logic tests should be pure (no DB, no HTTP, no mocks).
- API tests should use a real SQLite database (test instance), not mocks, to catch schema/query bugs.

### Modules to test

- **Seam 1 (Unit):** Pairing generator, round-robin schedule generator, standings calculator, tiebreaker logic, knockout bracket generator (byes + seeding), score validator, match winner calculator.
- **Seam 2 (Integration):** Event CRUD (create returns admin token, delete requires token), participant registration (reject if not multiple of 4 at pairing time), pairing (random, reshuffle, manual swap, lock after group stage), score submission (valid/invalid, correction, walkover), state transitions, standings endpoint, bracket endpoint, SSE broadcast on updates.

### Prior art

- No existing tests in codebase (greenfield). Testing framework: Bun's built-in test runner (`bun test`) for unit tests. For API integration tests, use Bun test with a test SQLite database (in-memory or temp file).

## Out of Scope

- User accounts / authentication system (admin link replaces this).
- Deployment / hosting (local dev only).
- Mobile native app (responsive web only).
- Payment / registration fee.
- Multi-language / i18n.
- Historical statistics across events.
- Court/time slot scheduling.
- Double elimination or other tournament formats (only group stage + single elimination knockout).
- Real-time chat or notifications.
- Export/print functionality.

## Further Notes

- This is a greenfield project. No existing codebase to integrate with.
- The app is for community/friends use; traffic is low. SQLite is sufficient.
- SSE is chosen over WebSocket for simplicity (one-way broadcast, no bidirectional need).
- The admin link approach trades security for simplicity — acceptable for community events where trust is high.
- Future enhancement (not in scope): add optional skill level for balanced pairing, but current spec keeps pairing purely random per user decision.