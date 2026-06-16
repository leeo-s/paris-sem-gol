export default function LoadingJogadorPerfil() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="size-20 rounded-full bg-muted" />
        <div className="flex flex-col gap-2">
          <div className="h-6 w-40 rounded-md bg-muted" />
          <div className="h-4 w-24 rounded-md bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  );
}
