import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { template as templateView } from '@/features/messaging/inbox/testing/inbox-fixture';
import { t } from '@/lib/i18n/i18n';
import { CrmNameButton } from './CrmNameButton';
import { CrmNameDialog } from './CrmNameDialog';
import { templateName } from '../template-cells';

// docs/19 «crm driver»: the template's name / language in the CRM, by hand (crm lines only).

const s = t.templates.crmName;
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

describe('CrmNameDialog', () => {
  it('shows the default (the old script\'s name) as the placeholder; blank saves null = back to the default', () => {
    const onSave = vi.fn();
    const tpl = templateView({ key: 'teacher_new_student', meta_name: 'teacher_new_student', crm_name: 'x_old', crm_language: null });
    render(<CrmNameDialog template={tpl} busy={false} onSave={onSave} onClose={vi.fn()} />);
    expect(field(s.name).placeholder).toBe('teacher_lesson_v2');
    expect(field(s.name).value).toBe('x_old');
    fireEvent.change(field(s.name), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    expect(onSave).toHaveBeenCalledWith({ key: 'teacher_new_student', crm_name: null, crm_language: null });
  });

  it('a name outside Meta\'s rules is refused in the form, never sent', () => {
    const onSave = vi.fn();
    render(<CrmNameDialog template={templateView({})} busy={false} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.change(field(s.name), { target: { value: 'Report Session' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(s.invalid)).toBeTruthy();
    expect(field(s.name).getAttribute('aria-invalid')).toBe('true');
  });

  it('report_ready explains the old script\'s report_session switch; other templates do not', () => {
    const onSave = vi.fn();
    const { unmount } = render(<CrmNameDialog template={templateView({ key: 'report_ready', meta_name: 'report_ready' })} busy={false} onSave={onSave} onClose={vi.fn()} />);
    expect(screen.getByText(s.reportNote)).toBeTruthy();
    fireEvent.change(field(s.name), { target: { value: 'report_session' } });
    fireEvent.change(field(s.language), { target: { value: 'ar' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.save }));
    expect(onSave).toHaveBeenCalledWith({ key: 'report_ready', crm_name: 'report_session', crm_language: 'ar' });
    unmount();
    render(<CrmNameDialog template={templateView({})} busy={false} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText(s.reportNote)).toBeNull();
  });
});

describe('CrmNameButton', () => {
  it('names the CRM template in use and opens the editor for its row', () => {
    const onEdit = vi.fn();
    const tpl = templateView({ key: 'teacher_new_student', meta_name: 'teacher_new_student' });
    render(<CrmNameButton tpl={tpl} onEdit={onEdit} />);
    expect(screen.getByText('teacher_lesson_v2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: s.editFor.replace('{name}', templateName(tpl.key)) }));
    expect(onEdit).toHaveBeenCalledWith(tpl);
  });
});
