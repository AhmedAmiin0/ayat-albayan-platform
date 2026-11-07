import { SEND_REPLAYED } from '@ab/client-core';
import { afterEach, expect, it } from 'vitest';
import { clearAllDrafts, draftGeneration, getDraft, setDraft } from './draft-store';
import { settleTextSend, type Sent } from './use-text-send';

// «تعديل» (owner 2026-11-07): the API answers a correction with «تصحيح: » + the text; that is the
// send itself, never «the first message replayed» (docs/44 M1).
const PHONE = '+966501234567';
const sent = (over: Partial<Sent> = {}): Sent => ({
  phone: PHONE,
  text: 'الساعة الخامسة',
  clientRequestId: 'c1',
  correctsId: 'o1',
  gen: { draft: draftGeneration(), own: 0 },
  ...over,
});

afterEach(clearAllDrafts);

it('a correction answered with the prefixed body settles with no replay note', () => {
  setDraft(PHONE, { text: '', failed: null });
  settleTextSend({ body: 'تصحيح: الساعة الخامسة' }, sent());
  expect(getDraft(PHONE).failed).toBeNull();
});

it('a correction answered with another message is still the replay', () => {
  setDraft(PHONE, { text: '', failed: null });
  settleTextSend({ body: 'تصحيح: الساعة الرابعة' }, sent());
  expect(getDraft(PHONE).failed?.code).toBe(SEND_REPLAYED);
});
