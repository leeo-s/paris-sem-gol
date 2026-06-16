export default function LoadingRank() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-md bg-muted" />
        <div className="h-9 w-36 rounded-lg bg-muted" />
      </div>
      <div className="h-64 rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-72 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
