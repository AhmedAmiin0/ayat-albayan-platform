import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ConfirmDialog } from './ConfirmDialog';

const base = { title: t.expenses.deleteConfirm, confirmLabel: t.common.delete, pending: false, error: null, onConfirm: vi.fn(), onClose: vi.fn() };

describe('ConfirmDialog on phones', () => {
  it('a plain yes / no stays a compact floating card', () => {
    render(<ConfirmDialog {...base} />);
    expect(screen.getByRole('dialog').className).not.toContain('h-dvh');
  });

  it('with «السبب» it is a form: the full-screen sheet', () => {
    render(<ConfirmDialog {...base} withReason />);
    expect(screen.getByRole('dialog').className).toContain('max-sm:h-dvh');
    expect(screen.getByLabelText(t.finance.reason)).toBeTruthy();
  });
});
