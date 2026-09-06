"use client";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Retry",
  icon = "error_outline",
}: ErrorStateProps) {
  return (
    <div className="bg-surface-container rounded-xl border border-outline-variant/30 p-8 text-center">
      <span className="material-symbols-outlined text-error text-4xl mb-3 block">
        {icon}
      </span>
      <p className="font-headline text-lg text-on-surface mb-2">{title}</p>
      <p className="font-body text-body-md text-on-surface-variant mb-4">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container font-label text-label-sm font-bold uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(217,119,7,0.4)] transition-all"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
