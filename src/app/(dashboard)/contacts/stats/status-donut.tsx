const STATUS_COLORS: Record<string, string> = {
  valid: "#10b981",
  "catch-all": "#f59e0b",
  unknown: "#a1a1aa",
  invalid: "#ef4444",
  disposable: "#f97316",
  not_verified: "#d4d4d8",
};

const STATUS_ORDER = ["valid", "catch-all", "unknown", "invalid", "disposable", "not_verified"];

export default function StatusDonut({
  counts,
  total,
}: {
  counts: Record<string, number>;
  total: number;
}) {
  const size = 200;
  const stroke = 28;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  if (total === 0) {
    return (
      <div className="flex h-[200px] w-[200px] items-center justify-center rounded-full border-2 border-dashed border-gray-200 text-sm text-gray-400 dark:border-zinc-700 dark:text-zinc-500">
        No data
      </div>
    );
  }

  let cumulative = 0;
  const segments = STATUS_ORDER.map((key) => {
    const value = counts[key] ?? 0;
    if (value === 0) return null;
    const fraction = value / total;
    const dashArray = `${fraction * circumference} ${circumference}`;
    const dashOffset = -cumulative * circumference;
    cumulative += fraction;
    return (
      <circle
        key={key}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={STATUS_COLORS[key]}
        strokeWidth={stroke}
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${center} ${center})`}
      />
    );
  });

  const verified = total - (counts.not_verified ?? 0);
  const validPct = total > 0 ? ((counts.valid ?? 0) / total) * 100 : 0;

  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-100 dark:text-zinc-700"
        />
        {segments}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{validPct.toFixed(0)}%</p>
        <p className="text-xs text-gray-500 dark:text-zinc-400">valid</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
          {verified.toLocaleString()} / {total.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
