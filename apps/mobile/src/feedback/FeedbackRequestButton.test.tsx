import type { LessonView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { FeedbackRequestButton } from './FeedbackRequestButton';

const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const text = t.mobile.feedback;
const lesson = (status: string, names = ['يوسف أحمد']) =>
  ({ id: 'l-1', status, students: names.map((name, i) => ({ id: `s-${i + 1}`, name })) }) as unknown as LessonView;
const named = (name: string) => ({ name: text.sendFor.replace('{name}', name) });

beforeEach(() => jest.clearAllMocks());

test('a completed lesson: «ابعت طلب الرأي» posts the student, then says «اتبعت» and stays off', async () => {
  mockApiSend.mockResolvedValue({});
  await renderWithQuery(<FeedbackRequestButton lesson={lesson('completed')} />);
  await fireEvent.press(screen.getByRole('button', named('يوسف أحمد')));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-1/feedback-request', { studentId: 's-1' });
  const sent = await screen.findByText(text.sent);
  expect(sent).toBeTruthy();
  expect(screen.getByRole('button', named('يوسف أحمد')).props.accessibilityState.disabled).toBe(true);
});

test.each([
  ['completed', 1],
  ['late', 1],
  ['scheduled', 0],
  ['confirmed', 0],
  ['cancelled_by_admin', 0],
  ['no_show', 0],
])('a %s lesson offers %i «ابعت طلب الرأي» button(s)', async (status, count) => {
  await renderWithQuery(<FeedbackRequestButton lesson={lesson(status)} />);
  expect(screen.queryAllByText(text.send)).toHaveLength(count);
});

test('the template not approved yet: the refusal is said in words, and the button stays usable', async () => {
  mockApiSend.mockRejectedValue(new ApiError(409, { code: 'template_not_approved' }));
  await renderWithQuery(<FeedbackRequestButton lesson={lesson('completed')} />);
  await fireEvent.press(screen.getByRole('button', named('يوسف أحمد')));
  expect(await screen.findByText(text.error.template_not_approved)).toBeTruthy();
  expect(screen.getByRole('button', named('يوسف أحمد')).props.accessibilityState.disabled).toBe(false);
});

test('a group lesson: one button per student, each with its own state', async () => {
  mockApiSend.mockResolvedValue({});
  await renderWithQuery(<FeedbackRequestButton lesson={lesson('completed', ['يوسف أحمد', 'مريم علي'])} />);
  await fireEvent.press(screen.getByRole('button', named('مريم علي')));
  expect(mockApiSend).toHaveBeenCalledWith('POST', '/lessons/l-1/feedback-request', { studentId: 's-2' });
  expect(await screen.findAllByText(text.sent)).toHaveLength(1);
  expect(screen.getByRole('button', named('يوسف أحمد')).props.accessibilityState.disabled).toBe(false);
});
