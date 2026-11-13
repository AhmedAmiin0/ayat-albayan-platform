import type { Permission } from '@ab/shared';
import { screen } from '@testing-library/react-native';
import type { TabItem } from '@/core/ui/layout/AppNativeTabs';
import { renderWithQuery, teacherPagesClient } from '@/test/query';
import { pathKey } from '@/core/lib/query/query-keys';
import { TeacherTabs } from './TeacherTabs';

const mockTabs = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: jest.fn(async () => ({ id: 't1', display_name_ar: 'أبرار', tz: 'Africa/Cairo', students: [] })),
}));
jest.mock('@/core/ui/layout/AppNativeTabs', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    AppNativeTabs: ({ tabs }: { tabs: TabItem[] }) => {
      mockTabs(tabs);
      return <Text>teacher-tabs</Text>;
    },
  };
});

const chatsHidden = () => {
  const tabs: TabItem[] = mockTabs.mock.lastCall?.[0] ?? [];
  return tabs.find((tab) => tab.name === 'chats')?.hidden;
};

test('«المحادثات» shows with inbox.read and its switch on', async () => {
  await renderWithQuery(<TeacherTabs />, teacherPagesClient(true));
  await screen.findByText('teacher-tabs');
  expect(chatsHidden()).toBe(false);
});

test('the switch off (the default) hides the chats tab', async () => {
  await renderWithQuery(<TeacherTabs />, teacherPagesClient(false));
  await screen.findByText('teacher-tabs');
  expect(chatsHidden()).toBe(true);
});

test('the switch on without inbox.read still hides it', async () => {
  const client = teacherPagesClient(true);
  const permissions: Permission[] = ['self.teacher', 'lessons.read'];
  client.setQueryData(pathKey('/auth/me'), { role: 'teacher', permissions });
  await renderWithQuery(<TeacherTabs />, client);
  await screen.findByText('teacher-tabs');
  expect(chatsHidden()).toBe(true);
});
