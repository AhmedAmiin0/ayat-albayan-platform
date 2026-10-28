import { cardPlan } from './TeacherLessonActions';

const base = { joinLive: false, link: false, canConfirm: false, report: null } as const;

test('the live classroom leads; «تأكيد» then becomes a secondary peer (never two filled)', () => {
  expect(cardPlan({ ...base, joinLive: true, canConfirm: true, report: 'open' })).toEqual({ lead: 'join', peers: ['confirm', 'report'] });
});

test('«تأكيد» leads over writing the report; the fixed link is always a peer, first', () => {
  expect(cardPlan({ ...base, link: true, canConfirm: true, report: 'edit' })).toEqual({ lead: 'confirm', peers: ['link', 'report'] });
});

test('writing the report leads alone; a sent report («عرض») never leads', () => {
  expect(cardPlan({ ...base, report: 'open' })).toEqual({ lead: 'report', peers: [] });
  expect(cardPlan({ ...base, link: true, report: 'view' })).toEqual({ lead: null, peers: ['link', 'report'] });
  expect(cardPlan(base)).toEqual({ lead: null, peers: [] });
});
