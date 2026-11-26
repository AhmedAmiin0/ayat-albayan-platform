import { describe, expect, it } from 'vitest';
import { expenseRoutes } from '../expenses.routes';

const category = { key: 'rent', label_ar: 'إيجار', label_en: null, active: true };

describe('expenseRoutes: categories', () => {
  it('keeps the paths the api serves today', () => {
    const { categories, addCategory } = expenseRoutes;
    expect(`${categories.method} ${categories.path}`).toBe('GET /expense-categories');
    expect(`${addCategory.method} ${addCategory.path}`).toBe('POST /expense-categories');
  });

  it('answers the categories and the one added', () => {
    expect(expenseRoutes.categories.response.parse([category])).toEqual([category]);
    expect(expenseRoutes.addCategory.response.parse(category)).toEqual(category);
  });

  it('takes a new category with its Arabic label', () => {
    const body = { key: 'fuel', labelAr: 'وقود' };
    expect(expenseRoutes.addCategory.body.parse(body)).toEqual(body);
  });

  it.each([
    ['a key with capitals', { key: 'Fuel', labelAr: 'وقود' }],
    ['no Arabic label', { key: 'fuel' }],
  ])('refuses %s', (_name, body) => {
    expect(expenseRoutes.addCategory.body.safeParse(body).success).toBe(false);
  });

  it.each([
    ['no active flag', { ...category, active: undefined }],
    ['a missing English label', { key: 'rent', label_ar: 'إيجار', active: true }],
  ])('refuses an answer with %s', (_name, answer) => {
    expect(expenseRoutes.addCategory.response.safeParse(answer).success).toBe(false);
  });
});
