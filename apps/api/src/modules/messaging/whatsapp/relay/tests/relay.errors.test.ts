import { describe, expect, it } from 'vitest';
import { invalidRequest } from '@/modules/messaging/whatsapp/relay/relay.errors';

const bodyOf = (issues: Parameters<typeof invalidRequest>[0]) => {
  const e = invalidRequest(issues);
  return { status: e.getStatus(), body: e.getResponse() };
};

describe('invalidRequest', () => {
  it('words the first issue as «<path>: <message>» with a 422', () => {
    const issues = [
      { path: ['template', 0, 'name'], message: 'Required' },
      { path: ['to'], message: 'Invalid' },
    ];
    expect(bodyOf(issues)).toEqual({
      status: 422,
      body: { error: { message: 'template.0.name: Required', code: 'invalid_request' } },
    });
  });

  it('an issue on the root is its message alone', () => {
    const body = bodyOf([{ path: [], message: 'Expected object' }]).body;
    expect(body).toEqual({ error: { message: 'Expected object', code: 'invalid_request' } });
  });

  it('no issue at all is «invalid request»', () => {
    const body = bodyOf([]).body;
    expect(body).toEqual({ error: { message: 'invalid request', code: 'invalid_request' } });
  });
});
