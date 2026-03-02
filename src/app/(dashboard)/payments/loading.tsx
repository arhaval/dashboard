/**
 * Payments Loading Skeleton
 */

export default function PaymentsLoading() {
  return (
    <div className="animate-pulse p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 w-32 rounded bg-[var(--color-bg-secondary)]" />
        <div className="mt-2 h-4 w-56 rounded bg-[var(--color-bg-secondary)]" />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-4 border-b border-[var(--color-border)] pb-2">
        <div className="h-8 w-40 rounded bg-[var(--color-bg-secondary)]" />
        <div className="h-8 w-40 rounded bg-[var(--color-bg-secondary)]" />
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          />
        ))}
      </div>

      {/* Table */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
        <div className="h-12 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-14 border-b border-[var(--color-border)] last:border-b-0"
          />
        ))}
      </div>
    </div>
  );
}
