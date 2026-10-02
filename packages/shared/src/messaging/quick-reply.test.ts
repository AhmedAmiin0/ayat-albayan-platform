import { describe, expect, it } from 'vitest';
import { payloadRef, quickReplyIntent, quickReplyPayload } from './quick-reply.js';

const LESSON = '7f0c2c4e-1b2a-4c3d-9e8f-0a1b2c3d4e5f';

describe('quickReplyIntent: button payloads (R-MSG-04)', () => {
  it.each([
    [`confirm:${LESSON}`, 'confirm'],
    [`reschedule:${LESSON}`, 'reschedule'],
    ['stop:lead-1', 'stop'],
    ['confirm', 'confirm'],
  ] as const)('%s → %s', (payload, intent) => {
    expect(quickReplyIntent(payload)).toBe(intent);
  });

  it('round-trips the ref through quickReplyPayload / payloadRef', () => {
    const p = quickReplyPayload('confirm', LESSON);
    expect(p).toBe(`confirm:${LESSON}`);
    expect(payloadRef(p)).toBe(LESSON);
    expect(payloadRef('confirm')).toBeNull();
    expect(payloadRef('hello:world')).toBeNull();
  });
});

describe('quickReplyIntent: Egyptian and Gulf confirmations (R-SCH-03)', () => {
  it.each([
    'نعم', 'آه', 'اه', 'أيوه', 'ايوة', 'أيوا', 'تمام', 'موافق', 'موافقة', 'أكيد', 'اكيد', 'تم',
    'حاضر', 'مؤكد', 'OK', 'Yes', '👍', '👍🏽', 'تمام إن شاء الله', 'نعم موجودين',
    'تمام، هنحضر', 'إن شاء الله', 'انشالله', 'أيوه يا أستاذة تمام',
  ])('«%s» → confirm', (text) => {
    expect(quickReplyIntent(text)).toBe('confirm');
  });
});

describe('quickReplyIntent: reschedule and stop', () => {
  it.each([
    'تأجيل', 'أجّل', 'أجلها لو سمحت', 'ممكن نأجل', 'غيّر الميعاد', 'عايزين نغير الميعاد',
    'محتاجين نغيّر الميعاد', 'تغيير الميعاد', 'ممكن ميعاد تاني؟', 'مش هنقدر النهاردة',
    'تمام بس محتاجين نغير الميعاد',
  ])('«%s» → reschedule', (text) => {
    expect(quickReplyIntent(text)).toBe('reschedule');
  });

  it.each(['وقف', 'وقّف الرسايل', 'إيقاف', 'إلغاء الاشتراك', 'STOP', 'unsubscribe', 'لو سمحت وقف'])(
    '«%s» → stop',
    (text) => {
      expect(quickReplyIntent(text)).toBe('stop');
    },
  );

  it('stop beats reschedule, reschedule beats confirm', () => {
    expect(quickReplyIntent('تأجيل ولا وقف خالص')).toBe('stop');
    expect(quickReplyIntent('تمام بس نأجل')).toBe('reschedule');
  });
});

describe('quickReplyIntent: unclear → null, the admin reads it', () => {
  it.each([
    '', '   ', 'لا', 'لأ', 'مش موافق', 'نعم بس متأخرين شوية', 'السلام عليكم', '1', '2',
    'إلغاء', 'موقف السيارات', 'هو الميعاد امتى؟',
    'تمام تمام تمام تمام تمام تمام تمام',
    // Payment and renewal replies are not a lesson confirmation (verifier, Phase 4).
    'تم التحويل', 'تمام هبعت الفلوس بكرة', 'حولت المبلغ تمام', 'تمام هجدد الاشتراك', 'تم الدفع',
  ])('«%s» → null', (text) => {
    expect(quickReplyIntent(text)).toBeNull();
  });
});
