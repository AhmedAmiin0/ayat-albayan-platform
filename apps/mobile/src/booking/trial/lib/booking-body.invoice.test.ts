import { toBookingRequest } from './booking-body';
import { draft, UPLOADED } from '../../testing/fixtures';
import { kindPatch } from './package-choice';

const REQ = '99999999-9999-4999-8999-999999999999';
const paid = draft({ pkg: '8', invoice: UPLOADED });

test('a package sends its kind and the uploaded invoice by path (the file itself never rides along)', () => {
  expect(toBookingRequest(paid, { requestId: REQ })).toMatchObject({
    kind: 'package',
    package: '8',
    invoice: { source: 'upload', path: UPLOADED.source === 'upload' ? UPLOADED.path : '' },
  });
  expect(JSON.stringify(toBookingRequest(paid, { requestId: REQ }))).not.toContain('file:///');
});

test('an invoice picked from the chat goes by its message id: the API copies it', () => {
  const fromChat = draft({
    pkg: '8',
    invoice: { source: 'whatsapp', messageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', mime: 'application/pdf', uri: null },
  });
  expect(toBookingRequest(fromChat, { requestId: REQ })).toMatchObject({
    invoice: { source: 'whatsapp', messageId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
  });
});

test('a trial carries no invoice even if one was left in the draft', () => {
  const body = toBookingRequest(draft({ invoice: UPLOADED }), { requestId: REQ });
  expect(body).toMatchObject({ kind: 'trial' });
  expect(body).not.toHaveProperty('invoice');
});

test('a package with no invoice is still sent: the API answers invoice_required', () => {
  const body = toBookingRequest(draft({ pkg: '8' }), { requestId: REQ });
  expect(body).toMatchObject({ kind: 'package' });
  expect(body).not.toHaveProperty('invoice');
});

test('switching the type resets what hung on the old one', () => {
  expect(kindPatch('trial')).toEqual({ kind: 'trial', pkg: 'trial', invoice: null, startsAt: null, extra: [] });
  expect(kindPatch('package')).toMatchObject({ kind: 'package', pkg: '8', invoice: null });
});
