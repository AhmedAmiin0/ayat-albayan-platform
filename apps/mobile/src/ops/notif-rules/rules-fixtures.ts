import type { NotificationEntryView, NotificationsOverview } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { catalogue, settings } from '../fixtures';

// GET /admin/notifications as a tagged phone sees it (v2: rule, approval, mode, reach), for the switch tests.

/** /auth/me with and without notifications.manage. */
export const MANAGER = { role: 'admin', permissions: ['settings.read', 'settings.write', 'notifications.manage'] };
export const READER = { role: 'admin', permissions: ['settings.read'] };

const withRule = (e: NotificationEntryView): NotificationEntryView => ({
  ...e,
  approval: e.templates.length > 0 ? 'all' : null,
  rule: {
    key: e.key,
    // The day-before reminder is off: switching it on is a family ON.
    enabled: e.key !== 'lesson_reminder_24h',
    channels: e.channels,
    timing: null,
    number_id: null,
    editable: !e.manual && !e.locked,
    optional_channels: [],
    updated_at: null,
    updated_by: null,
  },
});

/** lesson_join_link is held by the classroom and only partly approved. */
const tweak = (e: NotificationEntryView): NotificationEntryView =>
  e.key === 'lesson_join_link' ? { ...e, state: 'off', blocker: 'classroom_off', approval: 'some' } : e;

export const catalogueV2: NotificationsOverview = {
  ...catalogue,
  entries: catalogue.entries.map(withRule).map(tweak),
  mode: 'legacy',
  reach: { guardian: 214, teacher: 12, lead: 37 },
};

/** The same answer with one row held by a blocker this build does not know. */
export const withUnknownBlocker: NotificationsOverview = {
  ...catalogueV2,
  entries: catalogueV2.entries.map((e) =>
    e.key === 'renewal_due' ? ({ ...e, state: 'off', blocker: 'future_reason' } as unknown as NotificationEntryView) : e,
  ),
};

/** apiFetch for the catalogue tests: the overview, /auth/me, and the settings for anything else. */
export const answer =
  (overview: NotificationsOverview, me: unknown) =>
  async (path: string): Promise<unknown> => {
    if (path === '/admin/notifications') return overview;
    if (path === '/auth/me') return me;
    return settings;
  };

/** Presses an audience pill (its name carries the count), e.g. t.notificationCatalogue.audience.teacher. */
export const openAudience = async (label: string): Promise<void> => {
  await fireEvent.press(await screen.findByRole('tab', { name: new RegExp(`^${label}`) }));
};
