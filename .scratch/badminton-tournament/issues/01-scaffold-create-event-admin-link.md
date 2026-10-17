# 01: Scaffold + create event + admin link

**What to build:** Set up the Next.js (App Router) + Bun + SQLite + SSE project. Define the database schema (events, participants, teams, matches). Implement event creation: organizer enters event name, system generates a unique admin link (UUID). UI form to create an event. SSE endpoint per event with basic broadcast mechanism. A completed slice is demoable: create an event and receive an admin link.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Next.js project runs with `bun run dev`
- [ ] SQLite database file created with schema (events, participants, teams, matches)
- [ ] Create event form (name input) produces an event with a UUID admin link
- [ ] Admin link is displayed once after creation for the organizer to save
- [ ] SSE endpoint exists per event ID (`/api/events/[id]/stream`)
- [ ] Basic SSE broadcast fires on event creation
- [ ] Unit/integration tests for event creation and admin link generation