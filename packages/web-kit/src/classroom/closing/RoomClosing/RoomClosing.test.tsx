import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { RoomClosing } from './RoomClosing';

type RoomClosingProps = ComponentProps<typeof RoomClosing>;

const base: RoomClosingProps = { kind: 'left', variant: 'family', failure: null, context: null };
const show = (over: Partial<RoomClosingProps> = {}) => render(<RoomClosing {...base} {...over} />);
const button = (name: string) => screen.queryByRole<HTMLButtonElement>('button', { name });

describe('RoomClosing', () => {
  it('tells the family it ended, who is still inside and under which lesson', () => {
    const context = { title: 'حلقة الفجر', presence: <span>المعلم في الحلقة</span> };
    show({ context });
    expect(screen.getByRole('status').textContent).toBe(t.classroom.ended);
    expect(screen.getByText(t.mobileRoom.left.body)).toBeTruthy();
    expect(screen.getByText('المعلم في الحلقة')).toBeTruthy();
    expect(screen.getByText('حلقة الفجر')).toBeTruthy();
  });

  it('keeps staff on the plain left screen: no family line, no presence', () => {
    show({ variant: 'staff', context: { title: 'x', presence: <span>في الحلقة</span> } });
    expect(screen.queryByText(t.mobileRoom.left.body)).toBeNull();
    expect(screen.queryByText('في الحلقة')).toBeNull();
  });

  it('rejoins and goes back, rejoin leading', () => {
    const onRejoin = vi.fn();
    const onBack = vi.fn();
    show({ onRejoin, onBack });
    fireEvent.click(button(t.classroom.rejoin) ?? document.body);
    fireEvent.click(button(t.mobileRoom.back) ?? document.body);
    expect(onRejoin).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('offers no rejoin once the lesson is over, only back', () => {
    show({ kind: 'final', onRejoin: vi.fn(), onBack: vi.fn() });
    expect(button(t.classroom.rejoin)).toBeNull();
    expect(button(t.mobileRoom.back)).toBeTruthy();
    expect(screen.getByText(t.roomFlow.ended.body)).toBeTruthy();
  });

  it('shows no buttons when the page passed neither', () => {
    show({ kind: 'removed' });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByRole('status').textContent).toBe(t.classroom.error.removed_from_room);
  });

  it('says a failed connect in its own words', () => {
    show({ kind: 'failed', failure: 'تعذر الاتصال بالخادم' });
    expect(screen.getByRole('status').textContent).toBe('تعذر الاتصال بالخادم');
  });

  it('disables rejoin with the joining words while it runs, and shows a refusal', () => {
    show({ onRejoin: vi.fn(), rejoin: { busy: true, note: 'الحلقة ممتلئة' } });
    expect(button(t.portal.joining)?.disabled).toBe(true);
    expect(screen.getByText('الحلقة ممتلئة')).toBeTruthy();
  });
});
