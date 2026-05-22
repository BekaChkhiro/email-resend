type Point = { date: string; created: number; validated: number };

export default function Timeline({ points }: { points: Point[] }) {
  if (points.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400 dark:text-zinc-500">
        No data in the last 30 days
      </div>
    );
  }

  const width = 800;
  const height = 220;
  const padX = 40;
  const padY = 24;

  const innerWidth = width - padX * 2;
  const innerHeight = height - padY * 2;

  const maxCreated = Math.max(...points.map((p) => p.created), 1);
  const xStep = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const pointsToSvg = points.map((p, i) => {
    const x = padX + i * xStep;
    const y = padY + innerHeight - (p.created / maxCreated) * innerHeight;
    return { x, y, p };
  });

  const linePath = pointsToSvg
    .map((d, i) => `${i === 0 ? "M" : "L"} ${d.x.toFixed(1)} ${d.y.toFixed(1)}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L ${pointsToSvg[pointsToSvg.length - 1].x.toFixed(1)} ${padY + innerHeight} L ${pointsToSvg[0].x.toFixed(1)} ${padY + innerHeight} Z`;

  // Y-axis ticks (4 ticks)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((frac) => ({
    y: padY + innerHeight - frac * innerHeight,
    label: Math.round(maxCreated * frac),
  }));

  // X-axis labels: show first, middle, last, and a couple in between
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 480 }}>
        {/* Grid */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={padX}
              x2={width - padX}
              y1={t.y}
              y2={t.y}
              stroke="currentColor"
              strokeWidth={1}
              className="text-gray-100 dark:text-zinc-700"
            />
            <text
              x={padX - 6}
              y={t.y + 4}
              textAnchor="end"
              className="fill-gray-400 text-[10px] dark:fill-zinc-500"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="#10b981" fillOpacity={0.12} />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Points */}
        {pointsToSvg.map((d, i) => (
          <g key={i}>
            <circle cx={d.x} cy={d.y} r={3} fill="#10b981" />
            <title>{`${d.p.date}: ${d.p.created.toLocaleString()} contacts`}</title>
          </g>
        ))}

        {/* X-axis labels */}
        {pointsToSvg.map((d, i) => {
          if (i % labelEvery !== 0 && i !== pointsToSvg.length - 1) return null;
          return (
            <text
              key={i}
              x={d.x}
              y={height - 4}
              textAnchor="middle"
              className="fill-gray-400 text-[10px] dark:fill-zinc-500"
            >
              {d.p.date.slice(5)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
