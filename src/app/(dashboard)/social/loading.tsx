/**
 * Social Media Loading Skeleton
 */

export default function SocialLoading() {
  return (
    <div className="animate-pulse p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 w-40 rounded bg-[var(--color-bg-secondary)]" />
        <div className="mt-2 h-4 w-64 rounded bg-[var(--color-bg-secondary)]" />
      </div>

      {/* Platform cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)]"
          />
        ))}
      </div>

      {/* History tables */}
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
            <div className="h-12 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div
                key={j}
                className="h-14 border-b border-[var(--color-border)] last:border-b-0"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
