import { t } from '@/core/lib/i18n/i18n';
import { leadAge } from '../../shared/format';
import { free, owned } from './leads-fixtures';
import { leadRowSubtitle } from './lead-row';

test('the owner is the last part of the subtitle, only when named', () => {
  expect(leadRowSubtitle(owned)).toContain(t.mobileLeads.assignedTo.replace('{name}', 'سارة'));
  expect(leadRowSubtitle(free)).not.toContain(t.mobileLeads.assignedTo.replace('{name}', ''));
  expect(leadRowSubtitle({ ...free, assigned_to_name: undefined })).toBe(leadRowSubtitle(free));
});

test('the age is counted from the list clock it is given, not frozen at the first draw', () => {
  const later = Date.parse(owned.created_at) + 3 * 3_600_000;
  expect(leadRowSubtitle(owned, later)).toContain(leadAge(owned.created_at, new Date(later)));
});
