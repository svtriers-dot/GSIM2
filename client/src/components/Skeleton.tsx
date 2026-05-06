// Скелетоны для loading states. Tailwind animate-pulse.

interface Props {
  className?: string;
}

export function SkeletonLine({ className = "" }: Props) {
  return <div className={`animate-pulse bg-elevate-2 rounded ${className}`} />;
}

export function SkeletonCard({ className = "" }: Props) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 space-y-3 ${className}`}>
      <SkeletonLine className="h-4 w-2/3" />
      <SkeletonLine className="h-3 w-1/2" />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <SkeletonLine className="h-8" />
        <SkeletonLine className="h-8" />
        <SkeletonLine className="h-8" />
        <SkeletonLine className="h-8" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="bg-elevate-1 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonLine key={c} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Универсальный error block с retry-кнопкой
export function ErrorRetry({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
      <div className="text-sm text-red-700">
        <strong>Ошибка:</strong> {message}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 rounded-lg border border-red-300 bg-white text-sm text-red-700 hover:bg-red-100 whitespace-nowrap"
        >
          ↻ Повторить
        </button>
      )}
    </div>
  );
}
