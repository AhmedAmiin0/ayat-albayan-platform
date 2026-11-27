import { routePath } from '@ab/core';
import { describe, expect, it } from 'vitest';
import { exportRoutes as routes } from '..';

const STUDENT = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const RANGE = { from: '2026-10-01', to: '2026-10-07' };

describe('exportRoutes', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(routes).map((r) => `${r.method} ${r.path}`)).toEqual([
      'GET /exports/students.csv',
      'GET /exports/lessons.csv',
      'GET /exports/payments.csv',
      'GET /exports/payouts.csv',
      'GET /exports/expenses.csv',
      'GET /exports/teacher-ledger.csv',
      'GET /exports/receivables.csv',
    ]);
  });

  it('answers a file, on exports.read, under exports', () => {
    for (const route of Object.values(routes)) {
      expect(route.response).toBe('file');
      expect(route.permissions).toEqual(['exports.read']);
      expect(route.tags).toEqual(['exports']);
    }
  });

  it('builds a download path with no params', () => {
    expect(routePath(routes['teacher-ledger'])).toBe('/exports/teacher-ledger.csv');
  });

  it('reads a payments range with its filters and refuses a range over a year', () => {
    const query = { ...RANGE, studentId: STUDENT, method: 'bank', kind: 'payment' };
    expect(routes.payments.query.safeParse(query).success).toBe(true);
    const long = routes.payments.query.safeParse({ from: '2025-01-01', to: '2026-10-01' });
    expect(long.error?.issues.map((i) => i.message)).toContain('range_too_large');
    expect(routes.payments.query.safeParse({ ...RANGE, method: 'gold' }).success).toBe(false);
  });

  it('reads payouts by month and refuses month 13 as invalid_month', () => {
    expect(routes.payouts.query.parse({ month: '2026-09' })).toEqual({ month: '2026-09' });
    const bad = routes.payouts.query.safeParse({ month: '2026-13' });
    expect(bad.error?.issues.map((i) => i.message)).toEqual(['invalid_month']);
  });

  it('reads expenses by month or by year, never neither', () => {
    expect(routes.expenses.query.parse({ month: '2026-09' })).toEqual({ month: '2026-09' });
    expect(routes.expenses.query.parse({ year: '2026' })).toEqual({ year: '2026' });
    expect(routes.expenses.query.safeParse({ year: '26' }).success).toBe(false);
    expect(routes.expenses.query.safeParse({}).success).toBe(false);
  });

  it('reads the ledger month with an optional teacher', () => {
    expect(routes['teacher-ledger'].query.parse({ month: '2026-09' })).toEqual({
      month: '2026-09',
    });
    const teacher = { month: '2026-09', teacherId: 'x' };
    expect(routes['teacher-ledger'].query.safeParse(teacher).success).toBe(false);
  });
});
