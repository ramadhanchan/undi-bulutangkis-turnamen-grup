# 07: Regenerate admin link + my events list

**What to build:** Close the two remaining organizer stories from the spec.

1. **Regenerate admin link** — expose the existing `regenerateAdminToken` helper through `POST /api/events/[id]/regenerate-token` (requires the current token) and a "Regenerate Admin Link" button on the admin page with confirmation. After regenerating, the browser replaces the URL with the new admin link and the saved-events entry is updated. The old link stops working immediately.
2. **My events list** — persist admin links in `localStorage` (`badminton:saved-events`) when an event is created. The home page lists saved events with their current phase, links to the public and admin pages, and a "Forget" action that removes the entry locally without deleting the event. Entries whose event no longer exists are flagged as deleted.

**Out of scope:** server-side user accounts, listing all events globally (admin links stay the credential), and deleting an event from the list.

**A completed slice is demoable:** create an event, see it in "My Events" on the home page, open its admin page, regenerate the link, and confirm the old admin URL is rejected while the new one works.

**Blocked by:** #06
