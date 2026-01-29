/**
 * Input Component
 * Base input primitive following the design system
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full',
          'rounded-[var(--radius-md)] border bg-[var(--color-bg-secondary)]',
          'px-3 py-2 text-sm',
          'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
          'transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-[var(--color-error)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
