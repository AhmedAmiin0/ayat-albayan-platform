import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ChatActionsProvider } from './ChatActionsProvider';
import { CopyPhoneButton } from './CopyPhoneButton';
import { PHONE, thread } from '../../shared/thread-fixtures';

jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: async () => null }));

test('«نسخ الرقم» shows the number in E.164 on the selectable copy sheet', async () => {
  await renderWithQuery(
    <ChatActionsProvider phone={PHONE} thread={thread}>
      <CopyPhoneButton phone={PHONE} />
    </ChatActionsProvider>,
  );
  expect(screen.queryByTestId('copy-sheet')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.copy.phone }));
  expect(screen.getByText(t.inbox.copy.phoneTitle)).toBeTruthy();
  const text = screen.getByTestId('copy-text');
  expect([text.props.selectable, text.props.children]).toEqual([true, PHONE]);
});
