import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { confirmingQueryClient, noConfirmQueryClient, renderWithQuery } from '@/test/query';
import { SummaryCard } from './SummaryCard';

const counts = { all: 12, scheduled: 5, completed: 3 };

// Every label holds one line, never broken into two.
test('every column label renders on one line, shrinking to fit rather than wrapping', async () => {
  await renderWithQuery(<SummaryCard counts={counts} filter="all" onFilter={jest.fn()} />, confirmingQueryClient());
  for (const key of ['all', 'scheduled', 'completed'] as const) {
    const label = screen.getByText(t.today.summary[key]);
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.adjustsFontSizeToFit).toBe(true);
    expect(label).toHaveStyle({ textAlign: 'center' });
  }
});

test('the short wording: «للتأكيد», not the two-word «تحتاج تأكيد»', () => {
  expect(t.today.summary.scheduled).toBe('للتأكيد');
});

test('no confirmation required (OFF): «قادمة» in ink, no «للتأكيد» and no saffron dot', async () => {
  await renderWithQuery(<SummaryCard counts={counts} filter="all" onFilter={jest.fn()} />, noConfirmQueryClient());
  expect(screen.getByText(t.lessons.noConfirm.scheduledShort)).toBeTruthy();
  expect(screen.queryByText(t.today.summary.scheduled)).toBeNull();
});
