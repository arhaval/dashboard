'use client';

/**
 * Generic form state hook for common form patterns
 * Reduces boilerplate in form components
 */

import { useState, useTransition, useCallback } from 'react';

interface UseFormStateOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<{ success?: boolean; error?: string }>;
  onSuccess?: () => void;
}

interface UseFormStateReturn<T> {
  values: T;
  error: string | null;
  isPending: boolean;
  setValue: <K extends keyof T>(key: K, value: T[K]) => void;
  setValues: (partial: Partial<T>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  reset: () => void;
}

export function useFormState<T extends Record<string, unknown>>({
  initialValues,
  onSubmit,
  onSuccess,
}: UseFormStateOptions<T>): UseFormStateReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValuesState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setValues = useCallback((partial: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...partial }));
  }, []);

  const reset = useCallback(() => {
    setValuesState(initialValues);
    setError(null);
  }, [initialValues]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      startTransition(async () => {
        const result = await onSubmit(values);
        if (result.error) {
          setError(result.error);
        } else {
          reset();
          onSuccess?.();
        }
      });
    },
    [values, onSubmit, onSuccess, reset],
  );

  return {
    values,
    error,
    isPending,
    setValue,
    setValues,
    handleSubmit,
    reset,
  };
}
