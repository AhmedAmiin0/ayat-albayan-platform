import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorState } from './ErrorState';

test('struck glyph + the common error, announced as an alert', async () => {
  await render(<ErrorState onRetry={jest.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent(t.common.error);
  expect(screen.getByTestId('nuqta-struck', { includeHiddenElements: true })).toBeTruthy();
});

test('«حاول مرة أخرى» retries', async () => {
  const onRetry = jest.fn();
  await render(<ErrorState onRetry={onRetry} message={t.common.notFound} />);
  expect(screen.getByText(t.common.notFound)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobile.retry }));
  expect(onRetry).toHaveBeenCalledTimes(1);
});
