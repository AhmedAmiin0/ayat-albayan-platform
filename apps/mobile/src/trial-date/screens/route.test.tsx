import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { TabStack } from '@/core/nav/TabStack';
import TabsLayout from '../../../app/(tabs)/_layout';
import TrialDateRoute from '../../../app/(tabs)/students/trial-date/[studentId]';

// From the admin student file: its own screen in the Students tab's stack (behind the root's admin gate).
jest.mock('@/auth/use-permissions', () => ({ usePermissions: () => () => true }));
jest.mock('@/core/nav/use-inbox-badge', () => ({ useInboxBadge: () => undefined }));
jest.mock('@/core/push/usePushRegistration', () => ({ usePushRegistration: () => undefined }));
jest.mock('./TrialDateFlow', () => ({
  TrialDateFlow: (p: { studentId: string; name: string; program: string }) => {
    const { Text: T } = jest.requireActual('react-native');
    const { useBookingMode } = jest.requireActual('@/booking/shared/booking-mode');
    return <T>{`flow:${p.studentId}:${p.name}:${p.program}:${useBookingMode()}`}</T>;
  },
}));

const stub = (label: string) => () => <Text>{label}</Text>;
const app = {
  _layout: TabsLayout,
  index: stub('today-screen'),
  schedule: stub('schedule-tab'),
  'inbox/_layout': TabStack,
  'inbox/index': stub('inbox-screen'),
  'students/_layout': TabStack,
  'students/index': stub('students-screen'),
  'students/trial-date/[studentId]': TrialDateRoute,
  'more/_layout': TabStack,
  'more/index': stub('more-screen'),
};

test('/students/trial-date/:studentId opens the admin flow with the student’s name and program', async () => {
  const pending = renderRouter(app, { initialUrl: '/students/trial-date/s1?name=%D8%B1%D9%8A%D9%85&program=arabic' });
  await pending;
  expect(pending.getPathname()).toBe('/students/trial-date/s1');
  expect(screen.getByText('flow:s1:ريم:arabic:admin')).toBeTruthy();
});

test('an unknown program falls back to quran', async () => {
  const pending = renderRouter(app, { initialUrl: '/students/trial-date/s1?name=x&program=zzz' });
  await pending;
  expect(screen.getByText('flow:s1:x:quran:admin')).toBeTruthy();
});
