export default function LoadingFinanceiro() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 animate-pulse">
      <div className="h-8 w-40 rounded-md bg-muted" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-10 w-full rounded-md bg-muted" />
      <div className="rounded-xl border bg-muted/30 overflow-hidden">
        <div className="h-10 bg-muted" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 border-t bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
