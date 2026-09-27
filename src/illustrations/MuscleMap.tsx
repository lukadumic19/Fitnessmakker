import type { Muscle } from '../data/muscles';
import { MUSCLE_NAMES } from '../data/muscles';

type Shape =
  | { e: [cx: number, cy: number, rx: number, ry: number, rot?: number] }
  | { r: [x: number, y: number, w: number, h: number, rx: number] }
  | { p: string };

interface Region {
  /** Muscles that light this region up. */
  m: Muscle[];
  shapes: Shape[];
}

/** Mirror an ellipse around the body's centre line (x = 50). */
const both = (cx: number, cy: number, rx: number, ry: number, rot = 0): Shape[] => [
  { e: [cx, cy, rx, ry, rot] },
  { e: [100 - cx, cy, rx, ry, -rot] },
];

const FRONT: Region[] = [
  { m: ['trapez'], shapes: both(40, 33.5, 6, 2.4, -22) },
  { m: ['forreste-skulder', 'side-skulder'], shapes: both(29.5, 43, 5.4, 7, 18) },
  { m: ['bryst'], shapes: both(41.8, 47.5, 8.6, 6.6, 6) },
  { m: ['biceps'], shapes: both(25.8, 60, 4.2, 9, 8) },
  { m: ['underarme'], shapes: both(22.2, 86, 3.7, 11, 8) },
  { m: ['mave'], shapes: [{ r: [44.2, 57, 11.6, 35, 5] }] },
  { m: ['skrå-mave'], shapes: both(37.2, 76, 3.8, 11.5, -8) },
  { m: ['hofteabduktorer'], shapes: both(33.5, 104, 3.2, 6, -10) },
  { m: ['forlår'], shapes: both(40.3, 131, 7, 19, 3) },
  { m: ['adduktorer'], shapes: both(46.6, 119, 2.6, 9) },
  { m: ['lægge'], shapes: both(39.8, 167, 4.4, 12, 2) },
];

const BACK: Region[] = [
  { m: ['trapez'], shapes: [{ p: 'M50 25 L37 36.5 L44.5 40 L50 60 L55.5 40 L63 36.5 Z' }] },
  { m: ['bagerste-skulder', 'side-skulder'], shapes: both(29.5, 43, 5.4, 7, 18) },
  { m: ['midterryg'], shapes: both(45, 50, 3.6, 8) },
  { m: ['lats'], shapes: both(38.8, 64, 6.6, 14, -12) },
  { m: ['lænd'], shapes: both(46.6, 88, 3, 9) },
  { m: ['triceps'], shapes: both(25.8, 60, 4.2, 9, 8) },
  { m: ['underarme'], shapes: both(22.2, 86, 3.7, 11, 8) },
  { m: ['hofteabduktorer'], shapes: both(33.2, 102, 3.4, 5.5, -10) },
  { m: ['baller'], shapes: both(42, 110.5, 8, 8.5) },
  { m: ['baglår'], shapes: both(41, 137, 6.4, 16, 2) },
  { m: ['lægge'], shapes: both(40.2, 167, 5.4, 12, 2) },
];

function Silhouette() {
  return (
    <g className="mm-base">
      <circle cx={50} cy={15} r={10.5} />
      <rect x={45} y={22} width={10} height={10} rx={3} />
      <path d="M30 35 Q50 28 70 35 Q75 38 73 50 L70 62 Q65 82 65 100 Q66 106 64 110 Q50 116 36 110 Q34 106 35 100 Q35 82 30 62 L27 50 Q25 38 30 35 Z" />
      {[1, -1].map((s) => (
        <g key={s} transform={s === -1 ? 'translate(100 0) scale(-1 1)' : undefined}>
          <line x1={29} y1={41} x2={24.5} y2={72} strokeWidth={11} />
          <line x1={24.5} y1={72} x2={20.5} y2={101} strokeWidth={8.5} />
          <circle cx={19.8} cy={106} r={4.4} />
          <line x1={41} y1={106} x2={40} y2={150} strokeWidth={16} />
          <line x1={40} y1={150} x2={40} y2={190} strokeWidth={10.5} />
          <ellipse cx={39} cy={195} rx={5.5} ry={3} />
        </g>
      ))}
    </g>
  );
}

function RegionShapes({ regions, primary, secondary }: { regions: Region[]; primary: Muscle[]; secondary: Muscle[] }) {
  return (
    <>
      {regions.map((r, i) => {
        const cls = r.m.some((m) => primary.includes(m))
          ? 'mm-primary'
          : r.m.some((m) => secondary.includes(m))
            ? 'mm-secondary'
            : 'mm-muscle';
        return (
          <g key={i} className={cls}>
            {r.shapes.map((s, j) =>
              'e' in s ? (
                <ellipse
                  key={j}
                  cx={s.e[0]}
                  cy={s.e[1]}
                  rx={s.e[2]}
                  ry={s.e[3]}
                  transform={s.e[4] ? `rotate(${s.e[4]} ${s.e[0]} ${s.e[1]})` : undefined}
                />
              ) : 'r' in s ? (
                <rect key={j} x={s.r[0]} y={s.r[1]} width={s.r[2]} height={s.r[3]} rx={s.r[4]} />
              ) : (
                <path key={j} d={s.p} />
              ),
            )}
          </g>
        );
      })}
    </>
  );
}

export function MuscleMap({ primary, secondary }: { primary: Muscle[]; secondary: Muscle[] }) {
  const label = [
    primary.length ? `Primære muskler: ${primary.map((m) => MUSCLE_NAMES[m]).join(', ')}` : '',
    secondary.length ? `Sekundære: ${secondary.map((m) => MUSCLE_NAMES[m]).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('. ');
  return (
    <div className="muscle-map">
      <svg viewBox="0 0 224 216" role="img" aria-label={label || 'Hele kroppen'}>
        <g>
          <Silhouette />
          <RegionShapes regions={FRONT} primary={primary} secondary={secondary} />
          <text x={50} y={213} textAnchor="middle" className="mm-caption">
            Forfra
          </text>
        </g>
        <g transform="translate(124 0)">
          <Silhouette />
          <RegionShapes regions={BACK} primary={primary} secondary={secondary} />
          <text x={50} y={213} textAnchor="middle" className="mm-caption">
            Bagfra
          </text>
        </g>
      </svg>
      <ul className="mm-legend">
        {primary.length > 0 && <li className="mm-legend-h">Primære</li>}
        {primary.map((m) => (
          <li key={m}>
            <span className="mm-dot mm-dot-primary" /> {MUSCLE_NAMES[m]}
          </li>
        ))}
        {secondary.length > 0 && <li className="mm-legend-h">Sekundære</li>}
        {secondary.map((m) => (
          <li key={m}>
            <span className="mm-dot mm-dot-secondary" /> {MUSCLE_NAMES[m]}
          </li>
        ))}
        {!primary.length && !secondary.length && <li className="muted">Hele kroppen</li>}
      </ul>
    </div>
  );
}
