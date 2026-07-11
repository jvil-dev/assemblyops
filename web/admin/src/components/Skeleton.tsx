/**
 * Skeleton Loading Primitives
 *
 * Pulsing placeholder components for loading states.
 *
 * Exports:
 *   - Skeleton: Base rectangle with configurable width/height/borderRadius
 *   - SkeletonStatCard: Placeholder for StatCard
 *   - SkeletonTable: Placeholder for DataTable (configurable row count)
 *   - SkeletonChart: Placeholder for Chart (configurable height)
 *
 * Used by: Overview, Infrastructure, Metrics, Events, Users pages
 */
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({ width, height = '20px', borderRadius, className }: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--divider)',
        borderRadius: borderRadius ?? 'var(--radius-sm)',
        width: width ?? '100%',
        height,
        animation: 'skeleton-pulse 1.8s ease-in-out infinite',
      }}
    />
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--card)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-card)',
  border: '1px solid var(--divider)',
  padding: '20px',
};

export function SkeletonStatCard() {
  return (
    <div style={cardStyle}>
      <Skeleton width="40%" height="12px" />
      <div style={{ marginTop: 12 }}>
        <Skeleton width="60%" height="28px" />
      </div>
      <div style={{ marginTop: 8 }}>
        <Skeleton width="30%" height="12px" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div style={cardStyle}>
      <div className="flex gap-4" style={{ marginBottom: 16 }}>
        <Skeleton width="15%" height="12px" />
        <Skeleton width="20%" height="12px" />
        <Skeleton width="25%" height="12px" />
        <Skeleton width="10%" height="12px" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4" style={{ marginBottom: 12 }}>
          <Skeleton width={`${15 + (i % 3) * 5}%`} height="16px" />
          <Skeleton width={`${20 + (i % 2) * 10}%`} height="16px" />
          <Skeleton width={`${25 - (i % 3) * 5}%`} height="16px" />
          <Skeleton width="10%" height="16px" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 250 }: { height?: number }) {
  return (
    <div style={cardStyle}>
      <Skeleton width="30%" height="16px" />
      <div style={{ marginTop: 16 }}>
        <Skeleton height={`${height}px`} borderRadius="var(--radius-sm)" />
      </div>
    </div>
  );
}
