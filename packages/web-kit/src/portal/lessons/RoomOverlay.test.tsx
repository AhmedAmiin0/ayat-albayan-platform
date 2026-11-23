import type { RoomJoinResult } from '@ab/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { renderPortal } from '@ab/web-kit/portal/portal.render';
import { RoomOverlay } from './RoomOverlay';

vi.mock('@ab/web-kit/classroom/room/components/ClassroomRoom/ClassroomRoom', () => ({
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
