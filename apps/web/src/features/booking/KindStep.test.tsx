import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { emptyDraft } from './draft';
import { KindStep } from './KindStep';

const STUDENT = { id: 's-1', name: 'سهيلة', code: 'AB-0183' };

describe('KindStep «نوع الحجز» (R-SCH-10)', () => {
  it('offers the three types with the owner’s wording, in order, marked required', () => {
    render(<KindStep draft={emptyDraft()} leadPath={false} onChange={vi.fn()} />);
    const group = screen.getByRole('group', { name: /نوع الحجز/ });
    expect(group.querySelector('legend')?.textContent).toBe('نوع الحجز *');
    expect(within(group).getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual([
      'حلقة تجريبية مجانية فقط',
      'اشتراك',
      'حجز تعويضي',
    ]);
    expect(within(group).getByRole('radio', { name: 'اشتراك' })).toHaveProperty('checked', true);
  });

  it('picking a type resets what depended on the old one', () => {
    const onChange = vi.fn();
    render(<KindStep draft={{ ...emptyDraft(), students: [STUDENT, { ...STUDENT, id: 's-2' }] }} leadPath={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: t.booking.kind.makeup }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ kind: 'makeup', missed: null, invoice: null, startsAt: null, students: [STUDENT] }));
    fireEvent.click(screen.getByRole('radio', { name: t.booking.kind.trial }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ kind: 'trial', pkg: 'trial' }));
  });

  it('a lead (no student yet) cannot pick a makeup, and is told why', () => {
    const onChange = vi.fn();
    render(<KindStep draft={emptyDraft({ leadId: 'l1' })} leadPath onChange={onChange} />);
    const makeup = screen.getByRole('radio', { name: t.booking.kind.makeup });
    expect(makeup.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(t.booking.kind.makeupNeedsStudent)).toBeTruthy();
    expect(screen.getByRole('radio', { name: t.booking.kind.trial }).hasAttribute('disabled')).toBe(false);
  });
});
