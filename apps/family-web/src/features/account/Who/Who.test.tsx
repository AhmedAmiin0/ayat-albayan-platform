import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit';
import { home, kid } from '@ab/web-kit/testing';
import { renderAt } from '@/test/render-at';
import { Who } from './Who';

const A = t.portal.app.account;

describe('who signed in, at the top of «حسابي»', () => {
  it('a guardian: their name, the role and their WhatsApp number', async () => {
    renderAt(<Who home={home({ guardian: { name: 'أحمد', phone: '+966500000001' } })} />);
    expect(await screen.findByRole('heading', { level: 2, name: 'أحمد' })).toBeTruthy();
    expect(screen.getByText(A.roleGuardian)).toBeTruthy();
    expect(screen.getByText('+966500000001')).toBeTruthy();
  });

  it('a guardian from an older API without their own row: the role as the name', async () => {
    renderAt(<Who home={home({ guardian: null })} />);
    expect(await screen.findByRole('heading', { level: 2, name: A.guardian })).toBeTruthy();
  });

  it('a student: their name, the role and their code', async () => {
    renderAt(<Who home={home({ kind: 'student', students: [kid()] })} />);
    expect(await screen.findByRole('heading', { level: 2, name: kid().name })).toBeTruthy();
    expect(screen.getByText(A.roleStudent)).toBeTruthy();
    expect(screen.getByText(kid().code)).toBeTruthy();
  });

  it('a student login with no student row: the role as the name', async () => {
    renderAt(<Who home={home({ kind: 'student', students: [] })} />);
    expect(await screen.findByRole('heading', { level: 2, name: A.roleStudent })).toBeTruthy();
  });
});
