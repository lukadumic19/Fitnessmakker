import { useMemo } from 'react';
import type { FrontPose, Joints, P, Pose, Prop, Segment } from './figure';
import { solveFront, solvePose } from './figure';

export type Illustration =
  | {
      view?: 'side';
      poses: [Pose, Pose];
      props?: Prop[];
      highlight?: Segment[];
      /** Which pose to show when not animating. */
      thumb?: 0 | 1;
      duration?: number;
      noFloor?: boolean;
    }
  | {
      view: 'front';
      poses: [FrontPose, FrontPose];
      props?: Prop[];
      highlight?: Segment[];
      thumb?: 0 | 1;
      duration?: number;
      noFloor?: boolean;
    };

type Nums = number[];

interface Prim {
  tag: 'line' | 'circle' | 'polygon';
  cls: string;
  a: Nums;
  b: Nums;
  w?: number;
  r?: number;
}

const ATTRS: Record<Prim['tag'], string[]> = {
  line: ['x1', 'y1', 'x2', 'y2'],
  circle: ['cx', 'cy'],
  polygon: ['points'],
};

function seg(a: P, b: P, a2: P, b2: P, cls: string, w: number): Prim {
  return { tag: 'line', cls, a: [...a, ...b], b: [...a2, ...b2], w };
}

function circ(a: P, b: P, r: number, cls: string): Prim {
  return { tag: 'circle', cls, a: [...a], b: [...b], r };
}

function hl(highlight: Segment[] | undefined, s: Segment, base: string) {
  return highlight?.includes(s) ? `${base} fig-hl` : base;
}

type AnyJoints = Record<string, P>;

function propPrims(props: Prop[], ja: AnyJoints, jb: AnyJoints): { back: Prim[]; front: Prim[] } {
  const back: Prim[] = [];
  const front: Prim[] = [];
  for (const p of props) {
    switch (p.kind) {
      case 'plate': {
        const off: P = [p.dx ?? 0, p.dy ?? 0];
        const pa: P = [ja[p.at][0] + off[0], ja[p.at][1] + off[1]];
        const pb: P = [jb[p.at][0] + off[0], jb[p.at][1] + off[1]];
        front.push(circ(pa, pb, p.r ?? 13, 'fig-plate'));
        front.push(circ(pa, pb, 2.2, 'fig-plate-hub'));
        break;
      }
      case 'dumbbell': {
        const off: P = [p.dx ?? 0, p.dy ?? 0];
        const pa: P = [ja[p.at][0] + off[0], ja[p.at][1] + off[1]];
        const pb: P = [jb[p.at][0] + off[0], jb[p.at][1] + off[1]];
        const h = 7;
        if (p.vertical) {
          front.push(seg([pa[0], pa[1] - h], [pa[0], pa[1] + h], [pb[0], pb[1] - h], [pb[0], pb[1] + h], 'fig-db-bar', 2.5));
          front.push(seg([pa[0], pa[1] - h], [pa[0], pa[1] - h + 0.01], [pb[0], pb[1] - h], [pb[0], pb[1] - h + 0.01], 'fig-db-end', 7));
          front.push(seg([pa[0], pa[1] + h], [pa[0], pa[1] + h + 0.01], [pb[0], pb[1] + h], [pb[0], pb[1] + h + 0.01], 'fig-db-end', 7));
        } else {
          front.push(circ(pa, pb, 6.5, 'fig-db'));
        }
        break;
      }
      case 'kettlebell': {
        const pa: P = [ja[p.at][0], ja[p.at][1] + 8];
        const pb: P = [jb[p.at][0], jb[p.at][1] + 8];
        front.push(seg(ja[p.at], pa, jb[p.at], pb, 'fig-db-bar', 3));
        front.push(circ(pa, pb, 7.5, 'fig-db'));
        break;
      }
      case 'cable':
        back.push(seg(p.from, ja[p.to], p.from, jb[p.to], 'fig-cable', 1.4));
        back.push(circ(p.from, p.from, 3.5, 'fig-pulley'));
        break;
      case 'attached': {
        const a = ja[p.at];
        const b = jb[p.at];
        back.push(
          seg(
            [a[0] + p.from[0], a[1] + p.from[1]],
            [a[0] + p.to[0], a[1] + p.to[1]],
            [b[0] + p.from[0], b[1] + p.from[1]],
            [b[0] + p.to[0], b[1] + p.to[1]],
            'fig-equip',
            p.w ?? 4,
          ),
        );
        break;
      }
      case 'barbellFront': {
        const ext = p.ext ?? 38;
        const ends = (j: AnyJoints): [P, P] => [
          [j.handL[0] - ext, j.handL[1]],
          [j.handR[0] + ext, j.handR[1]],
        ];
        const [la, ra] = ends(ja);
        const [lb, rb] = ends(jb);
        front.push(seg(la, ra, lb, rb, 'fig-db-bar', 3));
        for (const [ea, eb, dx] of [[la, lb, 6], [ra, rb, -6]] as [P, P, number][]) {
          front.push(seg([ea[0] + dx, ea[1] - 15], [ea[0] + dx, ea[1] + 15], [eb[0] + dx, eb[1] - 15], [eb[0] + dx, eb[1] + 15], 'fig-db-end', 7));
        }
        break;
      }
      case 'line':
        back.push(seg(p.from, p.to, p.from, p.to, 'fig-equip', p.w ?? 4));
        break;
      case 'rect': {
        const { x, y, w, h } = p;
        const pts = [x, y, x + w, y, x + w, y + h, x, y + h];
        back.push({ tag: 'polygon', cls: 'fig-equip-fill', a: pts, b: pts, w: p.r ?? 2 });
        break;
      }
      case 'circle':
        back.push(circ(p.at, p.at, p.r, p.fill ? 'fig-equip-solid' : 'fig-equip-ring'));
        break;
    }
  }
  return { back, front };
}

/* ------------------------------------------------------------------ */
/* Body shapes                                                         */
/* ------------------------------------------------------------------ */

/** Limb profile: [position along the bone 0..1, half width]. */
type Profile = [number, number][];

const PROFILE = {
  thigh: [[0, 6.4], [0.3, 6.1], [1, 4.3]] as Profile,
  shin: [[0, 4.3], [0.28, 4.6], [0.75, 3.2], [1, 2.8]] as Profile,
  upperArm: [[0, 4.4], [0.35, 4.3], [1, 3.2]] as Profile,
  forearm: [[0, 3.5], [0.25, 3.7], [1, 2.6]] as Profile,
  neck: [[0, 3.2], [1, 3]] as Profile,
  foot: [[0, 3.3], [0.6, 2.9], [1, 2.3]] as Profile,
};

/** Torso profile: [position hip→shoulder, front half width, back half width]. */
const TORSO: [number, number, number][] = [
  [-0.08, 6.2, 7],
  [0.08, 7.4, 8.4],
  [0.36, 6.2, 6.6],
  [0.62, 8.2, 7],
  [0.84, 9.4, 8],
  [1.02, 6.2, 7.2],
];

const sub2 = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];

function limbOutline(a: P, b: P, prof: Profile): number[] {
  const d = sub2(b, a);
  const L = Math.hypot(d[0], d[1]) || 1;
  const n: P = [-d[1] / L, d[0] / L];
  const left = prof.map(([t, w]) => [a[0] + d[0] * t + n[0] * w, a[1] + d[1] * t + n[1] * w]);
  const right = prof.map(([t, w]) => [a[0] + d[0] * t - n[0] * w, a[1] + d[1] * t - n[1] * w]).reverse();
  return [...left, ...right].flat();
}

/** Tapered limb (polygon) with rounded ends (circles), animated between poses. */
function limb(a1: P, b1: P, a2: P, b2: P, prof: Profile, cls: string): Prim[] {
  const r1 = prof[0][1];
  const r2 = prof[prof.length - 1][1];
  // Near limbs get a thin background-coloured edge so they read against the torso.
  const edge: Prim[] = cls.includes('fig-near')
    ? [
        { tag: 'polygon', cls: 'fig-edge', a: limbOutline(a1, b1, prof), b: limbOutline(a2, b2, prof), w: 3.2 },
        circ(a1, a2, r1 + 1.6, 'fig-edge-dot'),
        circ(b1, b2, r2 + 1.6, 'fig-edge-dot'),
      ]
    : [];
  return [
    ...edge,
    { tag: 'polygon', cls, a: limbOutline(a1, b1, prof), b: limbOutline(a2, b2, prof), w: 1 },
    circ(a1, a2, r1, cls),
    circ(b1, b2, r2, cls),
  ];
}

/** Draw every edge of a limb chain first, then the fills, so joints have no seams. */
function chain(parts: Prim[][]): Prim[] {
  const all = parts.flat();
  const isEdge = (p: Prim) => p.cls.startsWith('fig-edge');
  return [...all.filter(isEdge), ...all.filter((p) => !isEdge(p))];
}

/** Side-view torso: chest in front (+normal), back and glutes behind. */
function torsoOutline(hip: P, shoulder: P): number[] {
  const d = sub2(shoulder, hip);
  const L = Math.hypot(d[0], d[1]) || 1;
  // The figure faces the normal that points to +x when standing upright.
  const n: P = [-d[1] / L, d[0] / L];
  const at = (t: number, w: number): number[] => [hip[0] + d[0] * t + n[0] * w, hip[1] + d[1] * t + n[1] * w];
  const front = TORSO.map(([t, f]) => at(t, f));
  const back = TORSO.map(([t, , b]) => at(t, -b)).reverse();
  return [...front, ...back].flat();
}

function sidePrims(ill: Extract<Illustration, { view?: 'side' }>) {
  const a = solvePose(ill.poses[0]);
  const b = solvePose(ill.poses[1]);
  const h = ill.highlight;
  const { back, front } = propPrims(ill.props ?? [], a, b);
  const prims: Prim[] = [...back];
  const heel = (j: Joints, ankle: 'ankleN' | 'ankleF', toe: 'toeN' | 'toeF'): P => {
    const d = sub2(j[toe], j[ankle]);
    return [j[ankle][0] - d[0] * 0.25, j[ankle][1] - d[1] * 0.25];
  };

  // Far limbs, drawn behind the torso.
  prims.push(...limb(a.hip, a.kneeF, b.hip, b.kneeF, PROFILE.thigh, hl(h, 'thigh', 'fig-far')));
  prims.push(...limb(a.kneeF, a.ankleF, b.kneeF, b.ankleF, PROFILE.shin, hl(h, 'shin', 'fig-far')));
  prims.push(...limb(heel(a, 'ankleF', 'toeF'), a.toeF, heel(b, 'ankleF', 'toeF'), b.toeF, PROFILE.foot, 'fig-far'));
  prims.push(...limb(a.shoulder, a.elbowF, b.shoulder, b.elbowF, PROFILE.upperArm, hl(h, 'upperArm', 'fig-far')));
  prims.push(...limb(a.elbowF, a.handF, b.elbowF, b.handF, PROFILE.forearm, hl(h, 'forearm', 'fig-far')));
  prims.push(circ(a.handF, b.handF, 3.3, 'fig-far'));

  prims.push(...limb(a.shoulder, a.neck, b.shoulder, b.neck, PROFILE.neck, 'fig-body'));
  prims.push({
    tag: 'polygon',
    cls: hl(h, 'torso', 'fig-body'),
    a: torsoOutline(a.hip, a.shoulder),
    b: torsoOutline(b.hip, b.shoulder),
    w: 1.5,
  });
  prims.push(circ(a.head, b.head, 8.6, 'fig-head'));

  prims.push(
    ...chain([
      limb(a.hip, a.kneeN, b.hip, b.kneeN, PROFILE.thigh, hl(h, 'thigh', 'fig-body fig-near')),
      limb(a.kneeN, a.ankleN, b.kneeN, b.ankleN, PROFILE.shin, hl(h, 'shin', 'fig-body fig-near')),
      limb(heel(a, 'ankleN', 'toeN'), a.toeN, heel(b, 'ankleN', 'toeN'), b.toeN, PROFILE.foot, 'fig-body fig-near'),
    ]),
  );

  prims.push(...front);

  prims.push(
    ...chain([
      limb(a.shoulder, a.elbowN, b.shoulder, b.elbowN, PROFILE.upperArm, hl(h, 'upperArm', 'fig-body fig-near')),
      limb(a.elbowN, a.handN, b.elbowN, b.handN, PROFILE.forearm, hl(h, 'forearm', 'fig-body fig-near')),
      [circ(a.handN, b.handN, 5, 'fig-edge-dot'), circ(a.handN, b.handN, 3.4, 'fig-body fig-near')],
    ]),
  );
  return prims;
}

function frontPrims(ill: Extract<Illustration, { view: 'front' }>) {
  const a = solveFront(ill.poses[0]);
  const b = solveFront(ill.poses[1]);
  const h = ill.highlight;
  const { back, front } = propPrims(ill.props ?? [], a as unknown as AnyJoints, b as unknown as AnyJoints);
  const prims: Prim[] = [...back];
  // Torso and feet are laid out in the body's own frame so a tilted figure stays intact.
  const frame = (j: typeof a) => {
    const top: P = [(j.shL[0] + j.shR[0]) / 2, (j.shL[1] + j.shR[1]) / 2];
    const bottom: P = [(j.hipL[0] + j.hipR[0]) / 2, (j.hipL[1] + j.hipR[1]) / 2];
    const v = sub2(bottom, top);
    const w = Math.hypot(j.shR[0] - j.shL[0], j.shR[1] - j.shL[1]) || 1;
    const across: P = [(j.shR[0] - j.shL[0]) / w, (j.shR[1] - j.shL[1]) / w];
    const L = Math.hypot(v[0], v[1]) || 1;
    const down: P = [v[0] / L, v[1] / L];
    const at = (u: number, t: number): P => [top[0] + v[0] * t + across[0] * u, top[1] + v[1] * t + across[1] * u];
    return { top, across, down, at };
  };
  const TORSO_FRONT: [number, number][] = [
    [-16, -0.04], [-4, -0.09], [4, -0.09], [16, -0.04], [15.5, 0.28], [10.5, 0.66],
    [12, 1.04], [0, 1.1], [-12, 1.04], [-10.5, 0.66], [-15.5, 0.28],
  ];
  const torso = (j: typeof a) => {
    const f = frame(j);
    return TORSO_FRONT.flatMap(([u, t]) => f.at(u, t));
  };
  prims.push({ tag: 'polygon', cls: hl(h, 'torso', 'fig-body'), a: torso(a), b: torso(b), w: 2 });
  const fa = frame(a);
  const fb = frame(b);
  const neckA = fa.at(0, -0.06);
  const neckB = fb.at(0, -0.06);
  prims.push(...limb(a.head, neckA, b.head, neckB, PROFILE.neck, 'fig-body'));
  prims.push(circ(a.head, b.head, 8.6, 'fig-head'));
  const toe = (f: ReturnType<typeof frame>, ankle: P, sign: number): P => [
    ankle[0] + f.across[0] * 8 * sign + f.down[0] * 1.5,
    ankle[1] + f.across[1] * 8 * sign + f.down[1] * 1.5,
  ];
  for (const side of ['L', 'R'] as const) {
    const hip = `hip${side}` as const;
    const knee = `knee${side}` as const;
    const ankle = `ankle${side}` as const;
    const sh = `sh${side}` as const;
    const elbow = `elbow${side}` as const;
    const hand = `hand${side}` as const;
    prims.push(...limb(a[hip], a[knee], b[hip], b[knee], PROFILE.thigh, hl(h, 'thigh', 'fig-body')));
    prims.push(...limb(a[knee], a[ankle], b[knee], b[ankle], PROFILE.shin, hl(h, 'shin', 'fig-body')));
    const sign = side === 'L' ? -1 : 1;
    prims.push(...limb(a[ankle], toe(fa, a[ankle], sign), b[ankle], toe(fb, b[ankle], sign), PROFILE.foot, 'fig-body'));
    prims.push(...limb(a[sh], a[elbow], b[sh], b[elbow], PROFILE.upperArm, hl(h, 'upperArm', 'fig-body')));
    prims.push(...limb(a[elbow], a[hand], b[elbow], b[hand], PROFILE.forearm, hl(h, 'forearm', 'fig-body')));
    prims.push(circ(a[hand], b[hand], 3.4, 'fig-body'));
  }
  prims.push(...front);
  return prims;
}

const fmt = (n: number) => Math.round(n * 10) / 10;

function attrValues(p: Prim, nums: Nums): Record<string, string | number> {
  if (p.tag === 'polygon') return { points: nums.map(fmt).join(' ') };
  const names = ATTRS[p.tag];
  const out: Record<string, number> = {};
  names.forEach((n, i) => (out[n] = fmt(nums[i])));
  return out;
}

const SPLINE = '0.45 0 0.55 1';

function PrimEl({ p, animate, dur, thumb }: { p: Prim; animate: boolean; dur: number; thumb: 0 | 1 }) {
  const base = thumb === 0 ? p.a : p.b;
  const attrs = attrValues(p, base);
  const style = p.w ? { strokeWidth: p.w } : undefined;
  let anims: React.ReactNode = null;
  if (animate) {
    const va = attrValues(p, p.a);
    const vb = attrValues(p, p.b);
    anims = Object.keys(va)
      .filter((k) => va[k] !== vb[k])
      .map((k) => (
        <animate
          key={k}
          attributeName={k}
          dur={`${dur}s`}
          repeatCount="indefinite"
          calcMode="spline"
          keyTimes="0;0.4;0.5;0.9;1"
          keySplines={`${SPLINE};0 0 1 1;${SPLINE};0 0 1 1`}
          values={`${va[k]};${vb[k]};${vb[k]};${va[k]};${va[k]}`}
        />
      ));
  }
  if (p.tag === 'circle') {
    return (
      <circle className={p.cls} r={p.r} {...attrs} style={style}>
        {anims}
      </circle>
    );
  }
  if (p.tag === 'polygon') {
    return (
      <polygon className={p.cls} {...attrs} style={style}>
        {anims}
      </polygon>
    );
  }
  return (
    <line className={p.cls} {...attrs} style={style}>
      {anims}
    </line>
  );
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function ExerciseFigure({
  illustration,
  animate = false,
  className,
  title,
}: {
  illustration: Illustration;
  animate?: boolean;
  className?: string;
  title?: string;
}) {
  const prims = useMemo(
    () => (illustration.view === 'front' ? frontPrims(illustration) : sidePrims(illustration)),
    [illustration],
  );
  const doAnimate = animate && !prefersReducedMotion();
  const thumb = illustration.thumb ?? 0;
  const dur = illustration.duration ?? 3.2;
  return (
    <svg
      // Remount when toggling animation so the SMIL timeline restarts from pose A.
      key={doAnimate ? 'anim' : 'still'}
      className={`exercise-figure ${className ?? ''}`}
      viewBox="-10 -40 220 200"
      role="img"
      aria-label={title}
    >
      {!illustration.noFloor && <line className="fig-floor" x1={-10} y1={153} x2={210} y2={153} />}
      {prims.map((p, i) => (
        <PrimEl key={i} p={p} animate={doAnimate} dur={dur} thumb={doAnimate ? 0 : thumb} />
      ))}
    </svg>
  );
}
