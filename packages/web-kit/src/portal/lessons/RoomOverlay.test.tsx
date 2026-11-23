import type { RoomJoinResult } from '@ab/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
import { renderPortal } from '#/portal/portal.render.tsx';
import { RoomOverlay } from './RoomOverlay';

vi.mock('#/classroom/room/components/ClassroomRoom/ClassroomRoom.tsx', () => ({
  ClassroomRoom: () => <p>room</p>,
}));

describe('RoomOverlay', () => {
  it('is a named modal dialog over the page, holding the room', () => {
    renderPortal(<RoomOverlay join={{} as RoomJoinResult} onRejoin={() => undefined} />);
    const dialog = screen.getByRole('dialog', { name: t.portal.roomTitle });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toBe('room');
  });
});
