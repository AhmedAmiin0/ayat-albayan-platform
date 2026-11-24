import { backWithin } from '@/core/nav/back-within';

/** Goes to more when the screen was opened directly from a link. */
export const backToMore = () => backWithin('/more');

export const backToUsers = () => backWithin('/more/users');
