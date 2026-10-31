import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/integrations/numbers-overlay';
import { fakeQueries } from '@/modules/messaging/webhook/webhook.fakes';
import { ExternalCatchUpJob } from './external-catchup.job';
import { externalServices, kapsoOverlay, kapsoText } from './external.fakes';
import type { ExternalQueries } from './external.queries';
import {
  AD_WELCOME_WITH_TEXT,
  AUDIO_ITEM,
  EDIT_ECHO,
  ORIGINAL,
  REVOKE_ECHO,
  UNSUPPORTED_ITEM,
} from './kapso-markers.fixtures';
import type { KapsoHistory } from './kapso-history';

// The outbound catch-up (Kapso's history) stores the same rows as the webhook echo: one mapper
// (echoPayload, @ab/shared). A marker read before its original is kept; the original arriving
// later (any path) applies it in the database (migration 992's insert trigger).

const NOW = new Date('2026-10-26T12:00:00Z');
const kapsoItem = (m: Record<string, unknown>) => ({
  ...m,
  kapso: { direction: 'outbound', status: 'delivered' },
});

function job() {
  const queries = fakeQueries();
  const x = externalServices(queries);
  const j = new ExternalCatchUpJob(
    x.ext as unknown as ExternalQueries,
    x.store,
    x.kapso as unknown as KapsoHistory,
  );
  return { ...x, queries, job: j };
}
const find = (x: ReturnType<typeof job>, id: string) =>
  x.queries.stored.find((r) => r.wa_message_id === id);

beforeEach(() => kapsoOverlay());
afterEach(() => {
  setNumbersOverlay(null);
  vi.restoreAllMocks();
});

describe('outbound catch-up: markers and notes from Kapso history', () => {
  it('stores edit and revoke markers, a marker before its original included (out of order)', async () => {
    const x = job();
    const original = kapsoText({ id: ORIGINAL });
    const items = [kapsoItem(REVOKE_ECHO), kapsoItem(EDIT_ECHO), original];
    x.kapso.outbound.mockResolvedValueOnce({ messages: items, after: undefined });
    const [counts] = await x.job.runOnce(NOW);
    expect(counts).toMatchObject({ stored: 3, skipped: 0 });
    expect(find(x, 'wamid.EDIT1')?.interactive_payload).toMatchObject({
      type: 'edit',
      target: ORIGINAL,
    });
    expect(find(x, 'wamid.REVOKE1')?.interactive_payload).toMatchObject({
      type: 'revoke',
      target: ORIGINAL,
    });
    expect(find(x, ORIGINAL)?.body).toBe('تم تأكيد الموعد');
    expect(find(x, ORIGINAL)).not.toHaveProperty('interactive_payload');
  });

  it('a second run stores nothing new (idempotent by wamid)', async () => {
    const x = job();
    x.kapso.outbound.mockResolvedValue({ messages: [kapsoItem(EDIT_ECHO)], after: undefined });
    await x.job.runOnce(NOW);
    const [again] = await x.job.runOnce(NOW);
    expect(again).toMatchObject({ stored: 0, known: 1 });
  });

  it("an audio takes Kapso's mime; the ad's welcome keeps its text; unsupported has no body", async () => {
    const x = job();
    const items = [AUDIO_ITEM, AD_WELCOME_WITH_TEXT, UNSUPPORTED_ITEM];
    x.kapso.outbound.mockResolvedValueOnce({ messages: items, after: undefined });
    await x.job.runOnce(NOW);
    expect(find(x, 'wamid.AUD1')).toMatchObject({
      body: null,
      media_id: '1092837467',
      media_mime: 'audio/ogg; codecs=opus',
    });
    expect(find(x, 'wamid.AD2')).toMatchObject({
      body: null,
      interactive_payload: {
        type: 'errors',
        welcome: 'أهلًا بك في أكاديمية آيات البيان، كيف نخدمك؟',
      },
    });
    expect(find(x, 'wamid.UNS1')?.body).toBeNull();
  });
});
