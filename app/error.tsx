"use client";

/** Route-level error boundary — catches render/runtime errors in the segment
 *  and offers a reset instead of a blank page. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen max-w-6xl mx-auto px-4 py-8">
      <div className="panel rounded-lg p-10 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h2 className="text-lg font-semibold text-white mb-1">Something went wrong</h2>
        <p className="text-sm text-slate-400 mb-5">
          {error.message || "Unexpected error loading the dashboard."}
        </p>
        <button
          onClick={reset}
          className="text-sm text-brand border border-brand/40 rounded px-4 py-2 hover:bg-brand/10"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
