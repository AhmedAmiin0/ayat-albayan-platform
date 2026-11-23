import { draft } from '@/booking/testing/fixtures';
import { toBookingRequest } from '@/booking/trial/lib/booking-body/booking-body';

const REQ = '0d7c7a4e-58d6-4e3e-9a3c-1f2d3e4f5a6b';

test('«وقت آخر»: a start outside the teacher hours sends outsideHours: true', () => {
  expect(toBookingRequest(draft({ outsideHours: true }), { requestId: REQ })).toMatchObject({
    outsideHours: true,
  });
});

test('no flag for a normal free time, picked inside or reset', () => {
  expect(toBookingRequest(draft(), { requestId: REQ })).not.toHaveProperty('outsideHours');
  expect(toBookingRequest(draft({ outsideHours: false }), { requestId: REQ })).not.toHaveProperty(
    'outsideHours',
  );
});

test('a package never sends it, even after an outside trial pick', () => {
  const pkg = draft({ outsideHours: true, kind: 'package', pkg: '8' });
  const body = toBookingRequest(pkg, { requestId: REQ });
  expect(body).toMatchObject({ kind: 'package' });
  expect(body).not.toHaveProperty('outsideHours');
});
