import { router } from 'expo-router';

/** «رجوع»: the previous screen, or «المزيد» when the screen was opened directly (a link). */
export const backToMore = () => (router.canGoBack() ? router.back() : router.replace('/more'));

/** Back to «المستخدمون» from a user or the create form. */
export const backToUsers = () => (router.canGoBack() ? router.back() : router.replace('/more/users'));
