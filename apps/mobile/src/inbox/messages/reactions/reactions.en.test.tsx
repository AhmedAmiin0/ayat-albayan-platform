import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ChatActionsProvider } from '../../thread/components/ChatActionsProvider';
import { MessageBubble } from '../components/MessageBubble';
import { message, PHONE, thread } from '../../shared/thread-fixtures';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});

// English (LTR): the same row and pill, English names; the pill sits at the bubble's inline-end for ours
// (the right) and at the start for theirs (the left), mirrored by the language as the bubbles are.
const now = new Date().toISOString();
const open = { ...thread, reactable: true, last_inbound_at: now };
const reacted = { theirs: '😂', ours: '😂', ours_by: 'Heba' };

test('English: the row speaks English and the pill follows the bubble’s side', async () => {
  expect(t).toEqual(en);
  const theirs = message({ id: 'm1', direction: 'inbound', status: 'delivered', body: 'Hello', replyable: true, created_at: now, reactions: reacted });
  const ours = message({ id: 'm2', direction: 'outbound', status: 'sent', body: 'Hi', replyable: true, created_at: now, reactions: reacted });
  await renderWithQuery(
    <ChatActionsProvider phone={PHONE} thread={open}>
      <MessageBubble message={theirs} phone={PHONE} />
      <MessageBubble message={ours} phone={PHONE} />
    </ChatActionsProvider>,
  );
  expect(StyleSheet.flatten(screen.getByTestId('reaction-pill-m1').props.style).alignSelf).toBe('flex-start');
  expect(StyleSheet.flatten(screen.getByTestId('reaction-pill-m2').props.style).alignSelf).toBe('flex-end');
  expect(screen.getByTestId('reaction-pill-m1').props.accessibilityLabel).toBe('Reactions: 😂 2. Tap to see who reacted');
  await fireEvent(screen.getByTestId('bubble-m1'), 'longPress');
  const bar = within(screen.getByTestId('reaction-bar'));
  expect(bar.getByRole('button', { name: 'React with Laugh' }).props.accessibilityState).toMatchObject({ selected: true });
  expect(bar.getByRole('button', { name: 'More emoji' })).toBeTruthy();
});
