interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: "rgba(255,255,255,0.06)", ...style }}
    />
  );
}

export function PuzzlePageSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      {/* Title */}
      <Skeleton className="h-8 w-2/3" />
      {/* Subtitle */}
      <Skeleton className="h-4 w-1/3" />
      {/* Body area */}
      <Skeleton className="h-48 w-full rounded-2xl" style={{ animationDelay: "80ms" }} />
      {/* Input row */}
      <div className="flex gap-3">
        <Skeleton className="h-12 flex-1 rounded-xl" style={{ animationDelay: "120ms" }} />
        <Skeleton className="h-12 w-24 rounded-xl" style={{ animationDelay: "160ms" }} />
      </div>
    </div>
  );
}
