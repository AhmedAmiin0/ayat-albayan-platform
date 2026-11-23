import { sendBody } from './outgoing';

// Only the picked reopen template carries reopen.
const out = { kind: 'template' as const, key: 'welcome_greeting', params: {}, preview: 'أهلًا' };

test('a reopen template: reopen true beside its key and request id', () => {
  expect(sendBody({ out: { ...out, reopen: true }, id: 'r1' })).toEqual({
    key: 'welcome_greeting', params: {}, clientRequestId: 'r1', reopen: true,
  });
});

test('a plain template: no reopen field', () => {
  expect(sendBody({ out, id: 'r1' })).not.toHaveProperty('reopen');
});
