import { useNavigate, useRouter } from '@tanstack/react-router';

export function useFamilyReportPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const back = () =>
    router.history.canGoBack() ? router.history.back() : void navigate({ to: '/portal' });
  return { back };
}
