import { registerHref } from './register-href';
import { thread } from './shared/thread-fixtures';

test('a lead in the funnel opens the sales wizard with the lead, the number, the name and the source', () => {
  expect(registerHref(thread)).toEqual({
    pathname: '/inbox/book',
    params: { leadId: 'a1', phone: '+966552147730', mode: 'register', name: 'هدى سالم', source: 'facebook_ad' },
  });
  expect(registerHref({ ...thread, lead_name: null, display_name: null, lead_source: null })).toEqual({
    pathname: '/inbox/book',
    params: { leadId: 'a1', phone: '+966552147730', mode: 'register' },
  });
});

test.each([
  ['no thread', null],
  ['a guardian', { ...thread, guardian_id: 'g-1' }],
  ['a teacher', { ...thread, teacher_id: 't-1' }],
  ['a converted lead', { ...thread, lead_status: 'converted' as const }],
  ['a lost lead', { ...thread, lead_status: 'lost' as const }],
  ['no lead', { ...thread, lead_id: null }],
])('nothing for %s', (_label, row) => {
  expect(registerHref(row)).toBeNull();
});
