export default function LoadingPartidas() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 animate-pulse">
      <div className="h-8 w-36 rounded-md bg-muted" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-md bg-muted" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
