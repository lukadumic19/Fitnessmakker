import { useMemo, useRef, useState } from 'react';
import { fmtDate, fmtNum } from '../utils';

export interface Point {
  date: string;
  value: number;
}

const W = 640;
const H = 220;
const PAD = { l: 44, r: 16, t: 16, b: 28 };

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

/** Single-series line chart with crosshair tooltip. */
export function LineChart({
  points,
  unit,
  label,
  height = H,
}: {
  points: Point[];
  unit: string;
  label: string;
  height?: number;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    const vals = points.map((p) => p.value);
    const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];
    const times = points.map((p) => new Date(p.date).getTime());
    const tMin = Math.min(...times);
    const tMax = Math.max(...times);
    const x = (t: number) =>
      tMax === tMin ? (PAD.l + W - PAD.r) / 2 : PAD.l + ((t - tMin) / (tMax - tMin)) * (W - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (height - PAD.t - PAD.b);
    const xy = points.map((p, i) => [x(times[i]), y(p.value)] as const);
    return { ticks, xy, y };
  }, [points, height]);

  if (!points.length) return null;

  const path = geo.xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
  const area = `${path}L${geo.xy[geo.xy.length - 1][0].toFixed(1)},${height - PAD.b}L${geo.xy[0][0].toFixed(1)},${height - PAD.b}Z`;
  const labelIdx = new Set([0, points.length - 1]);

  const onMove = (e: React.PointerEvent) => {
    const svg = ref.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    geo.xy.forEach(([x], i) => {
      if (Math.abs(x - px) < Math.abs(geo.xy[best][0] - px)) best = i;
    });
    setHover(best);
  };

  const h = hover != null ? geo.xy[hover] : null;

  return (
    <div className="chart">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${height}`}
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {geo.ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={PAD.l} x2={W - PAD.r} y1={geo.y(t)} y2={geo.y(t)} />
            <text className="chart-tick" x={PAD.l - 8} y={geo.y(t) + 4} textAnchor="end">
              {fmtNum(t)}
            </text>
          </g>
        ))}
        <text className="chart-tick" x={PAD.l} y={height - 8}>
          {fmtDate(points[0].date)}
        </text>
        {points.length > 1 && (
          <text className="chart-tick" x={W - PAD.r} y={height - 8} textAnchor="end">
            {fmtDate(points[points.length - 1].date)}
          </text>
        )}
        <path className="chart-area" d={area} />
        <path className="chart-line" d={path} />
        {geo.xy.map(([x, y], i) => (
          <circle key={i} className="chart-dot" cx={x} cy={y} r={points.length > 30 ? 2.5 : 4} />
        ))}
        {hover == null &&
          [...labelIdx].map((i) => (
            <text
              key={i}
              className="chart-label"
              x={geo.xy[i][0]}
              y={geo.xy[i][1] - 10}
              textAnchor={i === 0 && points.length > 1 ? 'start' : 'end'}
            >
              {fmtNum(points[i].value)}
            </text>
          ))}
        {h && (
          <g>
            <line className="chart-cross" x1={h[0]} x2={h[0]} y1={PAD.t} y2={height - PAD.b} />
            <circle className="chart-dot-hover" cx={h[0]} cy={h[1]} r={5.5} />
          </g>
        )}
      </svg>
      {hover != null && h && (
        <div
          className="chart-tip"
          style={{ left: `${(h[0] / W) * 100}%`, top: `${(h[1] / height) * 100}%` }}
        >
          <strong>
            {fmtNum(points[hover].value)} {unit}
          </strong>
          <span>{fmtDate(points[hover].date)}</span>
        </div>
      )}
    </div>
  );
}
