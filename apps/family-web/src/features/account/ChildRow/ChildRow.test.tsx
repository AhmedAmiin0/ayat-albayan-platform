import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { kid } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { ChildRow } from './ChildRow';

const teacher = vi.hoisted(() => ({ name: null as string | null }));
vi.mock('@/features/account/use-child-teacher', () => ({ useChildTeacher: () => teacher.name }));

const A = t.portal.app.account;

beforeEach(() => {
  teacher.name = null;
});

describe('ChildRow', () => {
  it('the label and the code; no teacher until one is known', async () => {
    renderAt(<ChildRow student={kid()} label="سلمى" current={false} onChoose={vi.fn()} />);
    const row = await screen.findByRole('button', { name: /AB-0201/ });
    expect(row.textContent).toContain('سلمى');
    expect(row.textContent).not.toContain('·');
  });

  it('the next teacher after the code', async () => {
    teacher.name = 'أبرار';
    renderAt(<ChildRow student={kid()} label="سلمى" current={false} onChoose={vi.fn()} />);
    const row = await screen.findByRole('button', { name: /AB-0201/ });
    expect(row.textContent).toContain('أبرار');
  });

  it('the child in view is marked current and says so', async () => {
    renderAt(<ChildRow student={kid()} label="سلمى" current onChoose={vi.fn()} />);
    const row = await screen.findByRole('button', { name: /AB-0201/ });
    expect(row.getAttribute('aria-current')).toBe('true');
    expect(row.textContent).toContain(A.inView);
  });

  it('another child is not marked, and a tap chooses it', async () => {
    const onChoose = vi.fn();
    renderAt(<ChildRow student={kid()} label="سلمى" current={false} onChoose={onChoose} />);
    const row = await screen.findByRole('button', { name: /AB-0201/ });
    expect(row.getAttribute('aria-current')).toBeNull();
    expect(row.textContent).not.toContain(A.inView);
    fireEvent.click(row);
    expect(onChoose).toHaveBeenCalledTimes(1);
  });
});
