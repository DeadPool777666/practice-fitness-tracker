export function Skeleton({ lines = 3, height = 16 }) {
  return <div className="skeleton-block" role="status" aria-label="Загрузка">
    {Array.from({ length: lines }, (_, index) => <i key={index} className="skeleton" style={{ height, width: `${index === lines - 1 ? 55 : 100}%` }} />)}
  </div>
}

export function DashboardSkeleton() {
  return <div className="skeleton-grid" role="status" aria-label="Загрузка">
    <div className="skeleton-card"><Skeleton lines={3} height={22} /></div>
    <div className="skeleton-card"><Skeleton lines={3} height={22} /></div>
    <div className="skeleton-card"><Skeleton lines={3} height={22} /></div>
  </div>
}
