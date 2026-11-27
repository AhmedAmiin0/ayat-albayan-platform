import { router } from 'expo-router';

export const back = () => {
  if (router.canGoBack()) router.back();
};
