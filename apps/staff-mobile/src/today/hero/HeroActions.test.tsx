import { screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t, palette } from '@ab/mobile-kit';
import { confirmingQueryClient, renderWithQuery } from '@/test/query';
import { pending } from '@/today/testing/fixtures';
import { HeroCard } from './HeroCard';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
mockApi.onRead(() => new Promise(() => undefined));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

beforeEach(() =>
  jest.useFakeTimers({ now: new Date('2026-10-01T13:20:00Z'), advanceTimers: true }),
);
afterEach(() => jest.useRealTimers());

const styleOf = (name: string) =>
  StyleSheet.flatten(screen.getByRole('button', { name }).props.style);

test('docs/07 §6: «تأكيد الحلقة» (filled) and «التفاصيل» (outlined) are one ButtonRow, confirm first', async () => {
  await renderWithQuery(
    <HeroCard
      hero={{ kind: 'running', lesson: pending }}
      busy={false}
      onConfirm={jest.fn()}
      onDetails={jest.fn()}
    />,
    confirmingQueryClient(),
  );
  const cells = within(screen.getByTestId('hero-actions')).getAllByTestId('button-row-cell');
  expect(cells).toHaveLength(2);
  expect(within(cells[0] as (typeof cells)[number]).getByText(t.today.confirmLesson)).toBeTruthy();
  expect(within(cells[1] as (typeof cells)[number]).getByText(t.today.details)).toBeTruthy();
  expect(styleOf(t.today.confirmLesson)).toMatchObject({
    minHeight: 48,
    backgroundColor: palette.light.lapisFill,
  });
  expect(styleOf(t.today.details)).toMatchObject({
    borderWidth: 1,
    borderColor: palette.light.ruleInput,
  });
});
