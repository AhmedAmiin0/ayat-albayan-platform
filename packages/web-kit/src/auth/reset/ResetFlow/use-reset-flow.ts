import { useId, useState } from 'react';
import { codeOf } from '@ab/web-kit/auth/code/code-boxes';
import { useCodeFlow } from '@ab/web-kit/auth/code/use-code-flow';
import { authApi } from '@ab/web-kit/auth/login/auth-api';
import { newPasswordProblem } from '@ab/web-kit/auth/reset/reset-checks';
import type { Props } from './ResetFlow.types';
import { F } from './reset-flow.helpers';

export function useResetFlow({ mode, onDone }: Pick<Props, 'mode' | 'onDone'>) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const flow = useCodeFlow((value) => authApi.forgot({ identifier: value }));
  const forgot = mode === 'forgot';
  const titleId = useId();
  const save = () =>
    flow.guard(async () => {
      const code = codeOf(flow.digits);
      if (code === null || flow.target === null) return F.errors.code_incomplete;
      const problem = newPasswordProblem(password, confirm);
      if (problem) return problem;
      await authApi.reset({ identifier: flow.target, code, password });
      onDone(true);
      return undefined;
    });
  return {
    identifier,
    setIdentifier,
    password,
    setPassword,
    confirm,
    setConfirm,
    flow,
    forgot,
    titleId,
    save,
  };
}
