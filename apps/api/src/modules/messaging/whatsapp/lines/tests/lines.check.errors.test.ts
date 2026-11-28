import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LINES_RECORDED as R, stubEnvs, TWO_LINES_ENV } from '@/modules/messaging/whatsapp/whatsapp.lines.fakes';
import { C, checker, CW, N, NW } from './fixtures/checker';

describe('LinesCheck errors (docs/12 §13.9, R-MSG-05)', () => {
  beforeEach(() => stubEnvs(TWO_LINES_ENV));
  afterEach(() => stubEnvs(null));

  it('a 190 on one call becomes an errors[] entry; the other call and the other line still answer', async () => {
    const { lines } = checker({
      [N]: R.badToken,
      [NW]: R.subscribed,
      [C]: R.chatPhone,
      [CW]: R.badToken,
    });
    const [notifications, chat] = await lines.check();
    expect(notifications?.errors).toEqual([{ step: 'phone', code: 190, message: 'Invalid OAuth access token.' }]);
    expect(notifications).toMatchObject({
      display_phone_number: null,
      status: null,
      subscribed_apps: expect.any(Array),
    });
    expect(chat?.errors).toEqual([{ step: 'subscribed_apps', code: 190, message: 'Invalid OAuth access token.' }]);
    expect(chat).toMatchObject({ display_phone_number: '+1 555-000-2222', subscribed_apps: null });
  });

  it('errors keep the step order (phone, then subscribed_apps); a rejected fetch is isolated too', async () => {
    const down = new TypeError('fetch failed');
    const { lines } = checker({
      [N]: R.badToken,
      [NW]: down,
      [C]: R.chatPhone,
      [CW]: R.subscribed,
    });
    const [notifications, chat] = await lines.check();
    expect(notifications?.errors.map((e) => [e.step, e.code])).toEqual([['phone', 190], ['subscribed_apps', null]]);
    expect(notifications?.errors[1]?.message).toBe('WhatsApp request failed');
    expect(chat?.errors).toEqual([]);
  });

  it('a body of the wrong shape is a code-null error, not a crash', async () => {
    const { lines } = checker({ [N]: R.phone, [NW]: { status: 200, body: { data: 'x' } }, [C]: R.chatPhone, [CW]: R.subscribed });
    const [notifications] = await lines.check();
    expect(notifications?.errors).toEqual([{ step: 'subscribed_apps', code: null, message: 'Unexpected WhatsApp response' }]);
  });
});
