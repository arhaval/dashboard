/**
 * Login Form Component
 * Client component handling login form submission
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { tr } from '@/lib/i18n';

// Validation schema
const loginSchema = z.object({
  email: z.string().email(tr.auth.invalidEmail),
  password: z.string().min(1, tr.auth.passwordRequired),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = React.useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = React.useState<Partial<LoginFormData>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name as keyof LoginFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    // Clear server error on change
    if (serverError) {
      setServerError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    // Validate form data
    const result = loginSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors: Partial<LoginFormData> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof LoginFormData;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        setServerError(tr.messages.error.invalidCredentials);
        return;
      }

      // Successful login - redirect to dashboard
      router.push('/');
      router.refresh();
    } catch {
      setServerError(tr.messages.error.unexpected);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Server Error */}
          {serverError && (
            <div
              className={cn(
                'rounded-[var(--radius-md)]',
                'border border-[var(--color-error)]',
                'bg-[var(--color-error-muted)]',
                'px-4 py-3',
                'text-sm text-[var(--color-error)]'
              )}
            >
              {serverError}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" required>
              {tr.auth.email}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={tr.auth.emailPlaceholder}
              value={formData.email}
              onChange={handleChange}
              error={!!errors.email}
              autoComplete="email"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-[var(--color-error)]">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password" required>
              {tr.auth.password}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={tr.auth.passwordPlaceholder}
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              autoComplete="current-password"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-sm text-[var(--color-error)]">
                {errors.password}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {tr.auth.signIn}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
