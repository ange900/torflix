'use client';

export function SkeletonCard({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="skeleton aspect-[2/3] rounded-xl mb-2" />
          <div className="skeleton h-4 w-3/4 rounded mb-1" />
          <div className="skeleton h-3 w-1/3 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="mb-8 animate-fade-in">
      <div className="skeleton h-6 w-40 rounded mb-4" />
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[150px]" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="skeleton aspect-[2/3] rounded-xl mb-2" />
            <div className="skeleton h-3 w-3/4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton w-full h-[50vh] rounded-none" />
      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10">
        <div className="flex gap-6">
          <div className="skeleton w-48 h-72 rounded-xl flex-shrink-0" />
          <div className="flex-1 pt-4">
            <div className="skeleton h-8 w-2/3 rounded mb-3" />
            <div className="skeleton h-4 w-1/3 rounded mb-4" />
            <div className="skeleton h-4 w-full rounded mb-2" />
            <div className="skeleton h-4 w-5/6 rounded mb-2" />
            <div className="skeleton h-4 w-3/4 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
