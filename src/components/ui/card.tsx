/**
 * Card Component
 * Base card primitive following the design system
 * Tessera dili: düz yüzey, gölge yok, 1px --color-border kenar.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border)]',
        'bg-[var(--color-bg-secondary)]',
        className
      )}
      {...props}
    />
  )
);

Card.displayName = 'Card';

type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1 p-5', className)}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement>;

const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-[15px] font-semibold leading-tight tracking-tight',
        'text-[var(--color-text-primary)]',
        className
      )}
      {...props}
    />
  )
);

CardTitle.displayName = 'CardTitle';

type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-xs text-[var(--color-text-muted)]', className)}
    {...props}
  />
));

CardDescription.displayName = 'CardDescription';

type CardContentProps = React.HTMLAttributes<HTMLDivElement>;

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5 pt-0', className)} {...props} />
  )
);

CardContent.displayName = 'CardContent';

type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-5 pt-0', className)}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
