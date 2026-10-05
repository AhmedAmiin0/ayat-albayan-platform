import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderApp, resetApp } from '@/test/app-router';
import { maryam, SUN_17 } from './fixtures';
import { bookingBackend } from './flow-backend';
import { slot } from './fixtures';
import { walkToConfirm } from './test-utils';

beforeEach(resetApp);

const trialButton = () =>
  screen.getByRole('button', { name: t.booking.trialFor.replace('{name}', 'هدى سالم') });

async function openLead(backend: ReturnType<typeof bookingBackend>['backend']) {
  const app = await renderApp({ url: '/inbox', backend });
  await fireEvent.press(await screen.findByRole('tab', { name: t.nav.leads }));
  await fireEvent.press(await screen.findByRole('button', { name: /هدى سالم/ }));
  expect(app.pathname()).toBe('/inbox/a1');
  expect(await screen.findByRole('header', { name: 'هدى سالم' })).toBeTruthy();
  return app;
}

test('lead → «احجز تجريبية» → wizard → POST /booking → back: the lead detail shows trial_booked', async () => {
  const { backend } = bookingBackend();
  const app = await openLead(backend);
  expect(screen.getAllByText(t.enums.leadStatus.new).length).toBeGreaterThan(0);

  await fireEvent.press(trialButton());
  expect(app.pathname()).toBe('/inbox/book');
  expect(await screen.findByRole('header', { name: t.booking.trialTitle })).toBeTruthy();
  await walkToConfirm();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.submit }));
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();

  expect(backend.sent('POST /booking')).toHaveLength(1);
  expect(backend.sent('POST /booking')[0]?.body).toMatchObject({
    kind: 'trial',
    teacherId: maryam.id,
    startsAt: SUN_17,
    package: 'trial',
    leadId: 'a1',
    newStudent: { name: 'يوسف', status: 'trial' },
    guardian: { phone_e164: '+966552147730', source: 'facebook_ad' },
  });

  await fireEvent.press(screen.getByRole('button', { name: t.inbox.subscription.backToChat }));
  expect(app.pathname()).toBe('/inbox/a1');
  // The chip moved at once (and the list refetch agrees): «حجز حلقة تجريبية» is the status now,
  // so the changer no longer offers it as a move.
  expect(await screen.findByText(t.enums.leadStatus.trial_booked)).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.enums.leadStatus.trial_booked })).toBeNull();
});

test('a 409 clash keeps the wizard on its step; another slot then books', async () => {
  const { backend, slots } = bookingBackend();
  backend.failOnce(
    'POST /booking',
    new ApiError(409, {
      code: 'conflict',
      message: 'conflict',
      conflicts: [{ kind: 'teacher_busy', startsAt: SUN_17, endsAt: '2026-10-04T14:45:00.000Z' }],
    }),
  );
  const app = await openLead(backend);
  await fireEvent.press(trialButton());
  await walkToConfirm();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.submit }));
  expect(await screen.findByText(t.booking.conflictTitle)).toBeTruthy();
  expect(
    screen.getByText('المعلم/ة مشغول/ة بحلقة أخرى في هذا الموعد (الأحد 4 أكتوبر 17:00)'),
  ).toBeTruthy();
  expect(app.pathname()).toBe('/inbox/book');
  expect(screen.queryByText(t.booking.booked)).toBeNull();

  // Meanwhile Sunday went; Monday 19:00 is free.
  slots.slots = [slot(SUN_17, true), slot('2026-10-05T16:00:00.000Z')];
  await fireEvent.press(screen.getByRole('button', { name: t.booking.changeSlot }));
  await fireEvent.press(await screen.findByRole('button', { name: /^19:00/ }));
  await fireEvent.press(await screen.findByRole('button', { name: t.booking.submit }));
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  const posts = backend.sent('POST /booking');
  expect(posts).toHaveLength(2);
  const [first, second] = posts.map((p) => p.body as { clientRequestId: string; startsAt: string });
  expect(second?.clientRequestId).toBe(first?.clientRequestId);
  expect(second?.startsAt).toBe('2026-10-05T16:00:00.000Z');
});
