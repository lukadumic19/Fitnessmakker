import { useMemo } from 'react';
import type { FrontPose, P, Pose, Prop, Segment } from './figure';
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

const W = { torso: 10, limb: 7, far: 6.5 };

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

function sidePrims(ill: Extract<Illustration, { view?: 'side' }>) {
  const a = solvePose(ill.poses[0]);
  const b = solvePose(ill.poses[1]);
  const h = ill.highlight;
  const { back, front } = propPrims(ill.props ?? [], a, b);
  const prims: Prim[] = [...back];

  // Far limbs, drawn behind the torso.
  prims.push(seg(a.hip, a.kneeF, b.hip, b.kneeF, hl(h, 'thigh', 'fig-far'), W.far));
  prims.push(seg(a.kneeF, a.ankleF, b.kneeF, b.ankleF, hl(h, 'shin', 'fig-far'), W.far));
  prims.push(seg(a.ankleF, a.toeF, b.ankleF, b.toeF, 'fig-far', 5));
  prims.push(seg(a.shoulder, a.elbowF, b.shoulder, b.elbowF, hl(h, 'upperArm', 'fig-far'), W.far));
  prims.push(seg(a.elbowF, a.handF, b.elbowF, b.handF, hl(h, 'forearm', 'fig-far'), W.far));

  prims.push(seg(a.hip, a.shoulder, b.hip, b.shoulder, hl(h, 'torso', 'fig-body'), W.torso));
  prims.push(seg(a.shoulder, a.neck, b.shoulder, b.neck, 'fig-body', 6));
  prims.push(circ(a.head, b.head, 9, 'fig-head'));

  prims.push(seg(a.hip, a.kneeN, b.hip, b.kneeN, hl(h, 'thigh', 'fig-body'), W.limb + 1));
  prims.push(seg(a.kneeN, a.ankleN, b.kneeN, b.ankleN, hl(h, 'shin', 'fig-body'), W.limb));
  prims.push(seg(a.ankleN, a.toeN, b.ankleN, b.toeN, 'fig-body', 5.5));

  prims.push(...front);

  prims.push(seg(a.shoulder, a.elbowN, b.shoulder, b.elbowN, hl(h, 'upperArm', 'fig-body'), W.limb));
  prims.push(seg(a.elbowN, a.handN, b.elbowN, b.handN, hl(h, 'forearm', 'fig-body'), W.limb - 0.5));
  return prims;
}

function frontPrims(ill: Extract<Illustration, { view: 'front' }>) {
  const a = solveFront(ill.poses[0]);
  const b = solveFront(ill.poses[1]);
  const h = ill.highlight;
  const { back, front } = propPrims(ill.props ?? [], a as unknown as AnyJoints, b as unknown as AnyJoints);
  const prims: Prim[] = [...back];
  const torso = (j: typeof a) => [...j.shL, ...j.shR, ...j.hipR, ...j.hipL];
  prims.push({ tag: 'polygon', cls: hl(h, 'torso', 'fig-torso-fill'), a: torso(a), b: torso(b), w: 7 });
  prims.push(seg([a.head[0], a.head[1] + 8], [a.head[0], a.shL[1]], [b.head[0], b.head[1] + 8], [b.head[0], b.shL[1]], 'fig-body', 6));
  prims.push(circ(a.head, b.head, 9, 'fig-head'));
  for (const side of ['L', 'R'] as const) {
    const hip = `hip${side}` as const;
    const knee = `knee${side}` as const;
    const ankle = `ankle${side}` as const;
    const sh = `sh${side}` as const;
    const elbow = `elbow${side}` as const;
    const hand = `hand${side}` as const;
    prims.push(seg(a[hip], a[knee], b[hip], b[knee], hl(h, 'thigh', 'fig-body'), W.limb + 1));
    prims.push(seg(a[knee], a[ankle], b[knee], b[ankle], hl(h, 'shin', 'fig-body'), W.limb));
    const dx = side === 'L' ? -6 : 6;
    prims.push(
      seg(a[ankle], [a[ankle][0] + dx, a[ankle][1] + 1], b[ankle], [b[ankle][0] + dx, b[ankle][1] + 1], 'fig-body', 5.5),
    );
    prims.push(seg(a[sh], a[elbow], b[sh], b[elbow], hl(h, 'upperArm', 'fig-body'), W.limb));
    prims.push(seg(a[elbow], a[hand], b[elbow], b[hand], hl(h, 'forearm', 'fig-body'), W.limb - 0.5));
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
