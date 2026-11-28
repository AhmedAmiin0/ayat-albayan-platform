import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../lib/i18n/i18n';
import type { ComponentProps } from 'react';
import { RoomEnd } from './RoomEnd';

type RoomEndProps = ComponentProps<typeof RoomEnd>;

const props = (over: Partial<RoomEndProps>): RoomEndProps => ({
  phase: { step: 'closed', why: 'left' },
  kind: 'lesson',
  presence: [],
  onAgain: jest.fn(),
  onBack: jest.fn(),
  onBrowser: jest.fn(),
  ...over,
});

test('left on one’s own (RoomXLeft): the teacher is still inside, and a way back', async () => {
  await render(<RoomEnd {...props({ presence: [{ name: 'فاطمة', role: 'teacher' }] })} />);
  expect(screen.getByRole('header', { name: t.mobileRoom.left.title })).toBeTruthy();
  expect(screen.getByText(t.portal.app.live.teacherIn)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.classroom.rejoin })).toBeTruthy();
  expect(screen.queryByRole('button', { name: t.mobileRoom.openInBrowser })).toBeNull();
});

test('a meeting closed by the server reads the meeting’s words, with a way back', async () => {
  await render(
    <RoomEnd {...props({ phase: { step: 'closed', why: 'ended' }, kind: 'meeting' })} />,
  );
  expect(screen.getByText(t.classroom.error.meeting_ended)).toBeTruthy();
  expect(screen.getByRole('button', { name: t.classroom.rejoin })).toBeTruthy();
});

test.each(['endedAll', 'removed'] as const)('%s: no way back and no browser', async (why) => {
  await render(<RoomEnd {...props({ phase: { step: 'closed', why } })} />);
  expect(screen.queryByRole('button', { name: t.classroom.rejoin })).toBeNull();
  expect(screen.queryByRole('button', { name: t.mobileRoom.openInBrowser })).toBeNull();
});

test('a failed join offers «حاول مرة أخرى» and the browser', async () => {
  const p = props({ phase: { step: 'failed', message: 'x' } });
  await render(<RoomEnd {...p} />);
  await fireEvent.press(screen.getByRole('button', { name: t.mobileRoom.openInBrowser }));
  expect(p.onBrowser).toHaveBeenCalled();
});
