import type { ThreadView } from '@ab/shared';
import { screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { palette } from '@/theme';
import { InboxScreen } from '../screens/InboxScreen';
import { thread } from '../shared/thread-fixtures';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

// Invented families: one subscribed, one due for renewal, and a lead (no ring).
const family = (phone: string, name: string, ring: ThreadView['ring']): ThreadView => ({
  ...thread,
  phone_e164: phone,
  display_name: name,
  guardian_id: `g-${phone}`,
  lead_status: null,
  ring,
});

const ringOf = (name: string) => {
  const row = within(screen.getByRole('button', { name: new RegExp(name) }));
  return row.getByTestId(/^avatar-ring-/);
};

test('the avatar ring: green subscribed, gray renewal, none for the rest; read aloud', async () => {
  const items = [
    family('+966552147731', 'أم يوسف', 'subscribed'),
    family('+966552147732', 'أم ليان', 'renewal'),
    thread,
  ];
  mockApiFetch.mockResolvedValue({ items, total: 3, page: 1, pageSize: 25 });
  await renderWithQuery(<InboxScreen />);
  await screen.findByText('هدى سالم');

  const green = ringOf('أم يوسف');
  expect(green.props.testID).toBe('avatar-ring-subscribed');
  expect(green.props.style).toMatchObject({ borderWidth: 2, padding: 2, borderColor: palette.light.ok });
  expect(green.props.accessibilityLabel).toBe(t.inbox.ring.subscribed);

  const gray = ringOf('أم ليان');
  expect(gray.props.testID).toBe('avatar-ring-renewal');
  expect(gray.props.style).toMatchObject({ borderColor: palette.light.ruleInput });
  expect(gray.props.accessibilityLabel).toBe(t.inbox.ring.renewal);

  const none = ringOf('هدى سالم');
  expect(none.props.testID).toBe('avatar-ring-none');
  expect(none.props.style).toMatchObject({ borderColor: 'transparent' });
  expect(none.props.accessibilityLabel).toBeUndefined();
});
