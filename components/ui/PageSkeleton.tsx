export function PageSkeleton() {
  return (
    <div className="p-8 animate-pulse space-y-4">
      <div className="h-7 w-48 rounded bg-gray-200" />
      <div className="h-4 w-full max-w-xs rounded bg-gray-200" />
      <div className="mt-6 space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-full rounded bg-gray-100" />
        ))}
      </div>
    </div>
  )
}
