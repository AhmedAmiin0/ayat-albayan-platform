import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { CrmStatusActions } from './CrmStatusActions';
import { templateName } from './template-cells';
import { template as templateView } from '@/features/inbox/testing/inbox-fixture';

// docs/19 «crm driver»: the admin says by hand whether the CRM holds the template approved.

const s = t.templates.crmStatus;

describe('CrmStatusActions', () => {
  it('offers only the status the row does not have, each named with its template', () => {
    const onSet = vi.fn();
    const tpl = templateView({ status: 'pending' });
    const { rerender } = render(<CrmStatusActions tpl={tpl} busy={false} onSet={onSet} />);
    const name = templateName(tpl.key);
    expect(screen.getByRole('button', { name: s.missingFor.replace('{name}', name) })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: s.missingFor.replace('{name}', name) }));
    expect(onSet).toHaveBeenCalledWith(tpl, 'missing');
    rerender(<CrmStatusActions tpl={{ ...tpl, status: 'approved' }} busy={false} onSet={onSet} />);
    expect(screen.queryByText(s.approved)).toBeNull();
    expect(screen.getByText(s.missing)).toBeTruthy();
  });

  it('marking it approved takes an explicit confirm that names its consequence; cancel goes back', () => {
    const onSet = vi.fn();
    const tpl = templateView({ status: 'missing' });
    render(<CrmStatusActions tpl={tpl} busy={false} onSet={onSet} />);
    const name = templateName(tpl.key);
    fireEvent.click(screen.getByRole('button', { name: s.approvedFor.replace('{name}', name) }));
    expect(onSet).not.toHaveBeenCalled();
    const confirm = screen.getByRole('button', { name: s.confirmFor.replace('{name}', name) });
    expect(confirm.getAttribute('aria-label')).toContain(confirm.textContent);
    expect(screen.getByText(s.confirmHint).id).toBe(confirm.getAttribute('aria-describedby'));
    fireEvent.click(screen.getByRole('button', { name: t.common.cancel }));
    expect(screen.queryByText(s.confirm)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: s.approvedFor.replace('{name}', name) }));
    expect(document.activeElement?.textContent).toBe(t.common.cancel);
    fireEvent.click(screen.getByRole('button', { name: s.confirmFor.replace('{name}', name) }));
    expect(onSet).toHaveBeenCalledWith(tpl, 'approved');
  });

  it('after confirming, the confirm closes: the row offers «غير متاح» again, not a second confirm', () => {
    const onSet = vi.fn();
    const tpl = templateView({ status: 'missing' });
    const { rerender } = render(<CrmStatusActions tpl={tpl} busy={false} onSet={onSet} />);
    const name = templateName(tpl.key);
    fireEvent.click(screen.getByRole('button', { name: s.approvedFor.replace('{name}', name) }));
    fireEvent.click(screen.getByRole('button', { name: s.confirmFor.replace('{name}', name) }));
    rerender(<CrmStatusActions tpl={{ ...tpl, status: 'approved' }} busy={false} onSet={onSet} />);
    expect(screen.queryByText(s.confirm)).toBeNull();
    expect(screen.queryByText(s.confirmHint)).toBeNull();
    expect(screen.getByRole('button', { name: s.missingFor.replace('{name}', name) })).toBeTruthy();
  });

  it('waits while the row is being saved', () => {
    render(<CrmStatusActions tpl={templateView({ status: 'missing' })} busy onSet={vi.fn()} />);
    expect((screen.getByText(s.approved).closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
