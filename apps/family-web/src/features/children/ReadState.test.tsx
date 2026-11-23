import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/i18n';
import { ReadState } from './ReadState';
import type { ChildSummaryRead } from './use-child-summary';

const read = (over: Partial<ChildSummaryRead>): ChildSummaryRead =>
  ({ loading: false, failed: false, retry: vi.fn(async () => []), ...over }) as ChildSummaryRead;

describe('a child card waits for every read (audit 2026-11-19 #19b)', () => {
  it('loading: a skeleton, not the figures', () => {
    render(<ReadState read={read({ loading: true })}>figures</ReadState>);
    expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByText('figures')).toBeNull();
  });

  it('a failed read: the error and a retry, never a false «no report yet»', () => {
    const failed = read({ failed: true });
    render(<ReadState read={failed}>figures</ReadState>);
    expect(screen.getByRole('alert').textContent).toContain(t.portal.loadFailed);
    fireEvent.click(screen.getByRole('button', { name: t.portal.retry }));
    expect(failed.retry).toHaveBeenCalled();
    expect(screen.queryByText('figures')).toBeNull();
  });

  it('every read in: the figures', () => {
    render(<ReadState read={read({})}>figures</ReadState>);
    expect(screen.getByText('figures')).toBeTruthy();
  });
});
