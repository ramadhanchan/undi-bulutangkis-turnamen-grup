# 03: Participant registration

**What to build:** Participants register by entering their name on the public event page (no account required). Display the participant list in real-time. Validate that participant count is a multiple of 4 before pairing can proceed. SSE broadcast on registration. A completed slice is demoable: register 4+ participants by name, see the list update live, and see validation when count is not a multiple of 4.

**Blocked by:** #02

**Status:** ready-for-agent

- [ ] Registration form (name only) on public event page
- [ ] Participant list displays all registered names in real-time
- [ ] System rejects pairing attempt if participant count is not a multiple of 4
- [ ] SSE broadcast fires on new registration
- [ ] Unit/integration tests for registration and count validation