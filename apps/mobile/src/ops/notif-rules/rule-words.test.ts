import type { NotificationEntryView } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { catalogue } from '../shared/fixtures';
import { askOf, controlOf, heldLine, nameOf, needsTypedWord, partialLine, reachLine, ruleErrorText, ruleOf } from './rule-words';
import { catalogueV2 } from './rules-fixtures';
import { holdsIn } from './use-toggle-rule';

const r = t.mobileNotificationRules;
const v2 = (key: string): NotificationEntryView => {
  const found = catalogueV2.entries.find((e) => e.key === key);
  if (!found) throw new Error(`fixture has no ${key}`);
  return found;
};

test('ruleOf: a v1 row or a malformed rule is read-only', () => {
  expect(catalogue.entries.every((e) => ruleOf(e) === null)).toBe(true);
  expect(ruleOf({ rule: { enabled: 'yes' } as unknown as NotificationEntryView['rule'] })).toBeNull();
  expect(ruleOf(v2('lesson_reminder'))?.enabled).toBe(true);
});

test('controlOf: switch / locked / none', () => {
  expect(controlOf(v2('lesson_reminder'), true)).toEqual({ kind: 'switch', enabled: true });
  expect(controlOf(v2('lesson_reminder_24h'), true)).toEqual({ kind: 'switch', enabled: false });
  expect(controlOf(v2('reminder_failed'), true)).toEqual({ kind: 'locked' });
  expect(controlOf(v2('inbox_templates'), true)).toEqual({ kind: 'none' });
  expect(controlOf(v2('lesson_reminder'), false)).toEqual({ kind: 'none' });
  const v1 = catalogue.entries[0];
  if (v1) expect(controlOf(v1, true)).toEqual({ kind: 'none' });
});

test('askOf: family ON, essential OFF, everything else plain', () => {
  expect(askOf({ audience: 'guardian', essential: false }, true)).toBe('family');
  expect(askOf({ audience: 'lead', essential: false }, true)).toBe('family');
  expect(askOf({ audience: 'teacher', essential: false }, true)).toBe('plain');
  expect(askOf({ audience: 'guardian', essential: true }, false)).toBe('typed');
  expect(askOf({ audience: 'guardian', essential: false }, false)).toBe('plain');
  expect(askOf({ audience: 'staff', essential: false }, false)).toBe('plain');
});

test.each([
  { n: 1, guardian: 'سيصل إلى ولي أمر واحد.', lead: 'سيصل إلى عميل واحد.' },
  { n: 2, guardian: 'سيصل إلى وليَّي أمر.', lead: 'سيصل إلى عميلين.' },
  { n: 7, guardian: 'سيصل إلى 7 أولياء أمور.', lead: 'سيصل إلى 7 عملاء.' },
  { n: 103, guardian: 'سيصل إلى 103 أولياء أمور.', lead: 'سيصل إلى 103 عملاء.' },
  { n: 37, guardian: 'سيصل إلى 37 ولي أمر.', lead: 'سيصل إلى 37 عميلًا.' },
])('reachLine: $n takes its Arabic count form (1, 2, 3–10, 11+)', ({ n, guardian, lead }) => {
  const reach = { guardian: n, teacher: 0, lead: n };
  expect(reachLine('guardian', reach)).toBe(guardian);
  expect(reachLine('lead', reach)).toBe(lead);
});

test('reachLine: nobody with a number yet says so instead of «0»', () => {
  expect(reachLine('lead', { guardian: 3, teacher: 0, lead: 0 })).toBe(r.reach.nobody);
});

test('reachLine: the count for the audience, a general line without it', () => {
  expect(reachLine('guardian', { guardian: 5, teacher: 1, lead: 2 })).toBe(r.reach.guardian.few.replace('{n}', '5'));
  expect(reachLine('lead', { guardian: 5, teacher: 1, lead: 2 })).toBe(r.reach.lead.two);
  expect(reachLine('guardian', undefined)).toBe(r.reach.unknown);
  expect(reachLine('teacher', undefined)).toBe('');
});

test('heldLine / partialLine: known blockers in words, unknown ones silent', () => {
  expect(heldLine({ blocker: 'classroom_off' })).toBe(r.heldNow.replace('{reason}', r.blockers.classroom_off));
  expect(heldLine({ blocker: null })).toBeNull();
  expect(heldLine({ blocker: 'future' as unknown as NotificationEntryView['blocker'] })).toBeNull();
  expect(heldLine({ blocker: 'toString' as unknown as NotificationEntryView['blocker'] })).toBeNull();
  expect(partialLine({ approval: 'some' })).toBe(r.partial);
  expect(partialLine({ approval: 'all' })).toBeNull();
  expect(partialLine({})).toBeNull();
});

test('nameOf: known keys only', () => {
  expect(nameOf('report_ready')).toBe(t.notificationCatalogue.entries.report_ready.name);
  expect(nameOf('future_key')).toBeNull();
  expect(nameOf('constructor')).toBeNull();
});

test('ruleErrorText / needsTypedWord map the API answers', () => {
  expect(ruleErrorText(new ApiError(403))).toBe(r.errors.forbidden);
  expect(ruleErrorText(new ApiError(428, { message: 'confirmation_required' }))).toBe(r.errors.confirmation_required);
  expect(ruleErrorText(new ApiError(422, { message: 'locked' }))).toBe(r.errors.locked);
  expect(ruleErrorText(new ApiError(422, { message: 'not_editable' }))).toBe(r.errors.not_editable);
  expect(ruleErrorText(new ApiError(422, { message: 'invalid' }))).toBe(r.errors.invalid);
  expect(ruleErrorText(new ApiError(422, { message: 'other' }))).toBe(r.errors.failed);
  expect(ruleErrorText(new ApiError(500))).toBe(r.errors.failed);
  expect(ruleErrorText(new Error('net'))).toBe(r.errors.failed);
  expect(needsTypedWord(new ApiError(428))).toBe(true);
  expect(needsTypedWord(new ApiError(422))).toBe(false);
});

test('holdsIn reads raw permission strings', () => {
  expect(holdsIn({ permissions: ['notifications.manage'] }, 'notifications.manage')).toBe(true);
  expect(holdsIn({ permissions: ['settings.read'] }, 'notifications.manage')).toBe(false);
  expect(holdsIn({}, 'notifications.manage')).toBe(false);
  expect(holdsIn(null, 'notifications.manage')).toBe(false);
});
