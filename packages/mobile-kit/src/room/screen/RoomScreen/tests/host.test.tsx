import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { RoomHost } from '../../../host/host-types';
import {
  CREDS,
  fakePlatform,
  LESSON,
  tile,
  withInsets,
  type FakePlatform,
} from '../../../state/room-test-kit';
import { ApiError } from '../../../../lib/http/api';
import { t } from '../../../../lib/i18n/i18n';
import { RoomScreen } from '../RoomScreen';

const C = t.classroom;
const H = t.mobileRoom.host;
let p: FakePlatform;
const host = {
  mute: jest.fn(async () => undefined),
  muteAll: jest.fn(async () => undefined),
  remove: jest.fn(async () => undefined),
  end: jest.fn(async () => ({ endedAt: '2026-11-16T16:00:00Z' })),
} satisfies RoomHost;
const press = async (label: string) =>
  fireEvent.press(await screen.findByRole('button', { name: label }));
const guest = tile({ micOn: true, camOn: true });
const me = tile({ key: 'me:camera', identity: 'teacher-1', role: 'teacher', local: true });

async function live(role: 'teacher' | 'guest', withHost: RoomHost | null = host) {
  const fetchJoin = jest.fn(async () => ({ ...CREDS, role }));
  await render(
    withInsets(
      <RoomScreen
        platform={p}
        target={LESSON}
        onExit={jest.fn()}
        fetchJoin={fetchJoin}
        host={withHost}
      />,
    ),
  );
  await press(t.mobileRoom.preview.join);
  await act(async () => p.client.push({ status: 'connected', tiles: [me, guest] }));
  await press(t.mobileRoom.count.replace('{n}', '2'));
}

beforeEach(() => {
  jest.clearAllMocks();
  p = fakePlatform();
});

test('the teacher mutes, stops a camera and mutes every guest', async () => {
  await live('teacher');
  expect(screen.getByRole('header', { name: `${C.people} · 2` })).toBeTruthy();
  await press(C.mute.micOf.replace('{name}', 'Suhaila'));
  expect(host.mute).toHaveBeenCalledWith({ identity: guest.identity, source: 'microphone' });
  expect(await screen.findByText(C.mute.micDone.replace('{name}', 'Suhaila'))).toBeTruthy();
  await press(C.mute.camOf.replace('{name}', 'Suhaila'));
  expect(host.mute).toHaveBeenLastCalledWith({ identity: guest.identity, source: 'camera' });
  await press(C.mute.all);
  expect(host.muteAll).toHaveBeenCalledWith([guest.identity]);
});

test('«إخراج» asks with the web room’s words first; a refusal reads its code', async () => {
  await live('teacher');
  await press(C.kick.actionOf.replace('{name}', 'Suhaila'));
  expect(
    screen.getByText(`${C.kick.title.replace('{name}', 'Suhaila')} ${C.kick.body}`),
  ).toBeTruthy();
  host.remove.mockRejectedValueOnce(new ApiError(403, { code: 'cannot_remove' }));
  await press(C.kick.confirm);
  expect(host.remove).toHaveBeenCalledWith(guest.identity);
  expect(await screen.findByText(C.error.cannot_remove)).toBeTruthy();
});

test('«إنهاء الحلقة للجميع» is confirmed inline, then ends it; «تراجع» keeps it', async () => {
  await live('teacher');
  await press(H.endAll);
  expect(screen.getByText(H.endConfirm)).toBeTruthy();
  await press(H.keep);
  expect(host.end).not.toHaveBeenCalled();
  await press(H.endAll);
  await press(H.endAction);
  expect(host.end).toHaveBeenCalled();
  // Final for her at once (LiveKit's DeleteRoom that follows changes nothing).
  expect(await screen.findByTestId('room-closed-endedAll')).toBeTruthy();
  await act(async () => p.client.push({ status: 'ended' }));
  expect(screen.getByTestId('room-closed-endedAll')).toBeTruthy();
  expect(screen.queryByRole('button', { name: C.rejoin })).toBeNull();
});

test('without host powers (a guest, or the family’s room): the list only', async () => {
  await live('guest', null);
  expect(screen.getByTestId('room-person-guest-0123456789ab')).toBeTruthy();
  expect(screen.getByText(`${me.name} (${C.you})`)).toBeTruthy();
  expect(screen.queryByRole('button', { name: C.mute.all })).toBeNull();
  expect(screen.queryByRole('button', { name: H.endAll })).toBeNull();
  expect(
    screen.queryByRole('button', { name: C.kick.actionOf.replace('{name}', 'Suhaila') }),
  ).toBeNull();
});
