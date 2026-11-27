import { render, screen } from '@testing-library/react-native';
import { monthText } from '@ab/time';
import { AppText, locale } from '@ab/mobile-kit';
import { MonthSection } from './MonthSection';

test("the month's name as a header over its rows", async () => {
  await render(
    <MonthSection month="2026-11">
      <AppText>row</AppText>
    </MonthSection>,
  );
  expect(screen.getByRole('header', { name: monthText('2026-11', locale) })).toBeTruthy();
  expect(screen.getByText('row')).toBeTruthy();
});
