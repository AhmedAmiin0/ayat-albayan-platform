import type { Permission } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { adminRedirect, firstAllowedPage, pagePermission } from './admin-access';
import { canDo, type Me } from './me';

const me = (...permissions: Permission[]): Me => ({ id: 'u1', email: null, role: 'admin', permissions });

describe('pagePermission', () => {
  it('maps the home, pages and their sub-pages', () => {
    expect(pagePermission('/admin')).toBe('dashboard.read');
    expect(pagePermission('/admin/')).toBe('dashboard.read');
    expect(pagePermission('/admin/payments')).toBe('payments.read');
    expect(pagePermission('/admin/students/abc/reports')).toBe('students.read');
    expect(pagePermission('/admin/roles')).toBe('roles.manage');
  });

  it('«التواصل» at /admin/communications needs what /admin/settings needs', () => {
    expect(pagePermission('/admin/communications')).toBe(pagePermission('/admin/settings/communications'));
    expect(pagePermission('/admin/communications')).toBe('settings.read');
    expect(adminRedirect(me('payments.read'), '/admin/communications')).toBe('/admin/payments');
    expect(adminRedirect(me('settings.read'), '/admin/communications')).toBeNull();
  });

  it('does not confuse prefixes and leaves unknown paths open', () => {
    expect(pagePermission('/admin/paymentsx')).toBeNull();
    expect(pagePermission('/teacher')).toBeNull();
  });
});

describe('adminRedirect', () => {
  it('lets a permitted page through', () => {
    expect(adminRedirect(me('payments.read'), '/admin/payments')).toBeNull();
  });

  it('sends «محاسب» from the dashboard or students to its first page', () => {
    expect(adminRedirect(me('payments.read'), '/admin')).toBe('/admin/payments');
    expect(adminRedirect(me('payments.read'), '/admin/students')).toBe('/admin/payments');
  });

  it('sends a user with no admin page to /login', () => {
    expect(adminRedirect(me(), '/admin')).toBe('/login');
    expect(firstAllowedPage(null)).toBeNull();
  });

  it('keeps the system admin on the dashboard', () => {
    expect(firstAllowedPage(me('dashboard.read', 'payments.read'))).toBe('/admin');
  });
});

describe('canDo', () => {
  it('is false when signed out', () => {
    expect(canDo(null, 'payments.read')).toBe(false);
    expect(canDo(me('payments.read'), 'payments.read')).toBe(true);
  });
});
