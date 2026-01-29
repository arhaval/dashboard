/**
 * Login Page
 * Authentication page for team members
 * No self-registration - users are managed by admin
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LoginForm } from './login-form';
import { tr } from '@/lib/i18n';

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Check if already authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/');
  }

  // Get error message if any
  const errorMessages: Record<string, string> = {
    unauthorized: 'Bu uygulamaya erişim yetkiniz yok.',
    inactive: 'Hesabınız devre dışı bırakıldı. Yönetici ile iletişime geçin.',
    invalid_credentials: tr.messages.error.invalidCredentials,
  };

  const errorMessage = params.error ? errorMessages[params.error] : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-accent)]">
            <span className="text-xl font-bold text-white">A</span>
          </div>
          <h1 className="text-display text-2xl text-[var(--color-text-primary)]">
            Arhaval
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            İç Operasyon Paneli
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-error)] bg-[var(--color-error-muted)] px-4 py-3 text-sm text-[var(--color-error)]">
            {errorMessage}
          </div>
        )}

        {/* Login Form */}
        <LoginForm />

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-[var(--color-text-muted)]">
          Erişim için yönetici ile iletişime geçin.
        </p>
      </div>
    </div>
  );
}
