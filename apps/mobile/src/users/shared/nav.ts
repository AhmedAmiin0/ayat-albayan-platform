import { backWithin } from '@/core/nav/back-within';

/** «رجوع»: the previous screen, or «المزيد» when the screen was opened directly (a link). */
export const backToMore = () => backWithin('/more');

/** Back to «المستخدمون» from a user or the create form. */
export const backToUsers = () => backWithin('/more/users');
