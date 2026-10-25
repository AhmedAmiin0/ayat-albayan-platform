import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n/i18n';
import { lineView } from './template-lines-fixture';
import { TemplateLineBlock } from './TemplateLineBlock';

// docs/19 «crm driver»: a crm number's templates live in the CRM — no sync with Meta from here.

describe('TemplateLineBlock on a crm line', () => {
  it('says the templates are managed in the CRM and offers no sync', () => {
    renderWithClient(<TemplateLineBlock line="notifications" facts={lineView('notifications', { provider: 'crm', waba_id: null })} phone={undefined} onNotice={vi.fn()} />);
    expect(screen.getByText(t.templates.perNumber.crmManaged)).toBeTruthy();
    expect(screen.getByText(t.integrations.options.crm)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
