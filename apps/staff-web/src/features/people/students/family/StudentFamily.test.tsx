import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { StudentFamily } from './StudentFamily';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/reporting/dashboard/link-mock')).Link }));

const f = t.students.family;
const SISTER = { id: 's2', code: 'AB-0002', name: 'مريم', status: 'paused' as const };

describe('StudentFamily «العائلة»', () => {
  it('each sibling links to their own file, with the status and code', () => {
    render(<StudentFamily siblings={[SISTER]} contactIsSelf={false} />);
    const link = screen.getByRole('link', { name: f.openStudent.replace('{name}', 'مريم') });
    expect(link.getAttribute('href')).toBe('/admin/students/s2');
    expect(link.textContent).toContain(t.enums.studentStatus.paused);
    expect(link.textContent).toContain('AB-0002');
    expect(screen.queryByText(f.contactIsSelf)).toBeNull();
  });

  it('a student who is their own contact says so', () => {
    render(<StudentFamily siblings={[]} contactIsSelf />);
    expect(screen.getByText(f.contactIsSelf)).toBeTruthy();
    expect(screen.queryByText(`${f.siblings}:`)).toBeNull();
  });

  it('no siblings and the guardian is the contact: nothing', () => {
    const { container } = render(<StudentFamily siblings={[]} contactIsSelf={false} />);
    expect(container.innerHTML).toBe('');
  });
});
