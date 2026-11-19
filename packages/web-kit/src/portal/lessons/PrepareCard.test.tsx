import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PrepareCard } from './PrepareCard';

const prepare = {
  homework: 'حفظ سورة النبأ.',
  next_plan: '',
  report_id: 'r1',
  lesson_starts_at: '2026-11-15T14:00:00.000Z',
};

describe('PrepareCard «ما المطلوب للحلقة القادمة»', () => {
  it('the teacher’s words follow their own direction (Arabic homework on an English page)', () => {
    render(<PrepareCard lessons={{ prepare }} />);
    expect(screen.getByText(t.portal.prepareTitle)).toBeTruthy();
    expect(screen.getByText('حفظ سورة النبأ.').getAttribute('dir')).toBe('auto');
    // An empty text is left out.
    expect(screen.queryByText(t.portal.nextPlan)).toBeNull();
  });

  it('nothing to prepare: no card', () => {
    const { container } = render(<PrepareCard lessons={{ prepare: null }} />);
    expect(container.textContent).toBe('');
  });
});
