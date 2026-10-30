import { t } from '@/core/lib/i18n/i18n';
import { statusWord } from './lesson-status';

test('a row chip says the short «للتأكيد»; every other status keeps its word', () => {
  expect(statusWord('scheduled')).toBe(t.today.statusShort.scheduled);
  expect(statusWord('scheduled')).not.toBe(t.enums.lessonStatus.scheduled);
  expect(statusWord('confirmed')).toBe(t.enums.lessonStatus.confirmed);
});
