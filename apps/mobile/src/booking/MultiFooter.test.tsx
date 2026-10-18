import { screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { SUN_17, THU_18 } from './fixtures';
import { MultiFooter } from './MultiFooter';

const nextDisabled = () =>
  screen.getByRole('button', { name: t.booking.next }).props.accessibilityState?.disabled === true;
const multi = { picks: [SUN_17, THU_18], onChange: jest.fn(), onNext: jest.fn(), need: 2 };

test('enough days: «التالي» is enabled', async () => {
  await renderWithQuery(<MultiFooter multi={multi} tz="Asia/Riyadh" />);
  expect(nextDisabled()).toBe(false);
});

test('a hold keeps «التالي» disabled and says why', async () => {
  await renderWithQuery(<MultiFooter multi={{ ...multi, hold: t.booking.courseChange.noChange }} tz="Asia/Riyadh" />);
  expect(screen.getByText(t.booking.courseChange.noChange)).toBeTruthy();
  expect(nextDisabled()).toBe(true);
});
