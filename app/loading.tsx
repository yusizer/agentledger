/** Route-level loading skeleton — shown while the dashboard segment streams. */
export default function Loading() {
  return (
    <main className="min-h-screen max-w-6xl mx-auto px-4 py-8">
      <div className="h-9 w-56 bg-slate-800/60 rounded animate-pulse mb-2" />
      <div className="h-4 w-80 bg-slate-800/50 rounded animate-pulse mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="panel rounded-lg p-4 h-20 animate-pulse">
            <div className="h-6 w-24 bg-slate-700/60 rounded mb-2" />
            <div className="h-3 w-32 bg-slate-700/50 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="panel rounded-lg p-4 h-40 animate-pulse">
            <div className="h-3 w-20 bg-slate-700/60 rounded mb-3" />
            <div className="h-4 w-full bg-slate-700/60 rounded mb-2" />
            <div className="h-4 w-2/3 bg-slate-700/60 rounded mb-4" />
            <div className="h-6 w-24 bg-slate-700/60 rounded" />
          </div>
        ))}
      </div>
    </main>
  );
}
