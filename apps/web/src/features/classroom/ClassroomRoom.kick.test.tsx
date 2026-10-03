import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { joinAs } from './board/board-fixture';
import { ClassroomRoom } from './ClassroomRoom';
import { fakeClient, tile } from './fake-client';

const api = vi.hoisted(() => ({ remove: vi.fn() }));
vi.mock('./moderation-api', async (orig) => ({ ...(await orig<object>()), removeParticipant: api.remove }));

const TILES = [
  tile({ key: 'me', name: 'أبرار', isLocal: true, role: 'teacher' }),
  tile({ key: 'g1', name: 'سهيلة', role: 'guest' }),
  tile({ key: 'a1', name: 'المدير', role: 'admin' }),
];
const kickOf = (name: string) => t.classroom.kick.actionOf.replace('{name}', name);

function open(role: 'teacher' | 'guest' = 'teacher') {
  const c = fakeClient({ tiles: TILES });
  render(<ClassroomRoom join={joinAs(role)} make={() => c} />);
  return c;
}

describe('ClassroomRoom «إخراج من الحلقة»', () => {
  beforeEach(() => {
    api.remove.mockReset();
  });

  it('the teacher may remove a guest, never the admin or themselves', () => {
    open();
    expect(screen.getByRole('button', { name: kickOf('سهيلة') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: kickOf('المدير') })).toBeNull();
    expect(screen.queryByRole('button', { name: kickOf('أبرار') })).toBeNull();
  });

  it('a guest sees no remove action', () => {
    open('guest');
    expect(screen.queryByRole('button', { name: kickOf('سهيلة') })).toBeNull();
  });

  it('confirms, calls the API with the identity, and says it is done', async () => {
    api.remove.mockResolvedValue(undefined);
    open();
    fireEvent.click(screen.getByRole('button', { name: kickOf('سهيلة') }));
    const dialog = screen.getByRole('dialog', { name: t.classroom.kick.title.replace('{name}', 'سهيلة') });
    fireEvent.click(within(dialog).getByRole('button', { name: t.classroom.kick.confirm }));
    expect(api.remove).toHaveBeenCalledWith({ lessonId: 'L1', identity: 'g1' });
    expect(await screen.findByText(t.classroom.kick.done.replace('{name}', 'سهيلة'))).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cancel leaves everyone in', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: kickOf('سهيلة') }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t.common.cancel }));
    expect(api.remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('maps 403 cannot_remove and 404 participant_not_found to their words', async () => {
    api.remove.mockRejectedValueOnce(new ApiError(403, { code: 'cannot_remove' }));
    api.remove.mockRejectedValueOnce(new ApiError(404, { code: 'participant_not_found' }));
    open();
    for (const text of [t.classroom.error.cannot_remove, t.classroom.error.participant_not_found]) {
      fireEvent.click(screen.getByRole('button', { name: kickOf('سهيلة') }));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: t.classroom.kick.confirm }));
      expect(await screen.findByText(text)).toBeTruthy();
    }
  });

  it('«المشاركون» lists everyone with roles and offers the same action', () => {
    open();
    fireEvent.click(screen.getByRole('button', { name: t.classroom.people }));
    const sheet = screen.getByRole('dialog', { name: t.classroom.people });
    expect(within(sheet).getByText(`أبرار (${t.classroom.you})`)).toBeTruthy();
    expect(within(sheet).getByText(t.classroom.roles.admin)).toBeTruthy();
    fireEvent.click(within(sheet).getByRole('button', { name: kickOf('سهيلة') }));
    expect(screen.getByRole('dialog', { name: t.classroom.kick.title.replace('{name}', 'سهيلة') })).toBeTruthy();
  });

  it('when I am removed, the room closes with «removed_from_room» and no way back in', () => {
    const c = fakeClient({ tiles: TILES });
    render(<ClassroomRoom join={joinAs('guest')} make={() => c} onRejoin={() => undefined} />);
    act(() => c.push({ status: 'removed' }));
    expect(screen.getByText(t.classroom.error.removed_from_room)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.classroom.rejoin })).toBeNull();
  });
});
