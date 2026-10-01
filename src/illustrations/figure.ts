/**
 * Parametric stick-figure engine.
 *
 * Poses are authored in a 200-wide coordinate space with the floor at y = 150.
 * Angles are absolute and in degrees: 0 = straight down, 90 = forward (+x),
 * 180 = straight up, -90 = backward.
 */

export type P = [number, number];

export type Limb =
  | [number, number]
  | {
      /** Absolute target for the hand / ankle. Solved with two-bone IK. */
      to: P;
      /** Which side the elbow / knee bends to (clockwise = 1). */
      bend?: 1 | -1;
    };

export interface Pose {
  hip: P;
  torso: number;
  /** Extra head tilt relative to the torso direction. */
  head?: number;
  armN: Limb;
  armF?: Limb;
  legN: Limb;
  legF?: Limb;
  footN?: number;
  footF?: number;
  /** Translate the whole figure so the given joint lands at `at`. */
  anchor?: { joint: JointName; at: P };
  /** Override segment lengths, e.g. to lift the shoulders in a shrug. */
  torsoLen?: number;
  neckLen?: number;
}

export type JointName =
  | 'hip'
  | 'shoulder'
  | 'neck'
  | 'head'
  | 'elbowN'
  | 'handN'
  | 'elbowF'
  | 'handF'
  | 'kneeN'
  | 'ankleN'
  | 'toeN'
  | 'kneeF'
  | 'ankleF'
  | 'toeF'
  /** Upper back, just behind the shoulders – where a back-squat bar rests. */
  | 'back';

export type Joints = Record<JointName, P>;

export type Segment = 'torso' | 'upperArm' | 'forearm' | 'thigh' | 'shin';

export type Prop =
  /** Barbell seen end-on: a weight plate centred on a joint. */
  | { kind: 'plate'; at: string; r?: number; dx?: number; dy?: number }
  | { kind: 'dumbbell'; at: string; dx?: number; dy?: number; vertical?: boolean }
  | { kind: 'kettlebell'; at: string }
  /** Line from a fixed point to a joint (cable, chain). */
  | { kind: 'cable'; from: P; to: string }
  /** Short bar relative to a joint, e.g. a foot plate that moves with the feet. */
  | { kind: 'attached'; at: string; from: P; to: P; w?: number }
  | { kind: 'line'; from: P; to: P; w?: number }
  /** Front view: barbell through both hands with plates at the ends. */
  | { kind: 'barbellFront'; ext?: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; r?: number }
  | { kind: 'circle'; at: P; r: number; fill?: boolean };

export const LEN = {
  torso: 46,
  neck: 7,
  head: 9,
  upperArm: 26,
  forearm: 24,
  thigh: 36,
  shin: 34,
  foot: 11,
};

const rad = (d: number) => (d * Math.PI) / 180;
export const dir = (a: number): P => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const mul = (a: P, k: number): P => [a[0] * k, a[1] * k];
const len = (a: P) => Math.hypot(a[0], a[1]);

/** Resolve a limb to its middle joint (elbow/knee) and end joint (hand/ankle). */
function solveLimb(root: P, limb: Limb, l1: number, l2: number): [P, P] {
  if (Array.isArray(limb)) {
    const mid = add(root, mul(dir(limb[0]), l1));
    return [mid, add(mid, mul(dir(limb[1]), l2))];
  }
  const bend = limb.bend ?? 1;
  const d = sub(limb.to, root);
  let dist = len(d);
  if (dist < 1e-6) return [add(root, [0, l1]), root];
  const u = mul(d, 1 / dist);
  dist = Math.min(dist, l1 + l2 - 0.001);
  dist = Math.max(dist, Math.abs(l1 - l2) + 0.001);
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const perp: P = [u[1] * bend, -u[0] * bend];
  const mid = add(add(root, mul(u, a)), mul(perp, h));
  const end = add(root, mul(u, dist));
  return [mid, end];
}

const FAR_OFFSET: P = [-4, -2];

export function solvePose(pose: Pose): Joints {
  const hip = pose.hip;
  const shoulder = add(hip, mul(dir(pose.torso), pose.torsoLen ?? LEN.torso));
  const headDir = dir(pose.torso + (pose.head ?? 0));
  const neckLen = pose.neckLen ?? LEN.neck;
  const neck = add(shoulder, mul(headDir, neckLen));
  const head = add(shoulder, mul(headDir, neckLen + LEN.head));

  const [elbowN, handN] = solveLimb(shoulder, pose.armN, LEN.upperArm, LEN.forearm);
  const [kneeN, ankleN] = solveLimb(hip, pose.legN, LEN.thigh, LEN.shin);

  let elbowF: P, handF: P, kneeF: P, ankleF: P;
  if (pose.armF) {
    [elbowF, handF] = solveLimb(shoulder, pose.armF, LEN.upperArm, LEN.forearm);
  } else {
    elbowF = add(elbowN, FAR_OFFSET);
    handF = add(handN, FAR_OFFSET);
  }
  if (pose.legF) {
    [kneeF, ankleF] = solveLimb(hip, pose.legF, LEN.thigh, LEN.shin);
  } else {
    kneeF = add(kneeN, FAR_OFFSET);
    ankleF = add(ankleN, FAR_OFFSET);
  }
  const toeN = add(ankleN, mul(dir(pose.footN ?? 90), LEN.foot));
  const toeF = add(ankleF, mul(dir(pose.footF ?? pose.footN ?? 90), LEN.foot));

  const tu = dir(pose.torso);
  const back = add(add(shoulder, mul([tu[1], -tu[0]], 7)), mul(tu, -4));
  const joints: Joints = {
    back,
    hip,
    shoulder,
    neck,
    head,
    elbowN,
    handN,
    elbowF,
    handF,
    kneeN,
    ankleN,
    toeN,
    kneeF,
    ankleF,
    toeF,
  };

  if (pose.anchor) {
    const shift = sub(pose.anchor.at, joints[pose.anchor.joint]);
    for (const k of Object.keys(joints) as JointName[]) joints[k] = add(joints[k], shift);
    // Far limbs defined by the near-limb offset should keep that offset.
  }
  return joints;
}

/* ------------------------------------------------------------------ */
/* Front view                                                          */
/* ------------------------------------------------------------------ */

/**
 * Front-view pose: arm / leg angles are measured outward from the body
 * (0 = down, 90 = straight out to the side, 180 = up). The near limb is drawn
 * on the right, the far limb mirrored on the left.
 */
export interface FrontPose {
  hip: P;
  arms: [number, number];
  legs: [number, number];
  /** Left-side overrides (screen left). Angles here are NOT mirrored. */
  armsL?: Limb;
  legsL?: Limb;
  /** Right-side leg as an absolute target, e.g. for a side lunge. */
  legsR?: Limb;
  /** Rotate the whole figure (degrees, clockwise) around `pivot`. */
  tilt?: number;
  pivot?: P;
}

export const FRONT = { shoulderHalf: 15, hipHalf: 9 };

export interface FrontJoints {
  hipL: P;
  hipR: P;
  shL: P;
  shR: P;
  head: P;
  elbowL: P;
  handL: P;
  elbowR: P;
  handR: P;
  kneeL: P;
  ankleL: P;
  kneeR: P;
  ankleR: P;
}

const mirror = (a: number) => -a;

export function solveFront(pose: FrontPose): FrontJoints {
  const [hx, hy] = pose.hip;
  const top: P = [hx, hy - LEN.torso];
  const shR: P = [hx + FRONT.shoulderHalf, top[1]];
  const shL: P = [hx - FRONT.shoulderHalf, top[1]];
  const hipR: P = [hx + FRONT.hipHalf, hy];
  const hipL: P = [hx - FRONT.hipHalf, hy];
  const head: P = [hx, top[1] - LEN.neck - LEN.head];

  const [elbowR, handR] = solveLimb(shR, pose.arms, LEN.upperArm, LEN.forearm);
  const [elbowL, handL] = solveLimb(
    shL,
    pose.armsL ?? [mirror(pose.arms[0]), mirror(pose.arms[1])],
    LEN.upperArm,
    LEN.forearm,
  );
  const [kneeR, ankleR] = solveLimb(hipR, pose.legsR ?? pose.legs, LEN.thigh, LEN.shin);
  const [kneeL, ankleL] = solveLimb(
    hipL,
    pose.legsL ?? [mirror(pose.legs[0]), mirror(pose.legs[1])],
    LEN.thigh,
    LEN.shin,
  );
  const j: FrontJoints = { hipL, hipR, shL, shR, head, elbowL, handL, elbowR, handR, kneeL, ankleL, kneeR, ankleR };
  if (pose.tilt) {
    const c = pose.pivot ?? [(ankleL[0] + ankleR[0]) / 2, (ankleL[1] + ankleR[1]) / 2];
    const r = rad(pose.tilt);
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    for (const k of Object.keys(j) as (keyof FrontJoints)[]) {
      const [x, y] = sub(j[k], c);
      j[k] = [c[0] + x * cos - y * sin, c[1] + x * sin + y * cos];
    }
  }
  return j;
}
