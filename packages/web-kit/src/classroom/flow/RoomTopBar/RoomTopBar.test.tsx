import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import {
  EMPTY_SNAPSHOT,
  type RoomSnapshot,
} from '@ab/web-kit/classroom/room/components/room-types';
import { tile } from '@ab/web-kit/testing';
import { RoomTopBar } from './RoomTopBar';

const snap = (over: Partial<RoomSnapshot> = {}): RoomSnapshot => ({
  ...EMPTY_SNAPSHOT,
  status: 'connected',
  ...over,
});
const countName = (n: number) => t.mobileRoom.count.replace('{n}', String(n));

describe('RoomTopBar', () => {
  it('counts the camera tiles only and opens the people on a press', () => {
    const onPeople = vi.fn();
    const tiles = [tile({ key: 'a' }), tile({ key: 'b' }), tile({ key: 's', kind: 'screen' })];
    render(<RoomTopBar snap={snap({ tiles })} context={null} onPeople={onPeople} />);
    fireEvent.click(screen.getByRole('button', { name: countName(2) }));
    expect(onPeople).toHaveBeenCalledTimes(1);
    expect(screen.getByText(t.classroom.participants.replace('{n}', '2'))).toBeTruthy();
  });

  it('says it is waiting while one is alone', () => {
    const alone = snap({ tiles: [tile({ key: 'a' })] });
    render(<RoomTopBar snap={alone} context={null} onPeople={vi.fn()} />);
    expect(screen.getByText(t.classroom.waiting)).toBeTruthy();
  });

  it('says it is joining while connecting, and shows nothing of it once connected', () => {
    const { rerender } = render(
      <RoomTopBar snap={snap({ status: 'connecting' })} context={null} onPeople={vi.fn()} />,
    );
    expect(screen.getByText(t.classroom.joining)).toBeTruthy();
    rerender(<RoomTopBar snap={snap()} context={null} onPeople={vi.fn()} />);
    expect(screen.queryByText(t.classroom.joining)).toBeNull();
  });
});
