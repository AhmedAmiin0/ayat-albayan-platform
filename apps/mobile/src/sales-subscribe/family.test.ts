import { STUDENT_STATUSES } from '@ab/shared';
import { t } from '@/lib/i18n';
import { chosenOpen, familyPath, openPackages, renewTargets, withOpenPackage } from './family';
import { familyOf, KID2, kid, openSub, SUB } from './fixtures';

test('the family path carries the E.164 number url-encoded', () => {
  expect(familyPath('+966501112223')).toBe('/sales/money/family?phone=%2B966501112223');
});

test('open packages over all her students; the picked one, else the only one', () => {
  const other = openSub({ id: 'sub-2', student: { id: KID2, code: 'AB-0202', name: 'سلمى' } });
  const fam = familyOf(kid({ open: [openSub()] }), kid({ id: KID2, open: [other] }));
  const open = openPackages(fam);
  expect(open.map((o) => o.id)).toEqual([SUB, 'sub-2']);
  expect(openPackages(undefined)).toEqual([]);
  expect(chosenOpen(open, 'sub-2')?.id).toBe('sub-2');
  expect(chosenOpen(open, undefined)).toBeUndefined();
  expect(chosenOpen([openSub()], 'gone')?.id).toBe(SUB);
});

test('a just-created package joins its student once; nothing cached stays nothing', () => {
  const fam = familyOf(kid(), kid({ id: KID2 }));
  const once = withOpenPackage(fam, openSub());
  expect(once?.students[0]?.open.map((o) => o.id)).toEqual([SUB]);
  expect(once?.students[1]?.open).toEqual([]);
  expect(withOpenPackage(once, openSub())?.students[0]?.open).toHaveLength(1);
  expect(withOpenPackage(undefined, openSub())).toBeUndefined();
});

test('«جدّد الاشتراك»: only her pending_renewal / expired students; the child named when she has several', () => {
  const shown = STUDENT_STATUSES.filter((status) => renewTargets(familyOf(kid({ status }))).length > 0);
  expect(shown).toEqual(['pending_renewal', 'expired']);
  expect(renewTargets(familyOf(kid({ status: 'expired' })))).toEqual([{ studentId: kid().id, label: t.students.renew }]);
  const two = familyOf(kid({ status: 'active' }), kid({ id: KID2, name: 'سلمى', status: 'pending_renewal' }));
  expect(renewTargets(two)).toEqual([{ studentId: KID2, label: `${t.students.renew} — سلمى` }]);
  expect(renewTargets(undefined)).toEqual([]);
});
