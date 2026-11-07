import { message } from '@/inbox/shared/thread-fixtures';
import { carried, echoed, sendBody } from '@/inbox/thread/send/outgoing';
import ar from '@ab/shared/i18n/ar.json';
import { t } from '@/core/lib/i18n/i18n';
import { CORRECTION_PREFIX_ROOM, WA_TEXT_MAX } from '@ab/shared';
import { bareText, targetKey, textMax, textOut } from './text-target';

// The box's text send (owner 2026-11-07): a correction carries correctsId, never a reply.
const original = message({ id: 'o1', direction: 'outbound', body: 'الحلقة غدًا' });
const asked = message({ id: 'i1', direction: 'inbound', body: 'متى الحلقة؟' });

test('a correction: correctsId, no replyToMessageId, no prefix (the API adds it)', () => {
  const out = textOut('الحلقة بعد غد', { reply: null, editing: original });
  expect(sendBody({ out, id: 'r1' })).toEqual({
    text: 'الحلقة بعد غد',
    clientRequestId: 'r1',
    correctsId: 'o1',
  });
});

test('an edit wins over a stale reply target', () => {
  const out = textOut('نص', { reply: asked, editing: original });
  expect(sendBody({ out, id: 'r1' })).not.toHaveProperty('replyToMessageId');
});

test('a reply and a plain text keep their bodies', () => {
  const reply = textOut('غدًا', { reply: asked, editing: null });
  expect(sendBody({ out: reply, id: 'r2' })).toEqual({
    text: 'غدًا',
    clientRequestId: 'r2',
    replyToMessageId: 'i1',
  });
  const plain = textOut('مرحبًا', { reply: null, editing: null });
  expect(sendBody({ out: plain, id: 'r3' })).toEqual({ text: 'مرحبًا', clientRequestId: 'r3' });
});

test('the id key tells a correction from a reply to the same message', () => {
  expect(targetKey(textOut('x', { reply: null, editing: original }))).toBe('correct:o1');
  expect(targetKey(textOut('x', { reply: original, editing: null }))).toBe('o1');
  expect(targetKey(textOut('x', { reply: null, editing: null }))).toBeUndefined();
});

test("the row is expected with the API's Arabic prefix; the box keeps the typed text", () => {
  const out = textOut('الحلقة بعد غد', { reply: null, editing: original });
  expect(echoed(out)).toBe(`${ar.inbox.correction.prefix}الحلقة بعد غد`);
  expect(carried(out)).toBe('الحلقة بعد غد');
  expect(echoed(textOut('مرحبًا', { reply: asked, editing: null }))).toBe('مرحبًا');
});

describe('round 3 of #694: the admins\' prefix, a bare prefix', () => {
  const DEFAULT_PREFIX = t.inbox.correction.prefix;
  afterEach(() => {
    t.inbox.correction.prefix = DEFAULT_PREFIX;
  });

  it('the row is expected with the override-merged prefix, never the bundled one', () => {
    t.inbox.correction.prefix = 'تعديل: ';
    const out = textOut('تصحيح: الحلقة بعد غد', { reply: null, editing: original });
    expect(echoed(out)).toBe('تعديل: الحلقة بعد غد');
  });

  it('in edit mode only the prefix is nothing to send; outside it, a plain text', () => {
    expect(bareText(' تصحيح: ', original)).toBe(true);
    expect(bareText('تصحيح: غدًا', original)).toBe(false);
    expect(bareText('تصحيح:', null)).toBe(false);
    expect(bareText('  ', null)).toBe(true);
  });
});

test('round 4 of #694: edit mode leaves room for the API prefix', () => {
  expect(textMax(original)).toBe(WA_TEXT_MAX - CORRECTION_PREFIX_ROOM);
  expect(textMax(null)).toBe(WA_TEXT_MAX);
});
