import { describe, expect, it } from 'vitest';
import { message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { bubbleOffers, offersAny } from './bubble-offers';

const OWN = message({
  id: 'm1',
  direction: 'outbound',
  status: 'sent',
  body: 'الحلقة الساعة الخامسة',
  replyable: true,
  sent_by_id: 'p1',
});
const SALES = { id: 'p1', role: 'sales' };
const as = (me: { id: string; role: string } | null, teacher = false) => ({ teacher, me });

describe('bubbleOffers: «تعديل» (a «تصحيح:» reply, owner 2026-11-07)', () => {
  it('her own sent text: on, and not the off «تعديل»', () => {
    expect(bubbleOffers(OWN, as(SALES))).toMatchObject({ edit: true, noEdit: false });
  });

  it('the admin corrects anyone’s text; sales only their own (the off item instead)', () => {
    const theirs = { ...OWN, sent_by_id: 'p2' };
    expect(bubbleOffers(theirs, as({ id: 'p9', role: 'admin' })).edit).toBe(true);
    expect(bubbleOffers(theirs, as(SALES))).toMatchObject({ edit: false, noEdit: true });
  });

  it('never a template, a file, a hidden or a failed message', () => {
    expect(bubbleOffers({ ...OWN, template_key: 'welcome' }, as(SALES))).toMatchObject({
      edit: false,
      noEdit: false,
    });
    const photo = { ...OWN, body: null, media_mime: 'image/jpeg' };
    expect(bubbleOffers(photo, as(SALES))).toMatchObject({ edit: false, noEdit: true });
    const hidden = { by_name: 'سارة', at: '2026-10-30T11:00:00Z' };
    expect(bubbleOffers({ ...OWN, hidden }, as(SALES)).edit).toBe(false);
    expect(bubbleOffers({ ...OWN, status: 'failed' }, as(SALES)).edit).toBe(false);
  });

  it('never a correction: staff correct the original again (review of #694, round 3)', () => {
    const fix = { ...OWN, id: 'c1', body: 'تصحيح: الساعة السادسة', corrects_id: 'm0' };
    expect(bubbleOffers(fix, as(SALES)).edit).toBe(false);
    expect(bubbleOffers(fix, as({ id: 'p9', role: 'admin' })).edit).toBe(false);
  });

  it('never theirs, never in teacher mode, never without a signed-in user', () => {
    expect(bubbleOffers({ ...OWN, direction: 'inbound' }, as(SALES))).toMatchObject({
      edit: false,
      noEdit: false,
    });
    expect(bubbleOffers(OWN, as(SALES, true)).edit).toBe(false);
    expect(bubbleOffers(OWN, as(null)).edit).toBe(false);
  });

  it('«تعديل» alone opens the menu', () => {
    const o = bubbleOffers({ ...OWN, body: '  ' }, as(SALES));
    expect(o.edit).toBe(false);
    expect(offersAny({ ...o, reply: false, copy: false, forward: false, edit: true })).toBe(true);
  });
});
