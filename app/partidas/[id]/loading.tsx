export default function LoadingPartidaDetalhes() {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 animate-pulse">
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-10 w-full max-w-xs rounded-md bg-muted" />
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  );
}
