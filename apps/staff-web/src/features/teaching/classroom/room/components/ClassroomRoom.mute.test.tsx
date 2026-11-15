import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { joinAs } from '@/features/teaching/classroom/board/board-fixture';
import { ClassroomRoom } from './ClassroomRoom';
import { fakeClient, tile } from '@/features/teaching/classroom/room/livekit/fake-client';

const apiSend = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<typeof import('@/lib/http/api')>()), apiSend }));

const M = t.classroom.mute;
const TILES = [
  tile({ key: 'me', name: 'أبرار', isLocal: true, role: 'teacher' }),
  tile({ key: 'guest-1', name: 'سهيلة', role: 'guest', hasVideo: true }),
  tile({ key: 'guest-2', name: 'مريم', role: 'guest' }),
  tile({ key: 'admin-1', name: 'المدير', role: 'admin' }),
];

function open(role: 'teacher' | 'assistant' | 'guest' = 'teacher') {
  const c = fakeClient({ tiles: TILES });
  render(<ClassroomRoom join={joinAs(role)} make={() => c} />);
  return c;
}

describe('ClassroomRoom «كتم الميكروفون» / «إيقاف الكاميرا»', () => {
  afterEach(() => apiSend.mockClear());

  it('the tile offers mute and camera-off on a guest, never on the admin or myself', async () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: M.micOf.replace('{name}', 'سهيلة') }));
    expect(apiSend).toHaveBeenCalledWith('POST', '/lessons/L1/room/participants/guest-1/mute', { source: 'microphone' });
    fireEvent.click(screen.getByRole('button', { name: M.camOf.replace('{name}', 'سهيلة') }));
    expect(apiSend).toHaveBeenLastCalledWith('POST', '/lessons/L1/room/participants/guest-1/mute', { source: 'camera' });
    expect(screen.queryByRole('button', { name: M.camOf.replace('{name}', 'مريم') })).toBeNull();
    expect(screen.queryByRole('button', { name: M.micOf.replace('{name}', 'المدير') })).toBeNull();
    expect(screen.queryByRole('button', { name: M.micOf.replace('{name}', 'أبرار') })).toBeNull();
    expect(await screen.findByText(M.camDone.replace('{name}', 'سهيلة'))).toBeTruthy();
  });

  it('«المشاركون»: «كتم الجميع» mutes every guest microphone', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.people }));
    const sheet = screen.getByRole('dialog', { name: t.classroom.people });
    fireEvent.click(within(sheet).getByRole('button', { name: M.all }));
    expect(apiSend.mock.calls.map((c) => c[1])).toEqual([
      '/lessons/L1/room/participants/guest-1/mute',
      '/lessons/L1/room/participants/guest-2/mute',
    ]);
    expect(within(sheet).getByRole('button', { name: M.micOf.replace('{name}', 'مريم') })).toBeTruthy();
  });

  it('an assistant mutes a guest but has no «كتم الجميع»; a guest mutes nobody', () => {
    open('assistant');
    expect(screen.getByRole('button', { name: M.micOf.replace('{name}', 'سهيلة') })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.people }));
    expect(screen.queryByRole('button', { name: M.all })).toBeNull();
  });

  it('a guest sees no mute actions, and «كتمك المعلم» when a staff member mutes them', async () => {
    const c = open('guest');
    expect(screen.queryByRole('button', { name: M.micOf.replace('{name}', 'مريم') })).toBeNull();
    act(() => c.moderate({ source: 'microphone' }));
    expect(await screen.findByText(M.byStaff)).toBeTruthy();
    act(() => c.moderate({ source: 'camera' }));
    expect(await screen.findByText(M.camByStaff)).toBeTruthy();
  });
});
