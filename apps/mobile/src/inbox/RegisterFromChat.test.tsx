import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { RegisterFromChat } from './RegisterFromChat';
import { thread } from './thread-fixtures';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (h: unknown) => mockPush(h) } }));

beforeEach(() => mockPush.mockReset());

test('«تسجيل طالب جديد» on a lead’s chat opens the sales wizard prefilled from the thread', async () => {
  await render(<RegisterFromChat thread={thread} />);
  expect(t.inbox.registerNew).toBe('تسجيل طالب جديد');
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.registerNew }));
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/inbox/book',
    params: { leadId: 'a1', phone: '+966552147730', mode: 'register', name: 'هدى سالم', source: 'facebook_ad' },
  });
});

test('nothing on a family’s chat', async () => {
  await render(<RegisterFromChat thread={{ ...thread, guardian_id: 'g-1', lead_id: null }} />);
  expect(screen.queryByRole('button')).toBeNull();
});
