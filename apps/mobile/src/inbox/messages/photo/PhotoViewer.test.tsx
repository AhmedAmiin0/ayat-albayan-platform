import { fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ChatActionsProvider } from '../../thread/components/ChatActionsProvider';
import { MessageBubble } from '../components/MessageBubble';
import { PHONE, thread } from '../../shared/thread-fixtures';
import { PATH, photo, SIGNED, signed } from './photo-test-kit';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const caption = 'صورة الواجب';
const label = `${t.inbox.media.image} · ${caption}`;
const open = async () => {
  await renderWithQuery(
    <ChatActionsProvider phone={PHONE} thread={thread}>
      <MessageBubble message={photo({ body: caption })} phone={PHONE} />
    </ChatActionsProvider>,
  );
  await screen.findByTestId('photo-image-p1');
};

beforeEach(() => mockApiFetch.mockReset().mockImplementation(async (path: string) => (path === PATH ? signed() : null)));

test('a tap on the thumbnail opens the photo full screen, labelled with its kind and caption', async () => {
  await open();
  expect(screen.queryByLabelText(label)).toBeNull();
  await fireEvent.press(screen.getByTestId('photo-p1'));
  const full = screen.getByLabelText(label);
  expect(full.props.source).toEqual({ uri: SIGNED });
  expect(full.props.resizeMode).toBe('contain');
  expect(screen.getByTestId('photo-viewer').props).toMatchObject({ animationType: 'fade', statusBarTranslucent: true });
});

test('«إغلاق» closes it', async () => {
  await open();
  await fireEvent.press(screen.getByTestId('photo-p1'));
  await fireEvent.press(screen.getByRole('button', { name: t.common.close }));
  expect(screen.queryByLabelText(label)).toBeNull();
});

test('Android back closes it', async () => {
  await open();
  await fireEvent.press(screen.getByTestId('photo-p1'));
  await fireEvent(screen.getByTestId('photo-viewer'), 'requestClose');
  expect(screen.queryByLabelText(label)).toBeNull();
});

test('a long press on the thumbnail opens the bubble menu, not the viewer', async () => {
  await open();
  await fireEvent(screen.getByTestId('photo-p1'), 'longPress');
  const menu = within(screen.getByTestId('message-menu'));
  expect(menu.getByRole('button', { name: t.inbox.reply.action })).toBeTruthy();
  expect(screen.queryByLabelText(label)).toBeNull();
});
