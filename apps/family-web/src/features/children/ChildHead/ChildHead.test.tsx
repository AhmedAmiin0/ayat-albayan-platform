import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit';
import { kid } from '@ab/web-kit/testing';
import { ChildHead } from './ChildHead';

const code = t.portal.code.replace('{code}', 'AB-0201');

describe('ChildHead', () => {
  it('the child name as the heading, then the code', () => {
    render(<ChildHead student={kid()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'سلمى' })).toBeTruthy();
    expect(screen.getByText(code)).toBeTruthy();
  });

  it('a greeting above the name when given', () => {
    render(<ChildHead student={kid()} over="مرحبًا" />);
    expect(screen.getByText('مرحبًا')).toBeTruthy();
  });

  it('no greeting line without one', () => {
    const { container } = render(<ChildHead student={kid()} />);
    expect(container.querySelectorAll('p')).toHaveLength(1);
  });
});
