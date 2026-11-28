import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { KickController } from '@ab/web-kit/classroom/kick/use-kick';
import type { MuteController } from '@ab/web-kit/classroom/mute/use-mute';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { aKickController, tile } from '@ab/web-kit/testing';
import { ParticipantsSheet } from './ParticipantsSheet';

const M = t.classroom.mute;
const K = t.classroom.kick;

const me = tile({ key: 'me', name: 'Me', isLocal: true, role: 'teacher' });
const ali = tile({ key: 'ali', name: 'Ali', role: 'guest' });
const aliScreen = tile({ key: 'ali:screen', identity: 'ali', name: 'Ali', kind: 'screen' });

function muteOf(o: Partial<MuteController> = {}): MuteController {
  return {
    canMute: (x) => !x.isLocal,
    canMuteAll: true,
    mute: vi.fn(),
    muteAll: vi.fn(),
    toast: null,
    dismiss: vi.fn(),
    ...o,
  };
}

function sheet(o: { kick?: KickController; mute?: MuteController } = {}) {
  const kick = o.kick ?? aKickController();
  const mute = o.mute ?? muteOf();
  const onClose = vi.fn();
  render(
    <ParticipantsSheet tiles={[me, ali, aliScreen]} kick={kick} mute={mute} onClose={onClose} />,
  );
  return { kick, mute, onClose };
}

describe('ParticipantsSheet', () => {
  it('lists each camera tile once, marks me and names the role', () => {
    sheet();
    const rows = within(screen.getByRole('list', { name: t.classroom.people })).getAllByRole(
      'listitem',
    );
    expect(rows).toHaveLength(2);
    expect(screen.getByText(`Me (${t.classroom.you})`)).toBeTruthy();
    expect(screen.getByText(t.classroom.roles.guest)).toBeTruthy();
  });

  it('mutes the microphone and the camera of the person on that row', () => {
    const { mute } = sheet();
    fireEvent.click(screen.getByRole('button', { name: M.micOf.replace('{name}', 'Ali') }));
    fireEvent.click(screen.getByRole('button', { name: M.camOf.replace('{name}', 'Ali') }));
    expect(mute.mute).toHaveBeenCalledWith(ali, 'microphone');
    expect(mute.mute).toHaveBeenCalledWith(ali, 'camera');
  });

  it('asks before removing someone and offers no removal on myself', () => {
    const { kick } = sheet();
    fireEvent.click(screen.getByRole('button', { name: K.actionOf.replace('{name}', 'Ali') }));
    expect(kick.ask).toHaveBeenCalledWith(ali);
    expect(screen.queryByRole('button', { name: K.actionOf.replace('{name}', 'Me') })).toBeNull();
  });

  it('mutes everyone at once when allowed', () => {
    const { mute } = sheet();
    fireEvent.click(screen.getByRole('button', { name: M.all }));
    expect(mute.muteAll).toHaveBeenCalledOnce();
  });

  it('shows no actions when nothing is allowed', () => {
    sheet({
      kick: aKickController({ canKick: () => false }),
      mute: muteOf({ canMute: () => false, canMuteAll: false }),
    });
    expect(screen.queryByRole('button', { name: M.all })).toBeNull();
    expect(screen.queryByRole('button', { name: K.actionOf.replace('{name}', 'Ali') })).toBeNull();
    expect(screen.queryByRole('button', { name: M.micOf.replace('{name}', 'Ali') })).toBeNull();
  });
});
