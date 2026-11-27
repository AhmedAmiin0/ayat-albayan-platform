import { usePasswordForm } from '../use-password-form';

export function usePasswordSection() {
  const { values, setCurrent, setNext, setConfirm, action, save, empty } = usePasswordForm();
  return { values, setCurrent, setNext, setConfirm, action, save, empty };
}
