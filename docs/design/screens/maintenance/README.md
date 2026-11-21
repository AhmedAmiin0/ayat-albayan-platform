# «تحت الصيانة»: the maintenance cover (owner 2026-11-21)

Two covers over the whole app, on both websites and both phone apps:

- **planned** (`planned-*`): the admin switch `maintenance_mode` is on. Admins are not covered.
- **outage** (`outage-*`): the API stopped answering twice, 2 s apart, while the device itself is
  online. Everyone is covered, admins too. An offline device draws no cover.

A lesson room is never covered. The app stays mounted under the cover (inert), so unsaved drafts
survive.

**Method.** The family web dev server ran against a faked API (Playwright route stubs:
`/settings/public` answered `maintenance_mode: true` for planned, and was aborted for outage, while
the faked Supabase host answered). Each screen was shot at 390 and 1280, in light and dark, in
Arabic and English (`<kind>-<width>-<scheme>-<lang>.png`). The staff web app draws the same
`MaintenanceScreen`. In each shot the page itself was checked for: no sideways overflow, the app
under the cover inert, the button at least 44 px high, and no raw i18n keys.

The phone apps use the startup screen's frame (`packages/mobile-kit/src/ui/startup/MaintenanceScreen.tsx`):
the emblem (still while planned, breathing while the API is away), the title and body, the gold
dots for an outage, and the startup «retry» button. They were checked with jest-expo, and no
phone shots were taken.
