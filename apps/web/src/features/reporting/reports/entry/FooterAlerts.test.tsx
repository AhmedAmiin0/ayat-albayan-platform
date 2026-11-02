import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { reportView } from '@/features/reporting/reports/report-fixture';
import { FooterAlerts } from './FooterAlerts';

describe('FooterAlerts', () => {
  it('the check, the API refusal and the block each read in their words', () => {
    const error = new ApiError(400, { issues: [{ message: 'invalid_range' }] });
    render(<FooterAlerts problem="missing_topic" error={error} block="not_started" report={reportView()} tz="Asia/Riyadh" />);
    expect(screen.getByText(t.reports.error.missing_topic)).toBeTruthy();
    expect(screen.getByText(t.reports.error.invalid_range)).toBeTruthy();
    expect(screen.getByText(t.reports.error.not_started)).toBeTruthy();
  });

  it('nothing to say: nothing shown', () => {
    const { container } = render(<FooterAlerts problem={null} error={null} block={null} report={reportView()} tz="Asia/Riyadh" />);
    expect(container.textContent).toBe('');
  });
});
