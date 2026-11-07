import { SEND_REPLAYED } from '@ab/client-core';
import { afterEach, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
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

const DEFAULT_PREFIX = t.inbox.correction.prefix;
afterEach(() => {
  clearAllDrafts();
  t.inbox.correction.prefix = DEFAULT_PREFIX;
});

it('a correction answered with the prefixed body settles with no replay note', () => {
  setDraft(PHONE, { text: '', failed: null });
  const row = { body: 'تصحيح: الساعة الخامسة', corrects_id: 'o1' };
  expect(settleTextSend(row, sent())).toBe(false);
  expect(getDraft(PHONE).failed).toBeNull();
});

it('a replayed first row the API calls another request is still the replay', () => {
  setDraft(PHONE, { text: '', failed: null });
  const row = { body: 'تصحيح: الساعة الرابعة', corrects_id: 'o1', replayed: true };
  expect(settleTextSend({ ...row, same_request: false }, sent())).toBe(true);
  expect(getDraft(PHONE).failed?.code).toBe(SEND_REPLAYED);
});

it('a replayed row correcting another message is the replay too (review of #694)', () => {
  setDraft(PHONE, { text: '', failed: null });
  const row = { body: 'تصحيح: الساعة الخامسة', corrects_id: 'o2', replayed: true };
  expect(settleTextSend(row, sent())).toBe(true);
  expect(getDraft(PHONE).text).toBe('الساعة الخامسة');
});

it('a reworded prefix this English/stale client never saw: the API says same_request', () => {
  t.inbox.correction.prefix = 'Correction: ';
  setDraft(PHONE, { text: '', failed: null });
  const row = { body: 'تعديل: الساعة الخامسة', corrects_id: 'o1', replayed: true };
  expect(settleTextSend({ ...row, same_request: true }, sent())).toBe(false);
  expect(getDraft(PHONE).failed).toBeNull();
});
