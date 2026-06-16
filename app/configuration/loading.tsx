export default function LoadingConfiguration() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 animate-pulse">
      <div className="h-8 w-44 rounded-md bg-muted" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
