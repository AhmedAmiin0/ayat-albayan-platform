import { waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { openAlert, PROFILE_HREF, reportHref } from './hrefs';

const mockMark = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
let mockInApp = false;
jest.mock('@/portal', () => ({ markReportSeen: (id: string) => mockMark(id) }));
jest.mock('@/room', () => ({
  roomHref: jest.requireActual('@/room/room-way').roomHref,
  roomsInAppNow: async () => mockInApp,
}));

beforeEach(() => jest.clearAllMocks());

test('a report link carries the student and, when visible, the recording', () => {
  expect(reportHref({ studentId: 's 1', reportId: 'r1' })).toBe('/report/r1?student=s+1');
  expect(reportHref({ studentId: 's1', reportId: 'r1', recordingId: 'v1' })).toBe(
    '/report/r1?student=s1&rec=v1',
  );
});

test('the profile is one pushed page, app/profile', () => {
  expect(PROFILE_HREF).toBe('/profile');
});

test('a bell row opens its report (marked seen), child, package, chat, live lesson or week', async () => {
  openAlert({ screen: 'report', studentId: 's1', reportId: 'r1' });
  expect(mockMark).toHaveBeenCalledWith('r1');
  expect(router.push).toHaveBeenLastCalledWith('/report/r1?student=s1');
  openAlert({ screen: 'child', studentId: 's1' });
  expect(router.push).toHaveBeenLastCalledWith('/child/s1');
  openAlert({ screen: 'package', studentId: 's1' });
  expect(router.push).toHaveBeenLastCalledWith('/package/s1');
  openAlert({ screen: 'chat', studentId: 's1' });
  expect(router.push).toHaveBeenLastCalledWith('/chat/s1');
  openAlert({ screen: 'live', studentId: 's1', lessonId: 'l1' });
  await waitFor(() => expect(router.push).toHaveBeenLastCalledWith('/child/s1'));
  openAlert({ screen: 'schedule' });
  expect(router.navigate).toHaveBeenCalledWith('/schedule');
});

test('«بدأت الحلقة» goes straight into the room (direct) while lessons open in the app', async () => {
  mockInApp = true;
  openAlert({ screen: 'live', studentId: 's1', lessonId: 'l1' });
  await waitFor(() => expect(router.push).toHaveBeenLastCalledWith('/room/l1?student=s1&direct=1'));
  mockInApp = false;
  openAlert({ screen: 'live', studentId: 's1', lessonId: 'l1' });
  await waitFor(() => expect(router.push).toHaveBeenLastCalledWith('/child/s1'));
});
