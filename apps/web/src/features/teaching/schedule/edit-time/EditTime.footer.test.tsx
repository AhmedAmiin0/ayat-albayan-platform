import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { fakeNow, openEditTime, SCHEDULED } from './edit-time-fixture';

vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(async () => []), apiSend: vi.fn() }));

describe('«عدّل الوقت» form footer (docs/07 «الأزرار»)', () => {
  fakeNow();

  it('submit (primary) first and «رجوع» (secondary) share one sticky ButtonRow', () => {
    openEditTime(SCHEDULED);
    const submit = screen.getByRole('button', { name: t.lessons.timeEdit.submit });
    const back = screen.getByRole('button', { name: t.lessons.back });
    const row = submit.parentElement;
    expect(row).toBe(back.parentElement);
    expect(row?.firstElementChild).toBe(submit);
    expect(row?.className).toContain('*:flex-[1_1_0]');
    expect(row?.className).toContain('sticky');
    expect(submit.className).toContain('bg-primary');
    expect(back.className).toContain('border-input');
  });

  it('«عدّل الوقت» in the drawer fills its column, 48px on phones', () => {
    openEditTime(SCHEDULED);
    fireEvent.click(screen.getByRole('button', { name: t.lessons.back }));
    const edit = screen.getByRole('button', { name: t.lessons.editTime });
    expect(edit.className).toContain('min-h-12');
    expect(edit.parentElement?.className).not.toContain('justify-items-start');
  });
});
