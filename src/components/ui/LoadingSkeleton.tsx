export function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Filter skeleton */}
      <div className="bg-white rounded-lg border border-ft-gray-200 p-4">
        <div className="flex flex-wrap gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-40 bg-ft-gray-200 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Scorecards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-ft-gray-200 p-6"
          >
            <div className="h-4 w-24 bg-ft-gray-200 rounded mb-3" />
            <div className="h-8 w-32 bg-ft-gray-200 rounded mb-2" />
            <div className="h-3 w-20 bg-ft-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-ft-gray-200 p-6">
          <div className="h-5 w-40 bg-ft-gray-200 rounded mb-4" />
          <div className="h-64 bg-ft-gray-100 rounded" />
        </div>
        <div className="bg-white rounded-lg border border-ft-gray-200 p-6">
          <div className="h-5 w-40 bg-ft-gray-200 rounded mb-4" />
          <div className="h-64 bg-ft-gray-100 rounded" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-lg border border-ft-gray-200 p-6">
        <div className="h-5 w-32 bg-ft-gray-200 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-ft-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
