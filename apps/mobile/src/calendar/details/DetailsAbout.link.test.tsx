import type { LessonView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { Linking, Share, StyleSheet } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { mockClipboard } from '@/test/native-mocks';
import { renderWithQuery } from '@/test/query';
import { lesson } from '@/today/testing/fixtures';
import { DetailsAbout } from './DetailsAbout';
import type { DetailsRole } from './details-text';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));

const URL = 'https://meet.example.org/room-with-a-long-name?pwd=abc';
const ROLES: DetailsRole[] = ['admin', 'teacher', 'sales'];
const show = (role: DetailsRole, over: Partial<LessonView> = {}) =>
  renderWithQuery(<DetailsAbout role={role} lesson={lesson({ id: 'l-1', meeting_link: URL, platform_classroom: false, ...over })} />);
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

let setString: jest.Mock;
beforeEach(() => {
  setString = mockClipboard();
});
afterEach(() => jest.restoreAllMocks());

test.each(ROLES)('%s: the full URL as selectable LTR text, no isolates; «انسخ الرابط» copies exactly it', async (role) => {
  const share = jest.spyOn(Share, 'share');
  await show(role);
  const text = screen.getByText(URL);
  expect(text.props.selectable).toBe(true);
  expect(text.props.numberOfLines).toBe(1);
  expect(text.props.ellipsizeMode).toBe('middle');
  expect(text.props.children).not.toMatch(/[⁦-⁩]/);
  expect(StyleSheet.flatten(text.props.style)).toMatchObject({ writingDirection: 'ltr', textAlign: 'left' });
  await press(t.lessons.copyLink);
  expect(setString).toHaveBeenCalledWith(URL);
  expect(await screen.findByText(t.lessons.linkCopied)).toBeTruthy();
  expect(share).not.toHaveBeenCalled();
});

test.each(ROLES)('%s: «افتح الرابط» opens the URL; a failure says so, no crash', async (role) => {
  const open = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no app'));
  await show(role);
  await press(t.studentLists.openLink);
  expect(open).toHaveBeenCalledWith(URL);
  expect(await screen.findByText(t.studentLists.shareFailed)).toBeTruthy();
});

test('a failing clipboard falls back to the share sheet with the exact URL', async () => {
  setString.mockImplementation(() => {
    throw new Error('no native module');
  });
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  await show('sales');
  await press(t.lessons.copyLink);
  expect(share).toHaveBeenCalledWith({ message: URL });
  expect(screen.queryByText(t.lessons.linkCopied)).toBeNull();
});

test.each(ROLES)('%s: our classroom → «عبر الفصل», no URL, no buttons', async (role) => {
  await show(role, { platform_classroom: true });
  expect(screen.getByText(t.lessons.viaClassroom)).toBeTruthy();
  expect(screen.queryByText(URL)).toBeNull();
  expect(screen.queryByRole('button', { name: t.lessons.copyLink })).toBeNull();
});

test.each([null, '', 'javascript:alert(1)', 'meet now'])('no usable link (%p): «لا يوجد رابط», no buttons', async (link) => {
  await show('teacher', { meeting_link: link });
  expect(screen.getByText(t.lessons.noLink)).toBeTruthy();
  expect(screen.queryByText(/javascript/)).toBeNull();
  expect(screen.queryByRole('button', { name: t.lessons.copyLink })).toBeNull();
});

test('neither field sent (sales\' «الجدول»): unknown, so no «رابط الحلقة» line at all', async () => {
  await show('sales', { meeting_link: undefined, platform_classroom: undefined });
  expect(screen.queryByText(t.lessons.joinLink)).toBeNull();
  expect(screen.queryByText(t.lessons.noLink)).toBeNull();
  expect(screen.getByText(t.schedule.teacher)).toBeTruthy();
});

test('the link buttons are ONE equal-width row with icons, outside the label column', async () => {
  await show('sales');
  const copy = screen.getByRole('button', { name: t.lessons.copyLink });
  const open = screen.getByRole('button', { name: t.studentLists.openLink });
  expect(screen.getAllByTestId('button-icon')).toHaveLength(2);
  const cells = screen.getAllByTestId('button-row-cell');
  expect(cells).toHaveLength(2);
  expect(cells[0]).toContainElement(copy);
  expect(cells[1]).toContainElement(open);
  expect(StyleSheet.flatten(copy.props.style)).toMatchObject({ minHeight: 48, borderWidth: 1 });
});
