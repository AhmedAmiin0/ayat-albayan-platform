import { screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import { shape } from '../../../theme';
import { freshQueryClient, renderWithQuery } from '../../../testing/query';
import { BellButton } from '../BellButton';

const mockApiFetch = jest.fn();
jest.mock('../../../lib/http/api', () => ({
  ...jest.requireActual('../../../lib/http/api'),
  apiFetch: (p: string) => mockApiFetch(p),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, unread: 0 });
});

test.each([
  ['round, the circle', true, shape.control.touch / 2],
  ['square, the control radius', false, shape.radius.md],
])('a %s', async (_name, round, borderRadius) => {
  await renderWithQuery(<BellButton onPress={jest.fn()} round={round} />, freshQueryClient());
  const button = await screen.findByRole('button', { name: t.bell.mobile.open });
  expect(button).toHaveStyle({ borderRadius, width: shape.control.touch });
});
