import { useId, useMemo } from 'react';
import type { Muscle } from '../data/muscles';
import { MUSCLE_SHORT } from '../data/muscles';
import {
  FRONT_SHAPES,
  FRONT_TORSO_MUSCLES,
  SHAPES,
  SIDE_MUSCLES,
  TORSO_FRONT,
  ellipseIn,
  frameOf,
  headShapes,
  lens,
  outline,
  type Frame,
  type MuscleDef,
  type Shape,
} from './anatomy';
import type { FrontJoints, FrontPose, Joints, P, Pose, Prop, Segment } from './figure';
import { LEN, solveFront, solvePose } from './figure';

export type Illustration =
  | {
      view?: 'side';
      poses: [Pose, Pose];
      props?: Prop[];
      /** Legacy segment highlight, used only when no muscles are given. */
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

export interface TargetMuscles {
  primary: Muscle[];
  secondary: Muscle[];
}

type Nums = number[];
type Grad = 'skin' | 'target';

interface Prim {
  tag: 'path' | 'line' | 'circle' | 'ellipse' | 'polygon';
  cls: string;
  a: Nums;
  b: Nums;
  w?: number;
  r?: number;
  ry?: number;
  grad?: Grad;
}

const path = (a: Nums, b: Nums, cls: string, grad?: Grad): Prim => ({ tag: 'path', cls, a, b, grad });
const seg = (a: P, b: P, a2: P, b2: P, cls: string, w: number): Prim => ({ tag: 'line', cls, a: [...a, ...b], b: [...a2, ...b2], w });
const circ = (a: P, b: P, r: number, cls: string, w?: number): Prim => ({ tag: 'circle', cls, a: [...a], b: [...b], r, w });

type AnyJoints = Record<string, P>;

/* ------------------------------------------------------------------ */
/* Equipment                                                           */
/* ------------------------------------------------------------------ */

const hex = (c: P, r: number, rot = 0): number[] => {
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = rot + (Math.PI / 3) * i;
    pts.push(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r);
  }
  return pts;
};

function propPrims(props: Prop[], ja: AnyJoints, jb: AnyJoints): { back: Prim[]; front: Prim[] } {
  const back: Prim[] = [];
  const front: Prim[] = [];
  const off = (j: AnyJoints, at: string, dx = 0, dy = 0): P => [j[at][0] + dx, j[at][1] + dy];
  for (const p of props) {
    switch (p.kind) {
      case 'plate': {
        const pa = off(ja, p.at, p.dx, p.dy);
        const pb = off(jb, p.at, p.dx, p.dy);
        const r = p.r ?? 13;
        front.push(circ(pa, pb, r, 'fig-plate', 1.2));
        front.push(circ(pa, pb, r * 0.66, 'fig-plate-ring', 1));
        front.push(circ(pa, pb, 2.6, 'fig-metal-dot'));
        break;
      }
      case 'dumbbell': {
        const pa = off(ja, p.at, p.dx, p.dy);
        const pb = off(jb, p.at, p.dx, p.dy);
        if (p.vertical) {
          const h = 7.5;
          front.push(seg([pa[0], pa[1] - h], [pa[0], pa[1] + h], [pb[0], pb[1] - h], [pb[0], pb[1] + h], 'fig-metal', 2.4));
          for (const s of [-1, 1]) {
            front.push({ tag: 'polygon', cls: 'fig-weight', a: hex([pa[0], pa[1] + s * h], 4.6, Math.PI / 6), b: hex([pb[0], pb[1] + s * h], 4.6, Math.PI / 6), w: 0.8 });
          }
        } else {
          front.push({ tag: 'polygon', cls: 'fig-weight', a: hex(pa, 7), b: hex(pb, 7), w: 0.8 });
          front.push({ tag: 'polygon', cls: 'fig-weight-ring', a: hex(pa, 4.2), b: hex(pb, 4.2), w: 0.8 });
          front.push(circ(pa, pb, 1.8, 'fig-metal-dot'));
        }
        break;
      }
      case 'kettlebell': {
        const pa: P = [ja[p.at][0], ja[p.at][1] + 9];
        const pb: P = [jb[p.at][0], jb[p.at][1] + 9];
        front.push(circ([ja[p.at][0], ja[p.at][1] + 2], [jb[p.at][0], jb[p.at][1] + 2], 4.2, 'fig-kb-handle', 2.4));
        front.push(circ(pa, pb, 8, 'fig-weight', 0.8));
        break;
      }
      case 'cable':
        back.push(seg(p.from, ja[p.to], p.from, jb[p.to], 'fig-cable', 1.2));
        back.push(circ(p.from, p.from, 3.6, 'fig-pulley', 1.6));
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
            'fig-pad',
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
        front.push(seg(la, ra, lb, rb, 'fig-metal', 3));
        for (const [ea, eb, dx] of [[la, lb, 7], [ra, rb, -7]] as [P, P, number][]) {
          front.push(seg([ea[0] + dx, ea[1] - 15], [ea[0] + dx, ea[1] + 15], [eb[0] + dx, eb[1] - 15], [eb[0] + dx, eb[1] + 15], 'fig-plate-edge', 8));
        }
        break;
      }
      case 'line':
        back.push(seg(p.from, p.to, p.from, p.to, 'fig-metal', p.w ?? 4));
        break;
      case 'rect': {
        const { x, y, w, h } = p;
        const pts = [x, y, x + w, y, x + w, y + h, x, y + h];
        back.push({ tag: 'polygon', cls: 'fig-pad', a: pts, b: pts, w: p.r ?? 3 });
        break;
      }
      case 'circle':
        back.push(circ(p.at, p.at, p.r, p.fill ? 'fig-metal-dot' : 'fig-machine-ring', p.fill ? undefined : 3.5));
        break;
    }
  }
  return { back, front };
}

/* ------------------------------------------------------------------ */
/* Body                                                                */
/* ------------------------------------------------------------------ */

interface Ctx {
  muscles: TargetMuscles;
  /** Centres of the drawn target muscles, for labels: [pose A, pose B]. */
  anchors: Map<Muscle, [P, P]>;
}

const centroid = (pts: Nums): P => {
  let x = 0;
  let y = 0;
  const n = pts.length / 2;
  for (let i = 0; i < pts.length; i += 2) {
    x += pts[i];
    y += pts[i + 1];
  }
  return [x / n, y / n];
};

function level(ctx: Ctx, m: Muscle): 't1' | 't2' | null {
  if (ctx.muscles.primary.includes(m)) return 't1';
  if (ctx.muscles.secondary.includes(m)) return 't2';
  return null;
}

/** A body part: outline + muscle bellies (faint anatomy and highlighted targets). */
function part(
  ctx: Ctx,
  fa: Frame,
  fb: Frame,
  shape: Shape,
  defs: MuscleDef[],
  far: boolean,
  labelable: boolean,
): Prim[] {
  const out: Prim[] = [path(outline(fa, shape), outline(fb, shape), far ? 'fig-skin-far' : 'fig-skin', far ? undefined : 'skin')];
  const base: Prim[] = [];
  const t2: Prim[] = [];
  const t1: Prim[] = [];
  for (const d of defs) {
    const lv = level(ctx, d.m);
    if (!lv && (!d.base || far)) continue;
    const pa = lens(fa, shape, d.side, d.t0, d.t1, d.inner, d.outer);
    const pb = lens(fb, shape, d.side, d.t0, d.t1, d.inner, d.outer);
    if (!lv) base.push(path(pa, pb, 'fig-mus'));
    else if (lv === 't2') t2.push(path(pa, pb, far ? 'fig-t2 is-far' : 'fig-t2'));
    else {
      t1.push(path(pa, pb, far ? 'fig-t1 is-far' : 'fig-t1', far ? undefined : 'target'));
      if (labelable && !ctx.anchors.has(d.m)) ctx.anchors.set(d.m, [centroid(pa), centroid(pb)]);
    }
  }
  return [...out, ...base, ...t2, ...t1];
}

function sidePrims(ill: Extract<Illustration, { view?: 'side' }>, ctx: Ctx): Prim[] {
  const A = solvePose(ill.poses[0]);
  const B = solvePose(ill.poses[1]);
  const { back, front } = propPrims(ill.props ?? [], A, B);
  const prims: Prim[] = [...back];
  const both = (fn: (j: Joints) => Frame): [Frame, Frame] => [fn(A), fn(B)];

  const foot = (j: Joints, s: 'N' | 'F') => {
    const ankle = j[`ankle${s}`];
    const toe = j[`toe${s}`];
    const d: P = [(toe[0] - ankle[0]) / LEN.foot, (toe[1] - ankle[1]) / LEN.foot];
    return frameOf([ankle[0] - d[0] * 3.6, ankle[1] - d[1] * 3.6], [toe[0] + d[0] * 1.5, toe[1] + d[1] * 1.5], 'limb');
  };
  const hand = (j: Joints, s: 'N' | 'F') => {
    const e = j[`elbow${s}`];
    const h = j[`hand${s}`];
    const L = Math.hypot(h[0] - e[0], h[1] - e[1]) || 1;
    const d: P = [(h[0] - e[0]) / L, (h[1] - e[1]) / L];
    return frameOf([h[0] - d[0] * 3.5, h[1] - d[1] * 3.5], [h[0] + d[0] * 6.5, h[1] + d[1] * 6.5], 'limb');
  };

  const leg = (s: 'N' | 'F', far: boolean) => {
    const out: Prim[] = [];
    const [fa, fb] = both((j) => foot(j, s));
    out.push(path(outline(fa, SHAPES.foot), outline(fb, SHAPES.foot), far ? 'fig-skin-far' : 'fig-skin', far ? undefined : 'skin'));
    const [sa, sb] = both((j) => frameOf(j[`knee${s}`], j[`ankle${s}`], 'limb'));
    out.push(...part(ctx, sa, sb, SHAPES.shin, SIDE_MUSCLES.shin, far, !far));
    const [ta, tb] = both((j) => frameOf(j.hip, j[`knee${s}`], 'limb'));
    out.push(...part(ctx, ta, tb, SHAPES.thigh, SIDE_MUSCLES.thigh, far, !far));
    return out;
  };
  const arm = (s: 'N' | 'F', far: boolean) => {
    const out: Prim[] = [];
    const [ha, hb] = both((j) => hand(j, s));
    out.push(path(outline(ha, SHAPES.hand), outline(hb, SHAPES.hand), far ? 'fig-skin-far' : 'fig-skin', far ? undefined : 'skin'));
    const [fa, fb] = both((j) => frameOf(j[`elbow${s}`], j[`hand${s}`], 'limb'));
    out.push(...part(ctx, fa, fb, SHAPES.forearm, SIDE_MUSCLES.forearm, far, !far));
    const [ua, ub] = both((j) => frameOf(j.shoulder, j[`elbow${s}`], 'limb'));
    out.push(...part(ctx, ua, ub, SHAPES.upperArm, SIDE_MUSCLES.upperArm, far, !far));
    return out;
  };

  prims.push(...arm('F', true));
  prims.push(...leg('F', true));
  prims.push(...leg('N', false));

  const [ta, tb] = both((j) => frameOf(j.hip, j.shoulder, 'trunk'));
  prims.push(...part(ctx, ta, tb, SHAPES.torso, SIDE_MUSCLES.torso, false, true));

  const [na, nb] = both((j) => frameOf(j.shoulder, j.head, 'trunk'));
  prims.push(path(outline(na, SHAPES.neck), outline(nb, SHAPES.neck), 'fig-skin', 'skin'));
  const head = (j: Joints, f: Frame) => headShapes(j.head, f.u, f.n);
  const ha = head(A, na);
  const hb = head(B, nb);
  prims.push(path(ha.head, hb.head, 'fig-skin', 'skin'));
  prims.push(path(ha.ear, hb.ear, 'fig-ear'));
  prims.push(path(ha.hair, hb.hair, 'fig-hair'));

  prims.push(...front);
  prims.push(...arm('N', false));
  return prims;
}

const FRONT_LIMB_MUSCLES = (side: 'L' | 'R') => {
  const medial = side === 'R' ? 'p' : 'a';
  const lateral = side === 'R' ? 'a' : 'p';
  return {
    thigh: [
      { m: 'forlår', side: 'm', t0: 0.05, t1: 0.95, inner: 0.72, outer: 0.72, base: true },
      { m: 'adduktorer', side: medial, t0: 0.03, t1: 0.55, inner: 0.35, outer: 0.95 },
      { m: 'hofteabduktorer', side: lateral, t0: -0.08, t1: 0.25, inner: 0.35, outer: 0.95 },
    ],
    shin: [{ m: 'lægge', side: 'm', t0: 0.05, t1: 0.62, inner: 0.9, outer: 0.9 }],
    upperArm: [
      { m: 'biceps', side: 'm', t0: 0.32, t1: 0.92, inner: 0.62, outer: 0.62, base: true },
      { m: 'triceps', side: lateral, t0: 0.18, t1: 0.9, inner: 0.3, outer: 0.95 },
      { m: 'side-skulder', side: 'm', t0: -0.18, t1: 0.34, inner: 0.85, outer: 0.85, base: true },
      { m: 'forreste-skulder', side: medial, t0: -0.18, t1: 0.32, inner: 0.1, outer: 0.95 },
    ],
    forearm: [{ m: 'underarme', side: 'm', t0: 0.02, t1: 0.76, inner: 0.8, outer: 0.8, base: true }],
  } as Record<'thigh' | 'shin' | 'upperArm' | 'forearm', MuscleDef[]>;
};

function frontPrims(ill: Extract<Illustration, { view: 'front' }>, ctx: Ctx): Prim[] {
  const A = solveFront(ill.poses[0]);
  const B = solveFront(ill.poses[1]);
  const { back, front } = propPrims(ill.props ?? [], A as unknown as AnyJoints, B as unknown as AnyJoints);
  const prims: Prim[] = [...back];
  const both = (fn: (j: FrontJoints) => Frame): [Frame, Frame] => [fn(A), fn(B)];

  // Body frame: from the middle of the shoulders down to the middle of the hips.
  const body = (j: FrontJoints) =>
    frameOf(
      [(j.shL[0] + j.shR[0]) / 2, (j.shL[1] + j.shR[1]) / 2],
      [(j.hipL[0] + j.hipR[0]) / 2, (j.hipL[1] + j.hipR[1]) / 2],
      'limb',
    );
  const [ba, bb] = both(body);
  // In this frame `n` points to screen right when upright.
  const torsoPts = (f: Frame) => TORSO_FRONT.flatMap(([u, t]) => [f.o[0] + f.u[0] * f.L * t + f.n[0] * u, f.o[1] + f.u[1] * f.L * t + f.n[1] * u]);

  for (const side of ['L', 'R'] as const) {
    const defs = FRONT_LIMB_MUSCLES(side);
    const sign = side === 'L' ? -1 : 1;
    const [fa, fb] = both((j) => {
      const an = j[`ankle${side}`];
      const f = body(j);
      return frameOf([an[0] - f.n[0] * sign * 1.5, an[1] - f.n[1] * sign * 1.5], [an[0] + f.n[0] * sign * 8 + f.u[0] * 2, an[1] + f.n[1] * sign * 8 + f.u[1] * 2], 'limb');
    });
    prims.push(path(outline(fa, SHAPES.foot), outline(fb, SHAPES.foot), 'fig-skin', 'skin'));
    const [sa, sb] = both((j) => frameOf(j[`knee${side}`], j[`ankle${side}`], 'limb'));
    prims.push(...part(ctx, sa, sb, FRONT_SHAPES.shin, defs.shin, false, side === 'R'));
    const [ta, tb] = both((j) => frameOf(j[`hip${side}`], j[`knee${side}`], 'limb'));
    prims.push(...part(ctx, ta, tb, FRONT_SHAPES.thigh, defs.thigh, false, side === 'R'));
  }

  prims.push(path(torsoPts(ba), torsoPts(bb), 'fig-skin', 'skin'));
  const tBase: Prim[] = [];
  const tT2: Prim[] = [];
  const tT1: Prim[] = [];
  for (const [m, u, t, rw, rt, isBase] of FRONT_TORSO_MUSCLES) {
    const lv = level(ctx, m);
    if (!lv && !isBase) continue;
    const mk = (f: Frame) => ellipseIn(f, t, u, rt * f.L, rw);
    const pa = mk(ba);
    const pb = mk(bb);
    if (!lv) tBase.push(path(pa, pb, 'fig-mus'));
    else if (lv === 't2') tT2.push(path(pa, pb, 'fig-t2'));
    else {
      tT1.push(path(pa, pb, 'fig-t1', 'target'));
      if (u >= 0 && !ctx.anchors.has(m)) ctx.anchors.set(m, [centroid(pa), centroid(pb)]);
    }
  }
  prims.push(...tBase, ...tT2, ...tT1);

  // Neck and head.
  const neck = (j: FrontJoints) => {
    const f = body(j);
    return frameOf([f.o[0] + f.u[0] * 2, f.o[1] + f.u[1] * 2], j.head, 'limb');
  };
  const [na, nb] = both(neck);
  const neckShape: Shape = { t0: -0.05, t1: 0.7, ant: [[0, 5.2], [0.4, 4.2], [0.65, 4.2]], post: [[0, 5.2], [0.4, 4.2], [0.65, 4.2]] };
  prims.push(path(outline(na, neckShape), outline(nb, neckShape), 'fig-skin', 'skin'));
  const headFront = (j: FrontJoints, f: Frame) => {
    const up: P = [-f.u[0], -f.u[1]];
    const across = f.n;
    const pt = (x: number, y: number): number[] => [j.head[0] + across[0] * x + up[0] * y, j.head[1] + across[1] * x + up[1] * y];
    const head: number[] = [];
    const hair: number[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (2 * Math.PI * i) / 14;
      head.push(...pt(Math.sin(a) * 7.6 * (Math.cos(a) < 0 ? 0.86 : 1), Math.cos(a) * 9.6));
    }
    for (let i = 0; i <= 8; i++) {
      const a = -Math.PI / 2 - 0.25 + ((Math.PI + 0.5) * i) / 8;
      hair.push(...pt(Math.cos(a) * 8, -Math.sin(a) * 10.2 + 0.5));
    }
    for (let i = 8; i >= 0; i--) {
      const a = -Math.PI / 2 - 0.25 + ((Math.PI + 0.5) * i) / 8;
      hair.push(...pt(Math.cos(a) * 7.2, -Math.sin(a) * 6.8 + 2.6));
    }
    const ears = [-1, 1].map((s) => ellipseFlat(pt(s * 7.8, 0.4), 1.4, 2.4));
    return { head, hair, ears };
  };
  const hfa = headFront(A, na);
  const hfb = headFront(B, nb);
  hfa.ears.forEach((e, i) => prims.push(path(e, hfb.ears[i], 'fig-skin', 'skin')));
  prims.push(path(hfa.head, hfb.head, 'fig-skin', 'skin'));
  prims.push(path(hfa.hair, hfb.hair, 'fig-hair'));

  prims.push(...front);

  for (const side of ['L', 'R'] as const) {
    const defs = FRONT_LIMB_MUSCLES(side);
    const [ha, hb] = both((j) => {
      const e = j[`elbow${side}`];
      const h = j[`hand${side}`];
      const L = Math.hypot(h[0] - e[0], h[1] - e[1]) || 1;
      const d: P = [(h[0] - e[0]) / L, (h[1] - e[1]) / L];
      return frameOf([h[0] - d[0] * 3.5, h[1] - d[1] * 3.5], [h[0] + d[0] * 6.5, h[1] + d[1] * 6.5], 'limb');
    });
    prims.push(path(outline(ha, FRONT_SHAPES.hand), outline(hb, FRONT_SHAPES.hand), 'fig-skin', 'skin'));
    const [fa, fb] = both((j) => frameOf(j[`elbow${side}`], j[`hand${side}`], 'limb'));
    prims.push(...part(ctx, fa, fb, FRONT_SHAPES.forearm, defs.forearm, false, side === 'R'));
    const [ua, ub] = both((j) => frameOf(j[`sh${side}`], j[`elbow${side}`], 'limb'));
    prims.push(...part(ctx, ua, ub, FRONT_SHAPES.upperArm, defs.upperArm, false, side === 'R'));
  }
  return prims;
}

function ellipseFlat(c: number[], rx: number, ry: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (2 * Math.PI * i) / 8;
    out.push(c[0] + Math.cos(a) * rx, c[1] + Math.sin(a) * ry);
  }
  return out;
}

/** Legacy fallback: map highlighted segments to muscles. */
const SEGMENT_MUSCLES: Record<Segment, Muscle[]> = {
  torso: ['bryst', 'mave'],
  upperArm: ['side-skulder', 'biceps'],
  forearm: ['underarme'],
  thigh: ['forlår'],
  shin: ['lægge'],
};

/* ------------------------------------------------------------------ */
/* Shadow                                                              */
/* ------------------------------------------------------------------ */

function shadowOf(pts: P[]): Nums {
  const low = pts.filter((p) => p[1] > 126);
  const use = low.length ? low : pts;
  const xs = use.map((p) => p[0]);
  const min = Math.min(...xs);
  const max = Math.max(...xs);
  return [(min + max) / 2, 153.5, Math.max(14, (max - min) / 2 + 10)];
}

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

const fmt = (n: number) => Math.round(n * 10) / 10;

/** Closed Catmull-Rom spline through the points, as cubic Béziers. */
function smoothPath(nums: Nums): string {
  const n = nums.length / 2;
  const pt = (i: number): P => {
    const k = ((i % n) + n) % n;
    return [nums[k * 2], nums[k * 2 + 1]];
  };
  let d = `M${fmt(pt(0)[0])} ${fmt(pt(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pt(i - 1);
    const p1 = pt(i);
    const p2 = pt(i + 1);
    const p3 = pt(i + 2);
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${fmt(c1[0])} ${fmt(c1[1])} ${fmt(c2[0])} ${fmt(c2[1])} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return d + 'Z';
}

function attrValues(p: Prim, nums: Nums): Record<string, string | number> {
  switch (p.tag) {
    case 'path':
      return { d: smoothPath(nums) };
    case 'polygon':
      return { points: nums.map(fmt).join(' ') };
    case 'line':
      return { x1: fmt(nums[0]), y1: fmt(nums[1]), x2: fmt(nums[2]), y2: fmt(nums[3]) };
    case 'circle':
      return { cx: fmt(nums[0]), cy: fmt(nums[1]) };
    case 'ellipse':
      return { cx: fmt(nums[0]), cy: fmt(nums[1]), rx: fmt(nums[2]) };
  }
}

const SPLINE = '0.45 0 0.55 1';

function Anim({ va, vb, dur }: { va: Record<string, string | number>; vb: Record<string, string | number>; dur: number }) {
  return (
    <>
      {Object.keys(va)
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
        ))}
    </>
  );
}

function PrimEl({ p, animate, dur, thumb, gid }: { p: Prim; animate: boolean; dur: number; thumb: 0 | 1; gid: string }) {
  const attrs = attrValues(p, thumb === 0 ? p.a : p.b);
  const style = p.w != null ? { strokeWidth: p.w } : undefined;
  const fill = p.grad ? `url(#${gid}-${p.grad})` : undefined;
  const anim = animate ? <Anim va={attrValues(p, p.a)} vb={attrValues(p, p.b)} dur={dur} /> : null;
  const common = { className: p.cls, style, fill };
  switch (p.tag) {
    case 'path':
      return <path {...common} {...attrs}>{anim}</path>;
    case 'polygon':
      return <polygon {...common} {...attrs}>{anim}</polygon>;
    case 'circle':
      return <circle {...common} r={p.r} {...attrs}>{anim}</circle>;
    case 'ellipse':
      return <ellipse {...common} ry={p.ry} {...attrs}>{anim}</ellipse>;
    default:
      return <line {...common} {...attrs}>{anim}</line>;
  }
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

interface Label {
  text: string;
  x: number;
  y: number;
  side: 'l' | 'r';
  a: P;
  b: P;
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Bounding box of everything drawn, over both poses. */
function boundsOf(prims: Prim[]): Box {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const add = (x: number, y: number, r = 0) => {
    box.x0 = Math.min(box.x0, x - r);
    box.x1 = Math.max(box.x1, x + r);
    box.y0 = Math.min(box.y0, y - r);
    box.y1 = Math.max(box.y1, y + r);
  };
  for (const p of prims) {
    for (const nums of [p.a, p.b]) {
      if (p.tag === 'circle') add(nums[0], nums[1], p.r ?? 0);
      else for (let i = 0; i + 1 < nums.length; i += 2) add(nums[i], nums[i + 1], p.tag === 'line' ? (p.w ?? 0) / 2 : 0);
    }
  }
  return box;
}

/** Fit a box to the target aspect ratio (width / height), keeping the floor at the bottom. */
function fitBox(b: Box, aspect: number, pad: number, floor: boolean): Box {
  let { x0, y0, x1, y1 } = b;
  x0 -= pad;
  x1 += pad;
  y0 -= pad;
  y1 = floor ? Math.max(y1 + 3, 158) : y1 + pad;
  const w = x1 - x0;
  const h = y1 - y0;
  if (w / h < aspect) {
    const extra = h * aspect - w;
    x0 -= extra / 2;
    x1 += extra / 2;
  } else {
    y0 -= w / aspect - h;
  }
  return { x0, y0, x1, y1 };
}

function layoutLabels(anchors: Map<Muscle, [P, P]>, thumb: 0 | 1, cx: number, box: Box): Label[] {
  const items = [...anchors.entries()].map(([m, [a, b]]) => {
    const p = thumb === 0 ? a : b;
    return { m, a, b, p, side: (p[0] <= cx ? 'l' : 'r') as 'l' | 'r' };
  });
  const out: Label[] = [];
  for (const side of ['l', 'r'] as const) {
    const col = items.filter((i) => i.side === side).sort((x, y) => x.p[1] - y.p[1]);
    let last = -Infinity;
    for (const i of col) {
      const y = Math.max(i.p[1], last + 15);
      last = y;
      out.push({ text: MUSCLE_SHORT[i.m], x: side === 'l' ? box.x0 - 8 : box.x1 + 8, y, side, a: i.a, b: i.b });
    }
  }
  // Keep labels inside the canvas vertically.
  const overflow = Math.max(0, ...out.map((l) => l.y - (box.y1 - 8)));
  return out.map((l) => ({ ...l, y: l.y - overflow }));
}

export function ExerciseFigure({
  illustration,
  muscles,
  animate = false,
  labels = false,
  className,
  title,
}: {
  illustration: Illustration;
  muscles?: TargetMuscles;
  animate?: boolean;
  /** Name the trained muscles next to the figure (for large views). */
  labels?: boolean;
  className?: string;
  title?: string;
}) {
  const gid = 'fm' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const { prims, anchors, shadow, cx, bounds } = useMemo(() => {
    const target: TargetMuscles = muscles ?? {
      primary: [...new Set((illustration.highlight ?? []).flatMap((s) => SEGMENT_MUSCLES[s]))],
      secondary: [],
    };
    const ctx: Ctx = { muscles: target, anchors: new Map() };
    let pointsA: P[];
    let pointsB: P[];
    let prims: Prim[];
    if (illustration.view === 'front') {
      prims = frontPrims(illustration, ctx);
      pointsA = Object.values(solveFront(illustration.poses[0]));
      pointsB = Object.values(solveFront(illustration.poses[1]));
    } else {
      prims = sidePrims(illustration, ctx);
      pointsA = Object.values(solvePose(illustration.poses[0]));
      pointsB = Object.values(solvePose(illustration.poses[1]));
    }
    const shadow = illustration.noFloor ? null : { a: shadowOf(pointsA), b: shadowOf(pointsB) };
    const xs = pointsA.map((p) => p[0]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const bounds = boundsOf(prims);
    return { prims, anchors: ctx.anchors, shadow, cx, bounds };
  }, [illustration, muscles]);

  const doAnimate = animate && !prefersReducedMotion();
  const thumb = doAnimate ? 0 : (illustration.thumb ?? 0);
  const dur = illustration.duration ?? 3.2;
  const floor = !illustration.noFloor;
  // Thumbnails zoom in on the figure; labelled views leave room for the names on both sides.
  const inner = fitBox(bounds, labels ? 0.95 : 1.1, labels ? 6 : 8, floor);
  const labelList = labels ? layoutLabels(anchors, illustration.thumb ?? 0, cx, inner) : [];
  // Reserve only as much room beside the figure as the label texts need.
  const colWidth = (side: 'l' | 'r') => {
    const texts = labelList.filter((l) => l.side === side).map((l) => l.text.length);
    return texts.length ? Math.max(...texts) * 4.4 + 16 : 0;
  };
  const box = labels
    ? fitBox({ ...inner, x0: inner.x0 - colWidth('l'), x1: inner.x1 + colWidth('r') }, 1.25, 0, floor)
    : inner;
  const viewBox = [box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0].map(fmt).join(' ');

  return (
    <svg
      // Remount when toggling animation so the SMIL timeline restarts from pose A.
      key={doAnimate ? 'anim' : 'still'}
      className={`exercise-figure ${labels ? 'has-labels' : ''} ${className ?? ''}`}
      viewBox={viewBox}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={`${gid}-skin`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="fig-skin-hi" />
          <stop offset="1" className="fig-skin-lo" />
        </linearGradient>
        <linearGradient id={`${gid}-target`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="fig-target-hi" />
          <stop offset="1" className="fig-target-lo" />
        </linearGradient>
      </defs>
      {floor && <line className="fig-floor" x1={fmt(box.x0)} y1={153.5} x2={fmt(box.x1)} y2={153.5} />}
      {shadow && (
        <ellipse className="fig-shadow" ry={3.4} {...attrValues({ tag: 'ellipse', cls: '', a: [], b: [] }, thumb === 0 ? shadow.a : shadow.b)}>
          {doAnimate && (
            <Anim
              va={attrValues({ tag: 'ellipse', cls: '', a: [], b: [] }, shadow.a)}
              vb={attrValues({ tag: 'ellipse', cls: '', a: [], b: [] }, shadow.b)}
              dur={dur}
            />
          )}
        </ellipse>
      )}
      {prims.map((p, i) => (
        <PrimEl key={i} p={p} animate={doAnimate} dur={dur} thumb={thumb} gid={gid} />
      ))}
      {labelList.map((l) => {
        const lx = l.side === 'l' ? l.x + 4 : l.x - 4;
        const pa = l.a;
        const pb = l.b;
        const p = thumb === 0 ? pa : pb;
        return (
          <g key={l.text} className="fig-label">
            <line className="fig-leader" x1={lx} y1={l.y} x2={fmt(p[0])} y2={fmt(p[1])}>
              {doAnimate && <Anim va={{ x2: fmt(pa[0]), y2: fmt(pa[1]) }} vb={{ x2: fmt(pb[0]), y2: fmt(pb[1]) }} dur={dur} />}
            </line>
            <circle className="fig-anchor" r={2.2} cx={fmt(p[0])} cy={fmt(p[1])}>
              {doAnimate && <Anim va={{ cx: fmt(pa[0]), cy: fmt(pa[1]) }} vb={{ cx: fmt(pb[0]), cy: fmt(pb[1]) }} dur={dur} />}
            </circle>
            <text x={l.x} y={l.y + 3} textAnchor={l.side === 'l' ? 'end' : 'start'}>
              {l.text}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
