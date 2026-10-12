import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { Linking, Share } from 'react-native';
import { t } from '@/lib/i18n';
import { publicConfigQuery } from '@/lib/public-config';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { ltr } from '@/ui/Ltr';
import { TeacherMeetingLink } from './TeacherMeetingLink';

jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: () => new Promise(() => undefined),
}));

const L = t.studentLists;
const URL = 'https://meet.example.org/abrar-fixed';

afterEach(() => jest.restoreAllMocks());

test('an http(s) link: selectable LTR text, «شارك الرابط» opens the share sheet, «افتح الرابط» opens it', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await renderWithQuery(<TeacherMeetingLink link={` ${URL} `} />);
  expect(screen.getByText(L.meetingLink)).toBeTruthy();
  expect(screen.getByText(ltr(URL)).props.selectable).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: L.shareLink }));
  expect(share).toHaveBeenCalledWith({ message: URL });
  await fireEvent.press(screen.getByRole('button', { name: L.openLink }));
  expect(open).toHaveBeenCalledWith(URL);
  expect(screen.queryByText(L.meetingLinkNone)).toBeNull();
  expect(screen.queryByText(L.meetingLinkAuto)).toBeNull();
});

test('a failed share says to copy it by hand', async () => {
  jest.spyOn(Share, 'share').mockRejectedValue(new Error('no sheet'));
  await renderWithQuery(<TeacherMeetingLink link={URL} />);
  await fireEvent.press(screen.getByRole('button', { name: L.shareLink }));
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByText(L.copyFailed)).toBeTruthy();
});

test.each([null, '', 'javascript:alert(1)', 'meet now'])('no usable link (%p): the «no fixed link» line, no buttons', async (link) => {
  await renderWithQuery(<TeacherMeetingLink link={link} />);
  expect(screen.getByText(L.meetingLinkNone)).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByText(/javascript/)).toBeNull();
});

test('with meeting_link_auto on, a line says families get the platform link', async () => {
  const client = createTestQueryClient();
  client.setQueryData(publicConfigQuery.queryKey, { ...PUBLIC_SETTING_DEFAULTS, custom: {}, meeting_link_auto: true });
  await renderWithQuery(<TeacherMeetingLink link={URL} />, client);
  expect(screen.getByText(L.meetingLinkAuto)).toBeTruthy();
});
