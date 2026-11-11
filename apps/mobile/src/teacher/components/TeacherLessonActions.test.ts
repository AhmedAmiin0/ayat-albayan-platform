import { cardPlan } from './TeacherLessonActions';

const base = {
  joinLive: false,
  link: false,
  canConfirm: false,
  canCancel: false,
  report: null,
} as const;

test('the live classroom leads; «سأحضر» then becomes a secondary peer (never two filled)', () => {
  expect(cardPlan({ ...base, joinLive: true, canConfirm: true, report: 'open' })).toEqual({
    lead: 'join',
    peers: ['confirm', 'report'],
  });
});

test('«سأحضر» leads over writing the report; the fixed link is always a peer, first', () => {
  expect(cardPlan({ ...base, link: true, canConfirm: true, report: 'edit' })).toEqual({
    lead: 'confirm',
    peers: ['link', 'report'],
  });
});

test('«إلغاء الحلقة» is always the last peer, never the lead', () => {
  expect(cardPlan({ ...base, link: true, canConfirm: true, canCancel: true })).toEqual({
    lead: 'confirm',
    peers: ['link', 'cancel'],
  });
  expect(cardPlan({ ...base, canCancel: true })).toEqual({ lead: null, peers: ['cancel'] });
});

test('writing the report leads alone; a sent report («عرض») never leads', () => {
  expect(cardPlan({ ...base, report: 'open' })).toEqual({ lead: 'report', peers: [] });
  expect(cardPlan({ ...base, link: true, report: 'view' })).toEqual({
    lead: null,
    peers: ['link', 'report'],
  });
  expect(cardPlan(base)).toEqual({ lead: null, peers: [] });
});
