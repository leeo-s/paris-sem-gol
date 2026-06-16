export default function LoadingJogadores() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 rounded-md bg-muted" />
        <div className="h-9 w-32 rounded-md bg-muted" />
      </div>
      <div className="h-10 w-full rounded-md bg-muted" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 rounded-md bg-muted" />
        ))}
      </div>
      <div className="rounded-xl border bg-muted/30 overflow-hidden">
        <div className="h-10 bg-muted" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 border-t bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
