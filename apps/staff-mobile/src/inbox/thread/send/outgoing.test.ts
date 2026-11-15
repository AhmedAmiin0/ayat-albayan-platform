import { sendBody } from './outgoing';

// «إعادة فتح المحادثة» (owner 2026-11-14): the picked template carries reopen; others do not.
const out = { kind: 'template' as const, key: 'welcome_greeting', params: {}, preview: 'أهلًا' };

test('a reopen template: reopen true beside its key and request id', () => {
  expect(sendBody({ out: { ...out, reopen: true }, id: 'r1' })).toEqual({
    key: 'welcome_greeting', params: {}, clientRequestId: 'r1', reopen: true,
  });
});

test('a plain template: no reopen field', () => {
  expect(sendBody({ out, id: 'r1' })).not.toHaveProperty('reopen');
});
