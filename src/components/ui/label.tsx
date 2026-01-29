/**
 * Label Component
 * Form label primitive following the design system
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none',
        'text-[var(--color-text-secondary)]',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-[var(--color-error)]" aria-hidden="true">
          *
        </span>
      )}
    </label>
  )
);

Label.displayName = 'Label';

export { Label };
