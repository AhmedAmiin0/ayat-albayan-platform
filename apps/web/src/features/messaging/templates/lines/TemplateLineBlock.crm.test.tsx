import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { lineView } from './template-lines-fixture';
import { TemplateLineBlock } from './TemplateLineBlock';

// docs/39: a crm number's templates live in the CRM; «مزامنة» reads their status from it.

describe('TemplateLineBlock on a crm line', () => {
  it('says the templates live in the CRM and offers its sync', () => {
    renderWithClient(<TemplateLineBlock line="notifications" facts={lineView('notifications', { provider: 'crm', waba_id: null })} phone={undefined} onNotice={vi.fn()} />);
    expect(screen.getByText(t.templates.perNumber.crmManaged)).toBeTruthy();
    expect(screen.getByText(t.integrations.options.crm)).toBeTruthy();
    const name = t.enums.waLine.notifications;
    expect(screen.getByRole('button', { name: t.templates.perNumber.syncFor.replace('{line}', name) })).toBeTruthy();
    expect(screen.getByText(t.templates.perNumber.neverSynced)).toBeTruthy();
  });
});
