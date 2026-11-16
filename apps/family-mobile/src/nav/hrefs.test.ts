import { router } from 'expo-router';
import { openAlert, PROFILE_HREF, reportHref } from './hrefs';

const mockMark = jest.fn();
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('@/portal', () => ({ markReportSeen: (id: string) => mockMark(id) }));

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

test('a bell row opens its report (marked seen), child, package, chat or the week', () => {
  openAlert({ screen: 'report', studentId: 's1', reportId: 'r1' });
  expect(mockMark).toHaveBeenCalledWith('r1');
  expect(router.push).toHaveBeenLastCalledWith('/report/r1?student=s1');
  openAlert({ screen: 'child', studentId: 's1' });
  expect(router.push).toHaveBeenLastCalledWith('/child/s1');
  openAlert({ screen: 'package', studentId: 's1' });
  expect(router.push).toHaveBeenLastCalledWith('/package/s1');
  openAlert({ screen: 'chat', studentId: 's1' });
  expect(router.push).toHaveBeenLastCalledWith('/chat/s1');
  openAlert({ screen: 'schedule' });
  expect(router.navigate).toHaveBeenCalledWith('/schedule');
});
