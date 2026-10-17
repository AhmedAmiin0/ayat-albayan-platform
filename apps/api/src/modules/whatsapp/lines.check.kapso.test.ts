import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LinesCheck } from './lines.check';
import { LINES_RECORDED as R, routedFetch, stubEnvs, TWO_LINES_ENV } from './whatsapp.lines.fakes';
import { STUB_ENV } from './whatsapp.fakes';

// docs/19 in «افحص الخطوط»: gaps are key NAMES only; a duplicate chat id is its own flag.

const N = STUB_ENV.phoneNumberId;

function check() {
  const lines = new LinesCheck();
  lines.fetch = routedFetch({ [N]: R.phone, [`${STUB_ENV.wabaId}/subscribed_apps`]: R.subscribed }).fetch;
  return lines.check();
}

describe('LinesCheck — driver facts', () => {
  beforeEach(() => stubEnvs(TWO_LINES_ENV));
  afterEach(() => stubEnvs(null));

  it('a chat id equal to the notifications one: duplicate_chat_phone, and gaps hold key names only (meta)', async () => {
    stubEnvs({ ...TWO_LINES_ENV, WA_CHAT_PHONE_NUMBER_ID: N });
    const [notifications, chat] = await check();
    expect(notifications).toMatchObject({ duplicate_chat_phone: false });
    expect(chat).toMatchObject({ configured: false, duplicate_chat_phone: true, gaps: [] });
  });

  it('the same under kapso: no English sentence among the gaps', async () => {
    stubEnvs({ ...TWO_LINES_ENV, WA_CHAT_PHONE_NUMBER_ID: N, WA_CHAT_PROVIDER: 'kapso', KAPSO_API_BASE: 'http://localhost:4010/kapso' });
    const [, chat] = await check();
    expect(chat).toMatchObject({ provider: 'kapso', duplicate_chat_phone: true, gaps: ['KAPSO_API_KEY'] });
    expect(chat?.gaps.every((g) => /^[A-Z_]+$/.test(g))).toBe(true);
  });

  it('notifications on kapso, WA_API_BASE unset: the meta chat line names WA_API_BASE', async () => {
    stubEnvs({ ...TWO_LINES_ENV, WA_API_BASE: '', WA_PROVIDER: 'kapso' });
    const [, chat] = await check();
    expect(chat).toMatchObject({ provider: 'meta', configured: false, gaps: ['WA_API_BASE'] });
  });
});
