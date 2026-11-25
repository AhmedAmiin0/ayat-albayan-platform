import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BookingWizardProps } from '@/features/teaching/booking/BookingWizard';
import { emptyDraft } from '@/features/teaching/booking/draft/draft';
import { KeptBookingWizard } from '@/features/teaching/booking/kept/KeptBookingWizard';
import { readKept, saveKept } from '@/features/teaching/booking/kept/kept-store';

const seen = vi.hoisted(() => ({ props: null as BookingWizardProps | null }));
vi.mock('@/features/teaching/booking/BookingWizard', () => ({
  BookingWizard: (props: BookingWizardProps) => {
    seen.props = props;
    return null;
  },
}));

const KEY = 'student:s-1';
const fresh = emptyDraft();
const typed = { ...fresh, meetingLink: 'https://meet.example/x' };

function mount(onUnfinished = vi.fn()) {
  render(
    <KeptBookingWizard
      keepKey={KEY}
      onUnfinished={onUnfinished}
      initial={fresh}
      primary={null}
      siblings={[]}
      onOpenStudent={vi.fn()}
    />,
  );
  return { onUnfinished, report: seen.props?.onProgress ?? (() => undefined) };
}

afterEach(() => sessionStorage.clear());

describe('KeptBookingWizard', () => {
  it('opens on the kept draft and its step when there is one', () => {
    saveKept(KEY, { draft: typed, step: 'slot' });
    mount();
    expect(seen.props?.initial).toEqual(typed);
    expect(seen.props?.initialStep).toBe('slot');
  });

  it('opens on the entry draft at the first step when nothing is kept', () => {
    mount();
    expect(seen.props?.initial).toBe(fresh);
    expect(seen.props?.initialStep).toBeUndefined();
  });

  it('keeps every change and says the booking is unfinished', () => {
    const { onUnfinished, report } = mount();
    report({ draft: typed, step: 'teacher', booked: false });
    expect(readKept(KEY)).toEqual({ draft: typed, step: 'teacher' });
    expect(onUnfinished).toHaveBeenLastCalledWith(true);
  });

  it('a finished booking clears the kept draft and lifts the guard', () => {
    const { onUnfinished, report } = mount();
    report({ draft: typed, step: 'review', booked: false });
    report({ draft: typed, step: 'review', booked: true });
    expect(readKept(KEY)).toBeUndefined();
    expect(onUnfinished).toHaveBeenLastCalledWith(false);
  });
});
