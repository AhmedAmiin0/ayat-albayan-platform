import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { SalesChannelButton } from './SalesChannelButton';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (mockHref: string) => mockPush(mockHref) } }));

test('«تفاصيل الطالب» opens the student chat screen, which reads the seat first', async () => {
  await renderWithQuery(<SalesChannelButton studentId="s1" />);
  await fireEvent.press(screen.getByText(t.studentChannel.monitorTitle));
  expect(mockPush).toHaveBeenCalledWith('/sales/students/channel/s1');
});
