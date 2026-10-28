import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { Linking, Share } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { publicConfigQuery } from '@/core/lib/query/public-config';
import { mockClipboard } from '@/test/native-mocks';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { TeacherMeetingLink } from './TeacherMeetingLink';

jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: () => new Promise(() => undefined),
}));

const L = t.studentLists;
const URL = 'https://meet.example.org/abrar-fixed';

afterEach(() => jest.restoreAllMocks());

test('an http(s) link: selectable LTR text, «شارك الرابط» opens the share sheet, «افتح الرابط» opens it', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await renderWithQuery(<TeacherMeetingLink link={` ${URL} `} platform={false} />);
  expect(screen.getByText(L.meetingLink)).toBeTruthy();
  const text = screen.getByText(URL);
  expect(text.props.selectable).toBe(true);
  expect(text.props.children).toBe(URL); // exactly the URL: no LRI/PDI isolates for a long-press copy
  expect(text.props.children).not.toMatch(/[\u2066\u2069]/);
  await fireEvent.press(screen.getByRole('button', { name: L.shareLink }));
  expect(share).toHaveBeenCalledWith({ message: URL });
  await fireEvent.press(screen.getByRole('button', { name: L.openLink }));
  expect(open).toHaveBeenCalledWith(URL);
  expect(screen.queryByText(L.meetingLinkNone)).toBeNull();
  expect(screen.queryByText(L.meetingLinkAuto)).toBeNull();
});

test('«انسخ الرابط» puts exactly the URL on the clipboard and says so; a failing clipboard opens the share sheet', async () => {
  const setString = mockClipboard();
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  await renderWithQuery(<TeacherMeetingLink link={URL} platform={false} />);
  await fireEvent.press(screen.getByRole('button', { name: L.copyLink }));
  expect(setString).toHaveBeenCalledWith(URL);
  expect(await screen.findByText(L.copied)).toBeTruthy();
  expect(share).not.toHaveBeenCalled();
  setString.mockImplementation(() => {
    throw new Error('no native module');
  });
  await fireEvent.press(screen.getByRole('button', { name: L.copyLink }));
  expect(share).toHaveBeenCalledWith({ message: URL });
  expect(screen.queryByText(L.copied)).toBeNull();
});

test('a failed share says to copy it by hand', async () => {
  jest.spyOn(Share, 'share').mockRejectedValue(new Error('no sheet'));
  await renderWithQuery(<TeacherMeetingLink link={URL} platform={false} />);
  await fireEvent.press(screen.getByRole('button', { name: L.shareLink }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByText(L.shareFailed)).toBeTruthy();
});

test.each([null, '', 'javascript:alert(1)', 'meet now'])('no usable link (%p): the «no fixed link» line, no buttons', async (link) => {
  await renderWithQuery(<TeacherMeetingLink link={link} platform={false} />);
  expect(screen.getByText(L.meetingLinkNone)).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByText(/javascript/)).toBeNull();
});

/** The academy setting set opposite to the teacher's own flag: only the teacher's flag may count. */
function academySetting(auto: boolean) {
  const client = createTestQueryClient();
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: auto });
  return client;
}

test('the teacher in our classroom: a line says families get the platform link, even with the setting off', async () => {
  await renderWithQuery(<TeacherMeetingLink link={URL} platform />, academySetting(false));
  expect(screen.getByText(L.meetingLinkAuto)).toBeTruthy();
});

test('the teacher on her fixed link: no platform line, even with the setting on', async () => {
  await renderWithQuery(<TeacherMeetingLink link={URL} platform={false} />, academySetting(true));
  expect(screen.getByText(URL)).toBeTruthy();
  expect(screen.queryByText(L.meetingLinkAuto)).toBeNull();
});

test('docs/07 «الأزرار»: copy | share | open as one ButtonRow, copy and open with their icons', async () => {
  await renderWithQuery(<TeacherMeetingLink link={URL} platform={false} />);
  expect(screen.getAllByTestId('button-row-cell')).toHaveLength(3);
  expect(screen.getAllByTestId('button-icon')).toHaveLength(2);
});
