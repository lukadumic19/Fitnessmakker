/**
 * Anatomical body shapes for the exercise figures.
 *
 * Every body part is described in its own frame: `t` runs along the bone
 * (0 = proximal joint, 1 = distal joint) and `w` is the distance from the
 * bone, positive towards the anterior (front) side. The same description is
 * evaluated for both poses, so every shape keeps the same number of points
 * and can be morphed with SVG animation.
 */
import type { Muscle } from '../data/muscles';
import type { P } from './figure';

export interface Frame {
  o: P;
  u: P;
  n: P;
  L: number;
}

/** Frame for a bone from a to b. `anterior` picks which normal is the front. */
export function frameOf(a: P, b: P, anterior: 'limb' | 'trunk'): Frame {
  const d: P = [b[0] - a[0], b[1] - a[1]];
  const L = Math.hypot(d[0], d[1]) || 1;
  const u: P = [d[0] / L, d[1] / L];
  // Limbs hanging down (u = +y) face +x; the trunk pointing up (u = -y) faces +x.
  const n: P = anterior === 'limb' ? [u[1], -u[0]] : [-u[1], u[0]];
  return { o: a, u, n, L };
}

export const at = (f: Frame, t: number, w: number): P => [
  f.o[0] + f.u[0] * f.L * t + f.n[0] * w,
  f.o[1] + f.u[1] * f.L * t + f.n[1] * w,
];

/** Profile: [t, half width] pairs, sorted by t. */
export type Profile = [number, number][];

export interface Shape {
  t0: number;
  t1: number;
  ant: Profile;
  post: Profile;
}

export function widthAt(p: Profile, t: number) {
  if (t <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) {
    if (t <= p[i][0]) {
      const [t0, w0] = p[i - 1];
      const [t1, w1] = p[i];
      return w0 + ((w1 - w0) * (t - t0)) / (t1 - t0);
    }
  }
  return p[p.length - 1][1];
}

/** Closed outline of a body part (flat [x, y, ...]). */
export function outline(f: Frame, s: Shape): number[] {
  const pts: P[] = [at(f, s.t0, 0)];
  for (const [t, w] of s.ant) pts.push(at(f, t, w));
  pts.push(at(f, s.t1, 0));
  for (const [t, w] of [...s.post].reverse()) pts.push(at(f, t, -w));
  return pts.flat();
}

/**
 * A muscle belly: a lens hugging one side of a body part.
 * side 'a' / 'p' = anterior / posterior; 'm' spans both sides.
 * inner / outer are fractions of the local half width.
 */
export function lens(
  f: Frame,
  s: Shape,
  side: 'a' | 'p' | 'm',
  t0: number,
  t1: number,
  inner: number,
  outer: number,
  k = 9,
): number[] {
  const top: P[] = [];
  const bottom: P[] = [];
  for (let i = 0; i <= k; i++) {
    const t = t0 + ((t1 - t0) * i) / k;
    const e = Math.pow(Math.sin((Math.PI * i) / k), 0.7);
    const wa = widthAt(s.ant, t);
    const wp = widthAt(s.post, t);
    let lo: number;
    let hi: number;
    if (side === 'a') {
      lo = inner >= 0 ? inner * wa : inner * wp;
      hi = outer * wa;
    } else if (side === 'p') {
      lo = -outer * wp;
      hi = inner >= 0 ? -inner * wp : -inner * wa;
    } else {
      lo = -inner * wp;
      hi = outer * wa;
    }
    const mid = (lo + hi) / 2;
    const half = ((hi - lo) / 2) * e;
    top.push(at(f, t, mid + half));
    if (i > 0 && i < k) bottom.push(at(f, t, mid - half));
  }
  return [...top, ...bottom.reverse()].flat();
}

/** Ellipse sampled as points in a frame (for pecs, abs etc. in the front view). */
export function ellipseIn(f: Frame, t: number, w: number, rt: number, rw: number, k = 12): number[] {
  const pts: number[] = [];
  for (let i = 0; i < k; i++) {
    const a = (2 * Math.PI * i) / k;
    pts.push(...at(f, t + (Math.cos(a) * rt) / f.L, w + Math.sin(a) * rw));
  }
  return pts;
}

/* ------------------------------------------------------------------ */
/* Side-view body parts                                                */
/* ------------------------------------------------------------------ */

export const SHAPES = {
  torso: {
    t0: -0.19,
    t1: 1.13,
    ant: [
      [-0.14, 4.6],
      [-0.03, 7.2],
      [0.12, 7.5],
      [0.3, 6.7],
      [0.5, 7.0],
      [0.66, 8.6],
      [0.8, 10.0],
      [0.92, 9.3],
      [1.02, 6.8],
      [1.1, 3.8],
    ],
    post: [
      [-0.16, 4.2],
      [-0.08, 8.4],
      [0.04, 9.8],
      [0.16, 8.8],
      [0.3, 6.3],
      [0.46, 6.9],
      [0.64, 8.3],
      [0.8, 8.9],
      [0.95, 8.4],
      [1.05, 6.2],
      [1.12, 3.6],
    ],
  },
  neck: { t0: -0.2, t1: 0.62, ant: [[-0.05, 4.0], [0.3, 3.3], [0.55, 3.3]], post: [[-0.05, 5.2], [0.3, 3.9], [0.55, 3.6]] },
  thigh: {
    t0: -0.13,
    t1: 1.1,
    ant: [[-0.04, 6.0], [0.12, 7.2], [0.4, 7.5], [0.7, 6.5], [0.9, 5.0], [1.02, 4.4]],
    post: [[-0.04, 6.8], [0.2, 6.7], [0.5, 6.1], [0.8, 4.9], [1.02, 4.2]],
  },
  shin: {
    t0: -0.09,
    t1: 1.05,
    ant: [[0, 4.4], [0.15, 4.1], [0.5, 3.4], [0.85, 2.8], [1, 2.7]],
    post: [[0, 4.0], [0.18, 5.6], [0.35, 5.9], [0.6, 4.0], [0.85, 2.9], [1, 2.8]],
  },
  upperArm: {
    t0: -0.2,
    t1: 1.1,
    ant: [[-0.1, 5.7], [0.12, 5.5], [0.4, 4.6], [0.62, 5.0], [0.88, 3.8], [1.02, 3.4]],
    post: [[-0.1, 6.1], [0.15, 5.7], [0.35, 5.5], [0.65, 4.4], [0.9, 3.6], [1.02, 3.3]],
  },
  forearm: {
    t0: -0.09,
    t1: 1.05,
    ant: [[0, 3.6], [0.2, 4.1], [0.5, 3.4], [0.85, 2.6], [1, 2.4]],
    post: [[0, 3.4], [0.2, 3.9], [0.5, 3.2], [0.85, 2.5], [1, 2.3]],
  },
  hand: { t0: -0.05, t1: 1.05, ant: [[0.1, 2.5], [0.5, 2.9], [0.85, 2.3]], post: [[0.1, 2.3], [0.5, 2.6], [0.85, 2.0]] },
  foot: {
    t0: -0.04,
    t1: 1.04,
    ant: [[0.02, 3.2], [0.22, 4.4], [0.5, 3.2], [0.82, 2.0], [1, 1.4]],
    post: [[0.02, 2.6], [0.3, 1.9], [0.7, 1.9], [1, 1.3]],
  },
} satisfies Record<string, Shape>;

export type PartName = 'torso' | 'thigh' | 'shin' | 'upperArm' | 'forearm';

export interface MuscleDef {
  m: Muscle;
  side: 'a' | 'p' | 'm';
  t0: number;
  t1: number;
  inner: number;
  outer: number;
  /** Drawn as faint anatomy even when not trained. */
  base?: boolean;
}

export const SIDE_MUSCLES: Record<PartName, MuscleDef[]> = {
  torso: [
    { m: 'baller', side: 'p', t0: -0.16, t1: 0.22, inner: -0.05, outer: 0.97, base: true },
    { m: 'hofteabduktorer', side: 'm', t0: -0.07, t1: 0.16, inner: 0.35, outer: 0.3 },
    { m: 'lænd', side: 'p', t0: 0.14, t1: 0.48, inner: 0.4, outer: 0.95 },
    { m: 'skrå-mave', side: 'm', t0: 0.14, t1: 0.64, inner: 0.05, outer: 0.5, base: true },
    { m: 'mave', side: 'a', t0: 0.08, t1: 0.66, inner: 0.5, outer: 0.96, base: true },
    { m: 'lats', side: 'p', t0: 0.4, t1: 0.92, inner: 0.1, outer: 0.95, base: true },
    { m: 'midterryg', side: 'p', t0: 0.7, t1: 1.0, inner: 0.5, outer: 0.97 },
    { m: 'trapez', side: 'p', t0: 0.9, t1: 1.13, inner: 0.15, outer: 0.98 },
    { m: 'bryst', side: 'a', t0: 0.64, t1: 1.0, inner: 0.12, outer: 0.97, base: true },
  ],
  thigh: [
    { m: 'adduktorer', side: 'm', t0: 0.02, t1: 0.52, inner: 0.25, outer: 0.25 },
    { m: 'baglår', side: 'p', t0: 0.1, t1: 0.94, inner: 0.02, outer: 0.93, base: true },
    { m: 'forlår', side: 'a', t0: 0.05, t1: 0.96, inner: -0.08, outer: 0.93, base: true },
  ],
  shin: [{ m: 'lægge', side: 'p', t0: 0.05, t1: 0.74, inner: 0.05, outer: 0.95, base: true }],
  upperArm: [
    { m: 'triceps', side: 'p', t0: 0.1, t1: 0.93, inner: 0.02, outer: 0.95, base: true },
    { m: 'biceps', side: 'a', t0: 0.3, t1: 0.93, inner: 0.02, outer: 0.93, base: true },
    { m: 'side-skulder', side: 'm', t0: -0.18, t1: 0.34, inner: 0.6, outer: 0.6, base: true },
    { m: 'forreste-skulder', side: 'a', t0: -0.18, t1: 0.34, inner: 0.05, outer: 0.97 },
    { m: 'bagerste-skulder', side: 'p', t0: -0.18, t1: 0.34, inner: 0.05, outer: 0.97 },
  ],
  forearm: [{ m: 'underarme', side: 'm', t0: 0.02, t1: 0.76, inner: 0.8, outer: 0.8, base: true }],
};

/** Head profile around the head centre: [forward, up] in units of the head radius (≈9). */
const HEAD: P[] = [
  [-3.4, -8.6],
  [-7.6, -3.8],
  [-8.6, 1.4],
  [-6.6, 6.8],
  [-1.6, 9.4],
  [4.0, 8.4],
  [7.2, 5.0],
  [8.0, 2.0],
  [7.7, 0.7],
  [9.6, -2.3],
  [8.1, -3.4],
  [8.4, -4.7],
  [7.7, -6.2],
  [7.5, -7.8],
  [5.2, -8.9],
  [2.4, -8.7],
];
const HAIR: P[] = [
  [-8.8, 1.2],
  [-7.0, 7.1],
  [-1.6, 10.1],
  [4.3, 9.0],
  [7.4, 5.4],
  [5.6, 5.9],
  [1.6, 7.0],
  [-3.2, 6.4],
  [-6.0, 3.0],
  [-6.6, -1.8],
];

/** Head, hair and ear for a head centre, facing `fwd` with `up` along the neck. */
export function headShapes(c: P, up: P, fwd: P) {
  const map = ([f, u]: P): number[] => [c[0] + fwd[0] * f + up[0] * u, c[1] + fwd[1] * f + up[1] * u];
  const ear: number[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (2 * Math.PI * i) / 8;
    ear.push(...map([-1.4 + Math.cos(a) * 1.5, -0.6 + Math.sin(a) * 2.5]));
  }
  return { head: HEAD.flatMap(map), hair: HAIR.flatMap(map), ear };
}

/* ------------------------------------------------------------------ */
/* Front-view body parts                                               */
/* ------------------------------------------------------------------ */

const sym = (s: Shape): Shape => {
  const w = s.ant.map(([t]) => [t, (widthAt(s.ant, t) + widthAt(s.post, t)) / 2] as [number, number]);
  return { t0: s.t0, t1: s.t1, ant: w, post: w };
};

export const FRONT_SHAPES = {
  thigh: { t0: -0.1, t1: 1.08, ant: [[0, 7.4], [0.25, 7.6], [0.6, 6.2], [0.95, 4.6]], post: [[0, 6.4], [0.3, 6.6], [0.6, 5.2], [0.95, 4.4]] },
  shin: { t0: -0.08, t1: 1.04, ant: [[0, 4.4], [0.3, 5.0], [0.7, 3.4], [1, 2.8]], post: [[0, 4.4], [0.3, 5.4], [0.7, 3.6], [1, 2.8]] },
  upperArm: sym(SHAPES.upperArm),
  forearm: sym(SHAPES.forearm),
  hand: sym(SHAPES.hand),
} satisfies Record<string, Shape>;

/** Torso outline in the front view: [across (u), down (t)] in the shoulder–hip frame. */
export const TORSO_FRONT: P[] = [
  [-6.5, -0.16],
  [-12, -0.06],
  [-16.5, 0.02],
  [-15.5, 0.3],
  [-12.2, 0.55],
  [-11.2, 0.76],
  [-12.8, 0.95],
  [-11.5, 1.1],
  [0, 1.16],
  [11.5, 1.1],
  [12.8, 0.95],
  [11.2, 0.76],
  [12.2, 0.55],
  [15.5, 0.3],
  [16.5, 0.02],
  [12, -0.06],
  [6.5, -0.16],
];

/** Front-view torso muscles: [muscle, centre across, centre down, half width, half height]. */
export const FRONT_TORSO_MUSCLES: [Muscle, number, number, number, number, boolean][] = [
  ['trapez', -8, -0.05, 4.5, 0.07, false],
  ['trapez', 8, -0.05, 4.5, 0.07, false],
  ['lats', -13.2, 0.4, 2.2, 0.16, false],
  ['lats', 13.2, 0.4, 2.2, 0.16, false],
  ['bryst', -7, 0.18, 7.2, 0.17, true],
  ['bryst', 7, 0.18, 7.2, 0.17, true],
  ['skrå-mave', -9.6, 0.68, 2.6, 0.24, true],
  ['skrå-mave', 9.6, 0.68, 2.6, 0.24, true],
  ['mave', 0, 0.66, 5.2, 0.3, true],
  ['hofteabduktorer', -11.8, 1.02, 2.2, 0.1, false],
  ['hofteabduktorer', 11.8, 1.02, 2.2, 0.1, false],
];
