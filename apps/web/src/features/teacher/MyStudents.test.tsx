import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { MyStudents } from './MyStudents';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

const KIDS = [{ id: 's1', code: 'AB-0001', name: 'إيمان محمد', tz: 'Africa/Cairo', status: 'active' as const }];

describe('MyStudents', () => {
  it('home tab: with the account status; the report history leaves it out', () => {
    const { rerender } = render(<MyStudents students={KIDS} />);
    expect(screen.getByRole('columnheader', { name: t.students.status })).toBeTruthy();
    expect(within(screen.getByRole('table')).getByText(t.enums.studentStatus.active)).toBeTruthy();
    rerender(<MyStudents students={KIDS} showStatus={false} />);
    expect(screen.queryByRole('columnheader', { name: t.students.status })).toBeNull();
    expect(screen.queryByText(t.enums.studentStatus.active)).toBeNull();
  });
});
