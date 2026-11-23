import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { MaintenanceScreen } from './MaintenanceScreen';

const S = t.maintenance;

async function open(kind: 'maintenance' | 'down', checking = false) {
  const onRetry = jest.fn();
  await render(<MaintenanceScreen kind={kind} checking={checking} onRetry={onRetry} fontsLoaded />);
  await act(async () => undefined); // Reduce Motion is read asynchronously
  return onRetry;
}

test.each([
  { kind: 'maintenance', words: S.planned, dots: 0 },
  { kind: 'down', words: S.outage, dots: 3 },
] as const)('$kind: its title (a header), body, and $dots gold dots', async ({ kind, words, dots }) => {
  await open(kind);
  expect(screen.getByRole('header', { name: words.title })).toBeTruthy();
  expect(screen.getByText(words.body)).toBeTruthy();
  expect(screen.queryAllByTestId('connecting-dot', { includeHiddenElements: true })).toHaveLength(dots);
});

test('one button asks again; it reads «جارٍ التحقق…» while a check runs', async () => {
  const onRetry = await open('down');
  await fireEvent.press(screen.getByRole('button', { name: S.retry }));
  expect(onRetry).toHaveBeenCalledTimes(1);
  await open('maintenance', true);
  expect(screen.getByRole('button', { name: S.checking })).toBeTruthy();
});
