import { t } from '@/lib/i18n';
import { free, owned } from './leads-fixtures';
import { leadRowSubtitle } from './lead-row';

test('the owner is the last part of the subtitle, only when named', () => {
  expect(leadRowSubtitle(owned)).toContain(t.mobileLeads.assignedTo.replace('{name}', 'سارة'));
  expect(leadRowSubtitle(free)).not.toContain(t.mobileLeads.assignedTo.replace('{name}', ''));
  expect(leadRowSubtitle({ ...free, assigned_to_name: undefined })).toBe(leadRowSubtitle(free));
});
