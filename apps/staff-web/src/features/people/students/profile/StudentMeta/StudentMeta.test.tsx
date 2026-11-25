import { formatPhone } from '@ab/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { StudentMeta } from './StudentMeta';
import type { StudentMetaProps } from './StudentMeta.types';

vi.mock('@tanstack/react-router', async (orig) => ({
  ...(await orig<object>()),
  Link: (await import('@/features/reporting/dashboard/link-mock')).Link,
}));

const MAIN = '+966500000001';
const SECOND = '+966552220000';
const GUARDIAN = { id: 'g1', name: 'أم سهيلة', phone_e164: MAIN };
const student = (over: Partial<StudentMetaProps['student']> = {}) => ({
  code: 'AB-0183',
  guardian: GUARDIAN,
  meeting_link: null,
  ...over,
});

const terms = () => screen.getAllByRole('term').map((d) => d.textContent);
const values = () => screen.getAllByRole('definition').map((d) => d.textContent);

describe('StudentMeta', () => {
  it('lists code, guardian, phone and link, with a dash for a missing link', () => {
    render(<StudentMeta student={student()} />);
    expect(terms()).toEqual([
      t.students.code,
      t.students.guardian,
      t.students.guardianPhone,
      t.students.effectiveLink,
    ]);
    expect(values()).toEqual(['AB-0183', 'أم سهيلة', formatPhone(MAIN), '—']);
  });

  it('shows a dash for a student without a code', () => {
    render(<StudentMeta student={student({ code: null })} />);
    expect(values()[0]).toBe('—');
  });

  it('adds the second number after the guardian phone', () => {
    const phones = [
      { phone_e164: MAIN, is_primary: true },
      { phone_e164: SECOND, is_primary: false },
    ];
    render(<StudentMeta student={student({ guardian: { ...GUARDIAN, phones } })} />);
    expect(terms()[3]).toBe(t.guardians.secondPhone);
    expect(values()[3]).toBe(formatPhone(SECOND));
  });

  it('links the guardian name to the family chat', () => {
    render(<StudentMeta student={student()} />);
    const link = screen.getByRole('link', { name: 'أم سهيلة' });
    expect(link.getAttribute('href')).toBe(`/admin/inbox?page=1&phone=${encodeURIComponent(MAIN)}`);
  });

  it('shows the meeting link without its scheme, opening in a new tab', () => {
    render(<StudentMeta student={student({ meeting_link: 'https://meet.example/abc' })} />);
    const link = screen.getByRole('link', { name: 'meet.example/abc' });
    expect(link.getAttribute('href')).toBe('https://meet.example/abc');
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
