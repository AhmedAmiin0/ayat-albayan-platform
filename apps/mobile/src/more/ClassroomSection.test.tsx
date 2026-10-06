import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { ClassroomSection } from './ClassroomSection';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('«الحلقات والاجتماعات» has the live board and the meetings, each opening its route', async () => {
  await render(<ClassroomSection />);
  expect(screen.getByRole('header', { name: t.mobileClassroom.section })).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.mobileClassroom.title }));
  expect(router.push).toHaveBeenLastCalledWith('/more/live');
  await fireEvent.press(screen.getByRole('button', { name: t.mobileClassroom.meetingsRow }));
  expect(router.push).toHaveBeenLastCalledWith('/more/live/meetings');
});

test('a role without meetings.read does not see the meetings row', async () => {
  await render(<ClassroomSection can={(p) => p !== 'meetings.read'} />);
  expect(screen.getByRole('button', { name: t.mobileClassroom.title })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.mobileClassroom.meetingsRow })).toBeNull();
});

test('a role without lessons.read does not see the live board row', async () => {
  await render(<ClassroomSection can={(p) => p !== 'lessons.read'} />);
  expect(screen.queryByRole('button', { name: t.mobileClassroom.title })).toBeNull();
  expect(screen.getByRole('button', { name: t.mobileClassroom.meetingsRow })).toBeTruthy();
});
