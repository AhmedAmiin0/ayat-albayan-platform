import { createBody, rescheduleBody } from './create-body';
import { fromPhone } from './invitee-draft';

const phone = fromPhone('+201000000101');
const slot = { date: '2026-10-20', hour: 17, minute: 15, durationMin: 45 };

test('an instant meeting sends only what was filled, plus its request id', () => {
  expect(createBody({ title: '  ', slot: null, invitees: [], requestId: 'r1' }, 'Asia/Riyadh')).toEqual({ clientRequestId: 'r1' });
});

test('a scheduled one sends startsAt in UTC from the viewer zone, the length and the invitees', () => {
  const invitees = phone ? [phone] : [];
  expect(createBody({ title: ' لقاء ', slot, invitees, requestId: 'r2' }, 'Africa/Cairo')).toEqual({
    title: 'لقاء',
    startsAt: '2026-10-20T14:15:00.000Z',
    durationMin: 45,
    invitees: [{ kind: 'phone', phone: '+201000000101' }],
    clientRequestId: 'r2',
  });
});

test('a reschedule sends the new start and length', () => {
  expect(rescheduleBody(slot, 'Asia/Riyadh')).toEqual({ startsAt: '2026-10-20T14:15:00.000Z', durationMin: 45 });
});
