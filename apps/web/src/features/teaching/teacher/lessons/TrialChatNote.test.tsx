import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrialChatNote } from './TrialChatNote';

describe('TrialChatNote (trial: no direct teacher ↔ family chat)', () => {
  it('a trial student: the note in Arabic', () => {
    render(<TrialChatNote status="trial" />);
    expect(screen.getByRole('note').textContent).toBe('التواصل مع أسرة طالب التجربة يكون عبر المبيعات.');
  });

  it.each(['active', 'paused', 'churned', undefined] as const)('%s: no note', (status) => {
    render(<TrialChatNote status={status} />);
    expect(screen.queryByRole('note')).toBeNull();
  });
});
