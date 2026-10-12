import { t } from '@/lib/i18n';
import { countsLine, KIND_EMPTY, kindPills, presetKind } from './student-kinds';

const L = t.studentLists;

test('the pills: «مشترك · تجريبي · الكل» in that order, a count only when known', () => {
  expect(kindPills({ active: 3, all: 5 })).toEqual([
    { value: 'active', label: L.active, count: 3 },
    { value: 'trial', label: L.trial },
    { value: 'all', label: L.all, count: 5 },
  ]);
});

test('«مشترك n · تجريبي n» of a teacher', () => {
  expect(countsLine({ active_count: 7, trial_count: 0 })).toBe(L.counts.replace('{active}', '7').replace('{trial}', '0'));
});

test('the preset kind: the status param when the switch has it, else «مشترك»', () => {
  expect(presetKind(undefined)).toBe('active');
  expect(presetKind('')).toBe('active');
  expect(presetKind('trial')).toBe('trial');
  expect(presetKind('active')).toBe('active');
  expect(presetKind('paused,churned')).toBe('active');
  expect(presetKind('all')).toBe('all');
  expect(presetKind('nonsense')).toBe('active');
});

test('each kind has its own empty line', () => {
  expect(KIND_EMPTY).toEqual({ active: L.emptyActive, trial: L.emptyTrial, all: L.emptyAll });
});
