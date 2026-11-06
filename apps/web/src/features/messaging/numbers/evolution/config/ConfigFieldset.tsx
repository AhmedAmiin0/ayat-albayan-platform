import type { ReactNode } from 'react';

/** One section of «إعدادات Evolution» (a fieldset named by its legend). */
export function ConfigFieldset({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3 rounded-md border border-rule p-3">
      <legend className="px-1 text-sm font-bold">{legend}</legend>
      {children}
    </fieldset>
  );
}
